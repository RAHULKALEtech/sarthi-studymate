// Sarthi StudyMate - Quiz Maker Module
import { db, showToast, synth } from './app.js';

// DOM Cache
const quizDashboardView = document.getElementById('quiz-dashboard-view');
const quizCreatorView = document.getElementById('quiz-creator-view');
const quizPlayView = document.getElementById('quiz-play-view');
const quizResultsView = document.getElementById('quiz-results-view');

const quizzesListContainer = document.getElementById('quizzes-list-container');
const quizQuestionsList = document.getElementById('quiz-questions-list');
const builderForm = document.getElementById('quiz-builder-form');

// Play mode UI Elements
const playingQuizTitle = document.getElementById('playing-quiz-title');
const playingQuizMeta = document.getElementById('playing-quiz-meta');
const quizTimeRemain = document.getElementById('quiz-time-remain');
const quizCurrentIndex = document.getElementById('quiz-current-index');
const quizTotalQuestions = document.getElementById('quiz-total-questions');
const quizScoreIndicator = document.getElementById('quiz-score-indicator');
const quizPlayBar = document.getElementById('quiz-play-bar');
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptionsContainer = document.getElementById('quiz-options-container');
const quizNextBtn = document.getElementById('quiz-next-btn');

// Results Screen Elements
const resultsRingProgress = document.getElementById('results-ring-progress');
const resultsScorePercent = document.getElementById('results-score-percent');
const resultsVerdict = document.getElementById('results-verdict');
const resultsSummary = document.getElementById('results-summary');

// Import / Export Elements
const quizImportModal = document.getElementById('quiz-import-modal');
const quizJsonTextarea = document.getElementById('quiz-json-textarea');

// State Variables
let quizzes = [];
let activeQuiz = null;
let currentQuestionIndex = 0;
let score = 0;
let questionTimer = null;
let questionTimeLeft = 30; // 30 seconds per question
let optionsLocked = false;

// Preloaded 10-question Demo Quiz
const DEMO_QUIZ = {
  id: 'quiz_demo_101',
  title: 'Web Technology Essentials',
  category: 'Science',
  questions: [
    {
      question: 'What does HTML stand for?',
      options: ['Hyper Text Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language', 'Hyper Tool Markup Language'],
      correctIndex: 0
    },
    {
      question: 'What does CSS stand for?',
      options: ['Creative Style Sheets', 'Computer Style Sheets', 'Cascading Style Sheets', 'Colorful Style Sheets'],
      correctIndex: 2
    },
    {
      question: 'Which HTML tag is used to define an internal style sheet?',
      options: ['<script>', '<css>', '<style>', '<link>'],
      correctIndex: 2
    },
    {
      question: 'Which CSS property controls the text size?',
      options: ['font-size', 'text-size', 'font-style', 'text-style'],
      correctIndex: 0
    },
    {
      question: 'Which HTML element is used for the largest heading?',
      options: ['<heading>', '<h6>', '<h1>', '<head>'],
      correctIndex: 2
    },
    {
      question: 'What is the correct HTML for creating a hyperlink?',
      options: ['<a href="url">Link</a>', '<a>url</a>', '<a name="url">Link</a>', '<link href="url">Link</link>'],
      correctIndex: 0
    },
    {
      question: 'How do you write "Hello World" in an alert box?',
      options: ['msgBox("Hello World");', 'alertBox("Hello World");', 'msg("Hello World");', 'alert("Hello World");'],
      correctIndex: 3
    },
    {
      question: 'How do you create a function in JavaScript?',
      options: ['function:myFunction()', 'function myFunction()', 'function = myFunction()', 'def myFunction()'],
      correctIndex: 1
    },
    {
      question: 'How do you call a function named "myFunction"?',
      options: ['call myFunction()', 'myFunction()', 'call function myFunction()', 'myFunction(call)'],
      correctIndex: 1
    },
    {
      question: 'Which event occurs when the user clicks on an HTML element?',
      options: ['onmouseover', 'onchange', 'onclick', 'onclickevent'],
      correctIndex: 2
    }
  ]
};

