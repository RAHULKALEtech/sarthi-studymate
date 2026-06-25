// Sarthi StudyMate - Pomodoro Module
import { db, showToast, synth } from './app.js';
import { populateTaskSelectors } from './tasks.js';

// Constants
const CIRCUMFERENCE = 628.318; // 2 * PI * 100

// DOM Cache
const timerPanel = document.querySelector('.pomodoro-timer-panel');
const timeDisplay = document.getElementById('pomo-time-display');
const statusLabel = document.getElementById('pomo-status-label');
const focusTitle = document.getElementById('pomo-focus-title');
const circleProgress = document.getElementById('pomo-circle-progress');

const playBtn = document.getElementById('pomo-play-btn');
const resetBtn = document.getElementById('pomo-reset-btn');
const skipBtn = document.getElementById('pomo-skip-btn');

const workInput = document.getElementById('pomo-work-input');
const breakInput = document.getElementById('pomo-break-input');
const longBreakInput = document.getElementById('pomo-long-break-input');
const saveSettingsBtn = document.getElementById('pomo-save-settings');
const taskSelector = document.getElementById('pomo-task-selector');

// State Variables
let timerInterval = null;
let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
let isRunning = false;
let timeLeft = 0; // in seconds
let totalSeconds = 0; // current mode's total time
let completedSessionsCount = 0;

export function initPomodoroModule() {
  loadConfig();
  resetTimer();

  // Controls Event Listeners
  playBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', () => { resetTimer(); showToast("Timer reset", "info"); });
  skipBtn.addEventListener('click', skipSession);
  saveSettingsBtn.addEventListener('click', saveSettings);

  taskSelector.addEventListener('change', (e) => {
    const taskId = e.target.value;
    if (taskId === 'none') {
      db.set('focus_task_id', null);
      focusTitle.textContent = "No Task Selected";
    } else {
      db.set('focus_task_id', taskId);
      const tasks = db.get('tasks', []);
      const t = tasks.find(item => item.id === taskId);
      if (t) focusTitle.textContent = `Focusing: ${t.title}`;
    }
  });

  // Keep dropdown updated when tasks load or change
  window.addEventListener('dbUpdated', () => {
    populateTaskSelectors();
    updateFocusTitle();
  });

  window.addEventListener('sectionShown', (e) => {
    if (e.detail.id === 'pomodoro-section') {
      populateTaskSelectors();
      updateFocusTitle();
    }
  });
}

function loadConfig() {
  const cfg = db.get('pomodoro_config', { work: 25, break: 5, longBreak: 15 });
  workInput.value = cfg.work;
  breakInput.value = cfg.break;
  longBreakInput.value = cfg.longBreak;
}

function saveSettings() {
  const workVal = Math.max(1, parseInt(workInput.value) || 25);
  const breakVal = Math.max(1, parseInt(breakInput.value) || 5);
  const longVal = Math.max(1, parseInt(longBreakInput.value) || 15);

  db.set('pomodoro_config', { work: workVal, break: breakVal, longBreak: longVal });
  showToast("Settings saved!", "success");
  
  if (!isRunning) {
    resetTimer();
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  timerPanel.classList.remove('running');
  playBtn.querySelector('span').textContent = 'Start';
  playBtn.classList.remove('btn-secondary');
  playBtn.classList.add('btn-primary');

  const cfg = db.get('pomodoro_config', { work: 25, break: 5, longBreak: 15 });
  if (currentMode === 'work') {
    totalSeconds = cfg.work * 60;
    statusLabel.textContent = 'FOCUS';
    circleProgress.style.stroke = 'var(--accent-primary)';
  } else if (currentMode === 'shortBreak') {
    totalSeconds = cfg.break * 60;
    statusLabel.textContent = 'SHORT BREAK';
    circleProgress.style.stroke = 'var(--accent-success)';
  } else {
    totalSeconds = cfg.longBreak * 60;
    statusLabel.textContent = 'LONG BREAK';
    circleProgress.style.stroke = 'var(--accent-secondary)';
  }

  timeLeft = totalSeconds;
  updateTimerDisplay();
  updateCircleProgress(0);
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timeDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateCircleProgress(ratio) {
  const offset = CIRCUMFERENCE * (1 - ratio);
  circleProgress.style.strokeDashoffset = offset;
}

function updateFocusTitle() {
  const focusTaskId = db.get('focus_task_id', null);
  const tasks = db.get('tasks', []);
  const activeTask = tasks.find(t => t.id === focusTaskId);
  
  if (activeTask && !activeTask.completed) {
    focusTitle.textContent = `Focusing: ${activeTask.title}`;
    if (taskSelector.value !== focusTaskId) {
      taskSelector.value = focusTaskId;
    }
  } else {
    focusTitle.textContent = "No Task Selected";
    taskSelector.value = 'none';
  }
}

function toggleTimer() {
  synth.init(); // Audio startup

  if (isRunning) {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    timerPanel.classList.remove('running');
    playBtn.querySelector('span').textContent = 'Resume';
    showToast("Timer paused", "info");
  } else {
    // Start/Resume
    isRunning = true;
    timerPanel.classList.add('running');
    playBtn.querySelector('span').textContent = 'Pause';
    playBtn.classList.remove('btn-primary');
    playBtn.classList.add('btn-secondary');

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      updateCircleProgress((totalSeconds - timeLeft) / totalSeconds);

      if (timeLeft <= 0) {
        handleTimerEnd();
      }
    }, 1000);
  }
}

function handleTimerEnd() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  timerPanel.classList.remove('running');

  if (currentMode === 'work') {
    // Complete focus session
    synth.playAlarm();
    showToast("Focus session complete! Take a break.", "success");
    
    // Log focus minutes today
    const cfg = db.get('pomodoro_config', { work: 25, break: 5, longBreak: 15 });
    const currentMins = db.get('focus_minutes', 0);
    db.set('focus_minutes', currentMins + cfg.work);

    completedSessionsCount++;
    if (completedSessionsCount % 4 === 0) {
      currentMode = 'longBreak';
    } else {
      currentMode = 'shortBreak';
    }
  } else {
    // Complete break session
    synth.playChime();
    showToast("Break over! Time to focus.", "info");
    currentMode = 'work';
  }

  resetTimer();
}

function skipSession() {
  synth.init();
  if (confirm("Skip this session?")) {
    if (currentMode === 'work') {
      currentMode = 'shortBreak';
    } else {
      currentMode = 'work';
    }
    resetTimer();
    showToast("Session skipped", "info");
  }
}
