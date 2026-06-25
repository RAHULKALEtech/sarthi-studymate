// Sarthi StudyMate - Tasks Module
import { db, showToast, synth } from './app.js';

// DOM Cache
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskEditIdInput = document.getElementById('task-edit-id');
const taskTitleInput = document.getElementById('task-title-input');
const taskCategoryInput = document.getElementById('task-category-input');
const taskPriorityInput = document.getElementById('task-priority-input');
const taskDueInput = document.getElementById('task-due-input');

const activeList = document.getElementById('active-tasks-list');
const completedList = document.getElementById('completed-tasks-list');
const activeCountEl = document.getElementById('active-tasks-count');
const completedCountEl = document.getElementById('completed-tasks-count');

const searchInput = document.getElementById('task-search');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const sortTasks = document.getElementById('sort-tasks');

let tasks = [];

export function initTasksModule() {
  tasks = db.get('tasks', []);

  // Form Submit
  taskForm.addEventListener('submit', handleFormSubmit);

  // Open Add Modal
  document.getElementById('add-task-btn').addEventListener('click', () => {
    openModal();
  });

  // Close Modal
  document.getElementById('task-modal-close').addEventListener('click', closeModal);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
  });

  // Filter Listeners
  searchInput.addEventListener('input', renderTasks);
  filterCategory.addEventListener('change', renderTasks);
  filterPriority.addEventListener('change', renderTasks);
  sortTasks.addEventListener('change', renderTasks);

  // Initialize display
  renderTasks();
  populateTaskSelectors();
}

function openModal(editId = null) {
  taskModal.classList.add('active');
  if (editId) {
    const task = tasks.find(t => t.id === editId);
    if (task) {
      document.getElementById('task-modal-title').textContent = "Edit Task";
      taskEditIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskCategoryInput.value = task.category;
      taskPriorityInput.value = task.priority;
      taskDueInput.value = task.dueDate;
    }
  } else {
    document.getElementById('task-modal-title').textContent = "Create Task";
    taskForm.reset();
    taskEditIdInput.value = '';
    // Set default due time to tomorrow at this time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    taskDueInput.value = tomorrow.toISOString().slice(0, 16);
  }
}

function closeModal() {
  taskModal.classList.remove('active');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = taskEditIdInput.value;
  const title = taskTitleInput.value.trim();
  const category = taskCategoryInput.value;
  const priority = taskPriorityInput.value;
  const dueDate = taskDueInput.value;

  if (!title) return;

  if (id) {
    // Edit Mode
    tasks = tasks.map(t => t.id === id ? { ...t, title, category, priority, dueDate } : t);
    showToast("Task updated!", "success");
  } else {
    // Add Mode
    const newTask = {
      id: 'task_' + Date.now(),
      title,
      category,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    showToast("Task added!", "success");
    synth.playChime();
  }

  saveTasks();
  closeModal();
  renderTasks();
}

function saveTasks() {
  db.set('tasks', tasks);
  populateTaskSelectors();
}

// Render loop with filter/sorting
function renderTasks() {
  const searchQuery = searchInput.value.toLowerCase();
  const catFilter = filterCategory.value;
  const priFilter = filterPriority.value;
  const sortBy = sortTasks.value;

  // Filter
  let filtered = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery);
    const matchesCat = catFilter === 'all' || task.category === catFilter;
    const matchesPri = priFilter === 'all' || task.priority === priFilter;
    return matchesSearch && matchesCat && matchesPri;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === 'priority') {
      const priMap = { High: 3, Medium: 2, Low: 1 };
      return priMap[b.priority] - priMap[a.priority];
    }
    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const active = filtered.filter(t => !t.completed);
  const completed = filtered.filter(t => t.completed);

  activeCountEl.textContent = active.length;
  completedCountEl.textContent = completed.length;

  const focusTaskId = db.get('focus_task_id', null);

  // Render lists
  activeList.innerHTML = active.length > 0 ? active.map(t => createTaskHTML(t, focusTaskId)).join('') : `<p class="empty-msg">No active tasks</p>`;
  completedList.innerHTML = completed.length > 0 ? completed.map(t => createTaskHTML(t, focusTaskId)).join('') : `<p class="empty-msg">No completed tasks yet</p>`;

  // Bind individual event handlers
  bindTaskEvents();
}

function createTaskHTML(task, focusTaskId) {
  const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
  const dateObj = new Date(task.dueDate);
  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isFocusTask = focusTaskId === task.id;

  return `
    <div class="task-card ${task.completed ? 'completed' : ''} cat-${task.category}" data-id="${task.id}">
      <div class="task-checkbox-container" onclick="toggleTaskCompletion('${task.id}')">
        <div class="task-checkbox">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
      </div>

      <div class="task-content">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">
          <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
          <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--glass-border);">${task.category}</span>
          <div class="task-due ${isOverdue ? 'overdue' : ''}">
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            <span>${isOverdue ? 'Overdue: ' : 'Due: '}${formattedDate}</span>
          </div>
        </div>
      </div>

      <div class="task-actions">
        ${!task.completed ? `
          <button class="task-btn focus-btn ${isFocusTask ? 'active-focus' : ''}" onclick="setFocusTask('${task.id}')" title="${isFocusTask ? 'Currently Focus Task' : 'Set as Pomodoro Focus'}">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </button>
          <button class="task-btn edit" onclick="editTaskClick('${task.id}')" title="Edit Task">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
        ` : ''}
        <button class="task-btn delete" onclick="deleteTaskClick('${task.id}')" title="Delete Task">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function bindTaskEvents() {
  // Bind global functions to window for onclick handlers
  window.toggleTaskCompletion = (id) => {
    tasks = tasks.map(t => {
      if (t.id === id) {
        const completed = !t.completed;
        if (completed) synth.playChime();
        return { ...t, completed };
      }
      return t;
    });
    saveTasks();
    renderTasks();
  };

  window.editTaskClick = (id) => {
    openModal(id);
  };

  window.deleteTaskClick = (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
      const isFocus = db.get('focus_task_id', null) === id;
      if (isFocus) db.set('focus_task_id', null);
      
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
      showToast("Task deleted", "info");
    }
  };

  window.setFocusTask = (id) => {
    const currentFocus = db.get('focus_task_id', null);
    if (currentFocus === id) {
      db.set('focus_task_id', null);
      showToast("Focus task cleared", "info");
    } else {
      db.set('focus_task_id', id);
      showToast("Task selected for Pomodoro focus!", "success");
    }
    renderTasks();
  };
}

// Populate Pomodoro dropdown selector
export function populateTaskSelectors() {
  const selector = document.getElementById('pomo-task-selector');
  if (!selector) return;
  
  const activeTasks = tasks.filter(t => !t.completed);
  const currentFocus = db.get('focus_task_id', null);

  let html = `<option value="none">Choose a task to work on...</option>`;
  html += activeTasks.map(t => `
    <option value="${t.id}" ${t.id === currentFocus ? 'selected' : ''}>${escapeHTML(t.title)} (${t.category})</option>
  `).join('');
  
  selector.innerHTML = html;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