export function initQuizModule() {
  quizzes = db.get('quizzes', []);
  
  // Load demo quiz if empty
  if (quizzes.length === 0) {
    quizzes.push(DEMO_QUIZ);
    db.set('quizzes', quizzes);
  }

  // Dashboard buttons
  document.getElementById('create-quiz-btn').addEventListener('click', openQuizBuilder);
  document.getElementById('import-quiz-btn').addEventListener('click', openImportModal);
  document.getElementById('quiz-import-close').addEventListener('click', closeImportModal);
  document.getElementById('quiz-import-submit-btn').addEventListener('click', importQuizJSON);

  // Builder buttons
  document.getElementById('add-question-btn').addEventListener('click', () => addQuestionField());
  document.getElementById('cancel-quiz-btn').addEventListener('click', exitQuizBuilder);
  document.getElementById('cancel-create-btn').addEventListener('click', exitQuizBuilder);
  builderForm.addEventListener('submit', saveNewQuiz);

  // Play buttons
  quizNextBtn.addEventListener('click', nextQuestion);
  document.getElementById('quiz-quit-btn').addEventListener('click', quitQuiz);
  
  // Results buttons
  document.getElementById('results-home-btn').addEventListener('click', showDashboard);
  document.getElementById('results-retry-btn').addEventListener('click', () => startQuiz(activeQuiz));

  // Initialize
  showDashboard();
}

function showDashboard() {
  quizDashboardView.style.display = 'block';
  quizCreatorView.style.display = 'none';
  quizPlayView.style.display = 'none';
  quizResultsView.style.display = 'none';
  
  renderQuizzesList();
}

function renderQuizzesList() {
  if (quizzes.length === 0) {
    quizzesListContainer.innerHTML = `<p class="empty-msg" style="grid-column: 1/-1;">No quizzes available. Click Create Quiz to start!</p>`;
    return;
  }

  quizzesListContainer.innerHTML = quizzes.map(q => {
    return `
      <div class="glass-panel quiz-card">
        <div class="quiz-card-header">
          <span class="badge" style="background: rgba(139,92,246,0.15); color: var(--accent-primary);">${q.category}</span>
          <h2 class="quiz-card-title">${escapeHTML(q.title)}</h2>
          <div class="quiz-card-meta">${q.questions.length} Questions</div>
        </div>
        <div class="quiz-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="exportQuizClick('${q.id}')">Export</button>
          <button class="btn btn-primary btn-sm" onclick="startQuizClick('${q.id}')">Take Quiz</button>
          ${q.id !== 'quiz_demo_101' ? `
            <button class="btn btn-secondary btn-sm" style="border-color: var(--accent-danger); color: var(--accent-danger);" onclick="deleteQuizClick('${q.id}')">Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Bind globals
  window.startQuizClick = (id) => {
    const quiz = quizzes.find(q => q.id === id);
    if (quiz) startQuiz(quiz);
  };

  window.deleteQuizClick = (id) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      quizzes = quizzes.filter(q => q.id !== id);
      db.set('quizzes', quizzes);
      renderQuizzesList();
      showToast("Quiz deleted", "info");
    }
  };

  window.exportQuizClick = (id) => {
    const quiz = quizzes.find(q => q.id === id);
    if (quiz) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quiz, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${quiz.title.toLowerCase().replace(/\s+/g, '_')}_quiz.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Quiz JSON exported!", "success");
    }
  };
}

// QUIZ IMPORT
function openImportModal() {
  quizImportModal.classList.add('active');
  quizJsonTextarea.value = '';
}

function closeImportModal() {
  quizImportModal.classList.remove('active');
}

function importQuizJSON() {
  const jsonText = quizJsonTextarea.value.trim();
  if (!jsonText) return;

  try {
    const quizObj = JSON.parse(jsonText);
    if (!quizObj.title || !quizObj.questions || !Array.isArray(quizObj.questions)) {
      throw new Error("Invalid structure. Must have a title and questions array.");
    }

    // Validate each question
    quizObj.questions.forEach((q, idx) => {
      if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2 || q.correctIndex === undefined) {
        throw new Error(`Question ${idx + 1} has invalid fields.`);
      }
    });

    // Save
    quizObj.id = 'quiz_' + Date.now();
    quizzes.push(quizObj);
    db.set('quizzes', quizzes);

    showToast("Quiz imported successfully!", "success");
    synth.playChime();
    closeImportModal();
    renderQuizzesList();
  } catch (e) {
    alert("Failed to parse Quiz JSON: " + e.message);
  }
}

// QUIZ BUILDER
function openQuizBuilder() {
  quizDashboardView.style.display = 'none';
  quizCreatorView.style.display = 'block';
  
  // Clear form
  builderForm.reset();
  quizQuestionsList.innerHTML = '';
  
  // Start with 1 blank question
  addQuestionField();
}

