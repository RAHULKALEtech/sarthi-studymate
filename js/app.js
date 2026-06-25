// Sarthi StudyMate - Core Application Controller

// Audio Synth Engine using Web Audio API
class AudioSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playChime() {
    this.init();
    const now = this.ctx.currentTime;
    
    // Play a lovely C major arpeggio
    this.playTone(523.25, now, 0.15);      // C5
    this.playTone(659.25, now + 0.12, 0.15); // E5
    this.playTone(783.99, now + 0.24, 0.15); // G5
    this.playTone(1046.50, now + 0.36, 0.3); // C6
  }

  playAlarm() {
    this.init();
    const now = this.ctx.currentTime;
    
    // Alarm sound: rhythmic double beeps
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.6;
      this.playTone(880.00, start, 0.12); // A5
      this.playTone(880.00, start + 0.18, 0.12); // A5
    }
  }

  playTone(freq, startTime, duration) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Smooth volume ramp
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }
}

export const synth = new AudioSynth();

// Theme Controller
class ThemeManager {
  constructor() {
    this.toggleBtn = document.getElementById('theme-toggle');
    this.darkIcon = this.toggleBtn.querySelector('.dark-icon');
    this.lightIcon = this.toggleBtn.querySelector('.light-icon');
    this.currentTheme = localStorage.getItem('sarthi_theme') || 'dark';
    
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.toggleBtn.addEventListener('click', () => this.toggleTheme());
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sarthi_theme', theme);
    this.currentTheme = theme;

    if (theme === 'light') {
      this.darkIcon.style.display = 'none';
      this.lightIcon.style.display = 'block';
    } else {
      this.darkIcon.style.display = 'block';
      this.lightIcon.style.display = 'none';
    }
  }

  toggleTheme() {
    synth.init(); // Initialize audio on user interaction
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    showToast("Theme changed successfully!", "info");
  }
}

// Router & Section Switcher
class Router {
  constructor() {
    this.navItems = document.querySelectorAll('.sidebar .nav-item');
    this.sections = document.querySelectorAll('.app-section');
    this.init();
  }

