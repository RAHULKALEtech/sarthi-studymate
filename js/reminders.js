// Sarthi StudyMate - Reminders Module
import { db, showToast, synth } from './app.js';

// DOM Cache
const reminderModal = document.getElementById('reminder-modal');
const reminderForm = document.getElementById('reminder-form');
const remTitleInput = document.getElementById('rem-title-input');
const remTimeInput = document.getElementById('rem-time-input');
const remRepeatInput = document.getElementById('rem-repeat-input');

const mainList = document.getElementById('reminders-main-list');
const logsContainer = document.getElementById('reminders-logs-container');
const countEl = document.getElementById('reminders-count');

let reminders = [];
let logs = [];
let checkInterval = null;

export function initRemindersModule() {
  reminders = db.get('reminders', []);
  logs = db.get('reminder_logs', []);

  // Form Submit
  reminderForm.addEventListener('submit', handleFormSubmit);

  // Open modal
  document.getElementById('add-reminder-btn').addEventListener('click', openModal);

  // Close Modal
  document.getElementById('reminder-modal-close').addEventListener('click', closeModal);
  reminderModal.addEventListener('click', (e) => {
    if (e.target === reminderModal) closeModal();
  });

  // Render view
  renderReminders();
  renderLogs();

  // Start background monitoring (runs every second)
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkReminders, 1000);
}

function openModal() {
  reminderModal.classList.add('active');
  reminderForm.reset();
  
  // Default to 10 minutes from now
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10 - now.getTimezoneOffset());
  remTimeInput.value = now.toISOString().slice(0, 16);
}

function closeModal() {
  reminderModal.classList.remove('active');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const title = remTitleInput.value.trim();
  const time = remTimeInput.value;
  const repeat = remRepeatInput.value;

  if (!title || !time) return;

  const newReminder = {
    id: 'reminder_' + Date.now(),
    title,
    time,
    repeat,
    createdAt: new Date().toISOString()
  };

  reminders.push(newReminder);
  db.set('reminders', reminders);
  
  showToast("Reminder scheduled!", "success");
  synth.playChime();
  
  closeModal();
  renderReminders();
}

function renderReminders() {
  const activeReminders = reminders
    .filter(r => new Date(r.time) > new Date())
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  countEl.textContent = activeReminders.length;

  if (activeReminders.length > 0) {
    mainList.innerHTML = activeReminders.map(r => {
      const dateObj = new Date(r.time);
      const timeStr = dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="reminder-card" data-id="${r.id}">
          <div class="reminder-info">
            <div class="reminder-title">${escapeHTML(r.title)}</div>
            <div class="reminder-meta">
              <span class="reminder-time-badge">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7V7z"/></svg>
                <span>${timeStr}</span>
              </span>
              ${r.repeat !== 'none' ? `<span class="reminder-repeat-badge">${r.repeat}</span>` : ''}
            </div>
          </div>
          <button class="reminder-delete-btn" onclick="deleteReminderClick('${r.id}')" title="Cancel Reminder">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
    }).join('');
  } else {
    mainList.innerHTML = `<p class="empty-msg">No active reminders scheduled</p>`;
  }

  // Bind global delete
  window.deleteReminderClick = (id) => {
    if (confirm("Cancel this reminder?")) {
      reminders = reminders.filter(r => r.id !== id);
      db.set('reminders', reminders);
      renderReminders();
      showToast("Reminder canceled", "info");
    }
  };
}

function renderLogs() {
  if (logs.length > 0) {
    // Sort logs descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
    logsContainer.innerHTML = sortedLogs.map(l => {
      const timeStr = new Date(l.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="log-item">
          <div class="log-icon">
            <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 4.36 6 6.92 6 10v5l-2 2v1h16v-1l-2-2z"/></svg>
          </div>
          <div class="log-text">
            <div class="log-message">${escapeHTML(l.title)}</div>
            <div class="log-time">Triggered at ${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    logsContainer.innerHTML = `<p class="empty-msg">No recent notifications</p>`;
  }
}

// Background scheduler checker
function checkReminders() {
  const now = new Date();
  let updated = false;

  reminders.forEach(r => {
    const remTime = new Date(r.time);
    
    // Check if reminder is due
    if (remTime <= now) {
      triggerReminder(r);
      updated = true;

      // Handle Repetition
      if (r.repeat === 'daily') {
        const nextDay = new Date(remTime);
        nextDay.setDate(nextDay.getDate() + 1);
        r.time = nextDay.toISOString().slice(0, 16);
      } else if (r.repeat === 'weekly') {
        const nextWeek = new Date(remTime);
        nextWeek.setDate(nextWeek.getDate() + 7);
        r.time = nextWeek.toISOString().slice(0, 16);
      } else {
        // Mark for deletion by setting time to past and filtering in next block
        r.triggered = true;
      }
    }
  });

  if (updated) {
    // Keep non-triggered items or repeating items
    reminders = reminders.filter(r => !r.triggered);
    db.set('reminders', reminders);
    renderReminders();
    renderLogs();
  }
}

function triggerReminder(reminder) {
  // Play Web Audio Synth
  synth.playAlarm();

  // Create Big Toast Notification
  showToast(`⏰ REMINDER: ${reminder.title}`, "warning", 8000);

  // Add Log Entry
  const newLog = {
    id: 'log_' + Date.now(),
    title: reminder.title,
    triggeredAt: new Date().toISOString()
  };
  
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop(); // Cap history size
  
  db.set('reminder_logs', logs);
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