function exitQuizBuilder() {
  if (confirm("Discard unsaved changes?")) {
    showDashboard();
  }
}

function addQuestionField(questionData = null) {
  const qIndex = quizQuestionsList.children.length;
  const item = document.createElement('div');
  item.className = 'quiz-question-builder-item';
  item.innerHTML = `
    <button type="button" class="remove-question-btn" onclick="this.parentElement.remove()">Remove</button>
    <div class="form-group">
      <label>Question ${qIndex + 1}</label>
      <input type="text" class="form-control q-text-input" placeholder="e.g. What is the value of Pi?" required>
    </div>
    <div class="options-builder-grid">
      <div class="option-builder-input">
        <input type="radio" name="correct_${qIndex}" value="0" checked>
        <input type="text" class="form-control q-opt-0" placeholder="Option A" required>
      </div>
      <div class="option-builder-input">
        <input type="radio" name="correct_${qIndex}" value="1">
        <input type="text" class="form-control q-opt-1" placeholder="Option B" required>
      </div>
      <div class="option-builder-input">
        <input type="radio" name="correct_${qIndex}" value="2">
        <input type="text" class="form-control q-opt-2" placeholder="Option C" required>
      </div>
      <div class="option-builder-input">
        <input type="radio" name="correct_${qIndex}" value="3">
        <input type="text" class="form-control q-opt-3" placeholder="Option D" required>
      </div>
    </div>
  `;
  quizQuestionsList.appendChild(item);
}

function saveNewQuiz(e) {
  e.preventDefault();

  const title = document.getElementById('quiz-title').value.trim();
  const category = document.getElementById('quiz-category').value;
  
  const questionCards = quizQuestionsList.querySelectorAll('.quiz-question-builder-item');
  if (questionCards.length === 0) {
    alert("Please add at least 1 question.");
    return;
  }

  const parsedQuestions = [];
  let valid = true;

  questionCards.forEach((card, idx) => {
    const question = card.querySelector('.q-text-input').value.trim();
    const o0 = card.querySelector('.q-opt-0').value.trim();
    const o1 = card.querySelector('.q-opt-1').value.trim();
    const o2 = card.querySelector('.q-opt-2').value.trim();
    const o3 = card.querySelector('.q-opt-3').value.trim();
    const correctRadio = card.querySelector(`input[name="correct_${idx}"]:checked`);
    
    if (!question || !o0 || !o1 || !o2 || !o3 || !correctRadio) {
      valid = false;
      return;
    }

    parsedQuestions.push({
      question,
      options: [o0, o1, o2, o3],
      correctIndex: parseInt(correctRadio.value)
    });
  });

  if (!valid) {
    alert("Please fill out all questions and choices.");
    return;
  }

  const newQuiz = {
    id: 'quiz_' + Date.now(),
    title,
    category,
    questions: parsedQuestions
  };

  quizzes.push(newQuiz);
  db.set('quizzes', quizzes);

  showToast("Quiz saved successfully!", "success");
  synth.playChime();
  
  showDashboard();
}

// QUIZ TAKER PLAYER
function startQuiz(quiz) {
  synth.init();
  activeQuiz = quiz;
  currentQuestionIndex = 0;
  score = 0;
  optionsLocked = false;

  quizDashboardView.style.display = 'none';
  quizCreatorView.style.display = 'none';
  quizPlayView.style.display = 'block';
  quizResultsView.style.display = 'none';

  playingQuizTitle.textContent = quiz.title;
  playingQuizMeta.textContent = `Category: ${quiz.category}`;
  quizTotalQuestions.textContent = quiz.questions.length;

  renderActiveQuestion();
}