  init() {
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = item.getAttribute('data-target');
        this.navigateTo(targetSection);
      });
    });
  }

  navigateTo(sectionId) {
    // Update active nav link
    this.navItems.forEach(item => {
      if (item.getAttribute('data-target') === sectionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active section
    this.sections.forEach(sec => {
      if (sec.id === sectionId) {
        sec.classList.add('active');
        // Trigger a custom event when section shows (useful for refreshes)
        const event = new CustomEvent('sectionShown', { detail: { id: sectionId } });
        window.dispatchEvent(event);
      } else {
        sec.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Global Notification Toasts
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('fadeOut');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

// Global LocalStorage manager
export const db = {
  get(key, defaultValue = []) {
    const data = localStorage.getItem(`sarthi_studymate_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  },
  set(key, val) {
    localStorage.setItem(`sarthi_studymate_${key}`, JSON.stringify(val));
    // Trigger update stats dashboard event
    window.dispatchEvent(new Event('dbUpdated'));
  }
};

// Bootstrap App
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Core Services
  new ThemeManager();
  const router = new Router();

  // Dynamically import and initialize views
  const { initTasksModule } = await import('./tasks.js');
  const { initPomodoroModule } = await import('./pomodoro.js');
  const { initRemindersModule } = await import('./reminders.js');
  const { initQuizModule } = await import('./quiz.js');
  const { initFlashcardsModule } = await import('./flashcards.js');

  initTasksModule();
  initPomodoroModule();
  initRemindersModule();
  initQuizModule();
  initFlashcardsModule();

  // Setup Dashboard logic
  setupDashboard(router);
});

// Stats dashboard update
function setupDashboard(router) {
  const dashWelcome = document.getElementById('dashboard-welcome');
  const focusTimeEl = document.getElementById('dash-focus-time');
  const taskCountEl = document.getElementById('dash-task-count');
  const taskBarEl = document.getElementById('dash-task-bar');
  const quizStatsEl = document.getElementById('dash-quiz-stats');
  const quizAvgEl = document.getElementById('dash-quiz-avg');
  const deckCountEl = document.getElementById('dash-deck-count');
  const cardsCountEl = document.getElementById('dash-cards-count');
  const remindersListEl = document.getElementById('dash-reminders-list');
  const activeTaskContainer = document.getElementById('dash-active-task-container');

  // Customize welcome based on time of day
  const hours = new Date().getHours();
  let greet = "Welcome back, Scholar";
  if (hours < 12) greet = "Good morning, Scholar";
  else if (hours < 17) greet = "Good afternoon, Scholar";
  else greet = "Good evening, Scholar";
  dashWelcome.textContent = greet;

  const updateDashboard = () => {
    // 1. Pomodoro time today
    const focusTimeToday = db.get('focus_minutes', 0);
    focusTimeEl.textContent = `${focusTimeToday} min`;

    // 2. Tasks
    const tasks = db.get('tasks', []);
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    taskCountEl.textContent = `${completed}/${total}`;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    taskBarEl.style.width = `${pct}%`;

    // 3. Quizzes completed & stats
    const quizLogs = db.get('quiz_history', []);
    const uniqueQuizzesCount = quizLogs.length;
    quizStatsEl.textContent = `${uniqueQuizzesCount} Completed`;
    const avgScore = uniqueQuizzesCount > 0 
      ? Math.round(quizLogs.reduce((acc, log) => acc + log.score, 0) / uniqueQuizzesCount) 
      : 0;
    quizAvgEl.textContent = `Avg Score: ${avgScore}%`;

    // 4. Flashcards
    const decks = db.get('decks', []);
    const totalCards = decks.reduce((acc, d) => acc + (d.cards ? d.cards.length : 0), 0);
    deckCountEl.textContent = `${decks.length} Decks`;
    cardsCountEl.textContent = `${totalCards} total cards`;

    // 5. Active Focus Task
    const focusTaskId = db.get('focus_task_id', null);
    const focusTask = tasks.find(t => t.id === focusTaskId);
    if (focusTask && !focusTask.completed) {
      activeTaskContainer.innerHTML = `
        <div class="active-focus-widget">
          <div class="active-title">${focusTask.title}</div>
          <div class="active-meta">Category: ${focusTask.category} | Priority: ${focusTask.priority}</div>
        </div>
      `;
    } else {
      activeTaskContainer.innerHTML = `<p class="empty-msg">No active focus task selected. Set one in To-Do List or Pomodoro page.</p>`;
    }

    // 6. Upcoming Reminders
    const reminders = db.get('reminders', []);
    const upcoming = reminders
      .filter(r => new Date(r.time) > new Date())
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .slice(0, 3);

    if (upcoming.length > 0) {
      remindersListEl.innerHTML = upcoming.map(r => {
        const timeStr = new Date(r.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="dash-reminder-item">
            <div class="r-title">${r.title}</div>
            <div class="r-time">${timeStr}</div>
          </div>
        `;
      }).join('');
    } else {
      remindersListEl.innerHTML = `<p class="empty-msg">No upcoming reminders</p>`;
    }
  };

  // Listen for db updates to refresh dashboard stats
  window.addEventListener('dbUpdated', updateDashboard);
  window.addEventListener('sectionShown', (e) => {
    if (e.detail.id === 'dashboard-section') {
      updateDashboard();
    }
  });

  // Action listeners
  document.getElementById('dash-focus-pomodoro-btn').addEventListener('click', () => {
    router.navigateTo('pomodoro-section');
  });

  document.getElementById('dash-add-reminder-btn').addEventListener('click', () => {
    // Dispatch a trigger open reminder modal event or navigate there
    router.navigateTo('reminders-section');
    // Give it a tiny delay to trigger click on create button
    setTimeout(() => {
      document.getElementById('add-reminder-btn').click();
    }, 100);
  });

  // Initial load run
  updateDashboard();
}