function renderActiveQuestion() {
  clearInterval(questionTimer);
  optionsLocked = false;
  quizNextBtn.disabled = true;

  const currentQ = activeQuiz.questions[currentQuestionIndex];
  
  // Updates progress headers
  quizCurrentIndex.textContent = currentQuestionIndex + 1;
  const pct = Math.round((currentQuestionIndex / activeQuiz.questions.length) * 100);
  quizPlayBar.style.width = `${pct}%`;
  
  const scorePct = currentQuestionIndex > 0 ? Math.round((score / currentQuestionIndex) * 100) : 0;
  quizScoreIndicator.textContent = `Score: ${scorePct}%`;

  // Render text
  quizQuestionText.textContent = currentQ.question;

  // Render options buttons
  quizOptionsContainer.innerHTML = currentQ.options.map((opt, idx) => {
    return `
      <button class="quiz-option-btn" onclick="selectQuizOption(${idx})">
        ${escapeHTML(opt)}
      </button>
    `;
  }).join('');

  // Start question timer
  questionTimeLeft = 30;
  quizTimeRemain.textContent = `${questionTimeLeft}s`;
  quizTimeRemain.parentElement.style.background = 'rgba(245, 158, 11, 0.15)';
  quizTimeRemain.parentElement.style.color = 'var(--accent-warning)';

  questionTimer = setInterval(() => {
    questionTimeLeft--;
    quizTimeRemain.textContent = `${questionTimeLeft}s`;

    if (questionTimeLeft <= 10) {
      // Danger colors
      quizTimeRemain.parentElement.style.background = 'rgba(239, 68, 68, 0.15)';
      quizTimeRemain.parentElement.style.color = 'var(--accent-danger)';
    }

    if (questionTimeLeft <= 0) {
      handleQuestionTimeout();
    }
  }, 1000);

  // Bind select options to window
  window.selectQuizOption = (idx) => {
    if (optionsLocked) return;
    lockQuizOptions(idx);
  };
}

function handleQuestionTimeout() {
  clearInterval(questionTimer);
  optionsLocked = true;
  quizNextBtn.disabled = false;
  synth.playAlarm();

  // Show correct option
  const correctIdx = activeQuiz.questions[currentQuestionIndex].correctIndex;
  const buttons = quizOptionsContainer.querySelectorAll('.quiz-option-btn');
  
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.classList.add('correct');
    }
  });

  showToast("Time ran out!", "danger");
}

function lockQuizOptions(selectedIndex) {
  clearInterval(questionTimer);
  optionsLocked = true;
  quizNextBtn.disabled = false;

  const correctIdx = activeQuiz.questions[currentQuestionIndex].correctIndex;
  const buttons = quizOptionsContainer.querySelectorAll('.quiz-option-btn');
  const isCorrect = selectedIndex === correctIdx;

  if (isCorrect) {
    score++;
    synth.playChime();
    showToast("Correct!", "success");
  } else {
    synth.playAlarm();
    showToast("Wrong Answer!", "danger");
  }

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIdx) {
      btn.classList.add('correct');
    }
    if (idx === selectedIndex && !isCorrect) {
      btn.classList.add('incorrect');
    }
  });
}

function nextQuestion() {
  currentQuestionIndex++;
  
  if (currentQuestionIndex < activeQuiz.questions.length) {
    renderActiveQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  clearInterval(questionTimer);
  
  quizPlayView.style.display = 'none';
  quizResultsView.style.display = 'block';

  // Calculate percentage
  const pctScore = Math.round((score / activeQuiz.questions.length) * 100);
  resultsScorePercent.textContent = `${pctScore}%`;
  resultsSummary.textContent = `You answered ${score} out of ${activeQuiz.questions.length} questions correctly.`;

  // Verdict text
  if (pctScore === 100) {
    resultsVerdict.textContent = "Perfect Score! 🏆";
    synth.playChime();
  } else if (pctScore >= 80) {
    resultsVerdict.textContent = "Great Job! 🌟";
    synth.playChime();
  } else if (pctScore >= 50) {
    resultsVerdict.textContent = "Good Effort! 👍";
  } else {
    resultsVerdict.textContent = "Keep Studying! 📚";
  }

  // Animate circular ring
  const circleCircumference = 439.822; // 2 * PI * 70
  resultsRingProgress.style.strokeDashoffset = circleCircumference;
  
  // Wait a microsecond for CSS to paint, then transition
  setTimeout(() => {
    const offset = circleCircumference * (1 - (score / activeQuiz.questions.length));
    resultsRingProgress.style.strokeDashoffset = offset;
  }, 100);

  // Log to history log
  const history = db.get('quiz_history', []);
  history.push({
    id: 'history_' + Date.now(),
    quizId: activeQuiz.id,
    quizTitle: activeQuiz.title,
    score: pctScore,
    correctCount: score,
    totalCount: activeQuiz.questions.length,
    triggeredAt: new Date().toISOString()
  });
  db.set('quiz_history', history);
}

function quitQuiz() {
  if (confirm("Are you sure you want to quit? Your progress will be lost.")) {
    clearInterval(questionTimer);
    showDashboard();
  }
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
