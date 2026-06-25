// Sarthi StudyMate - Flashcard Module
import { db, showToast, synth } from './app.js';

// DOM Cache
const deckDashboardView = document.getElementById('flashcards-dashboard-view');
const studyView = document.getElementById('flashcards-study-view');
const editorView = document.getElementById('flashcards-editor-view');

const decksListContainer = document.getElementById('decks-list-container');
const cardModal = document.getElementById('card-modal');
const cardForm = document.getElementById('card-form');
const deckModal = document.getElementById('deck-modal');
const deckForm = document.getElementById('deck-form');

// Study mode UI
const studyingDeckTitle = document.getElementById('studying-deck-title');
const studyCurrentIndex = document.getElementById('study-current-index');
const studyTotalCards = document.getElementById('study-total-cards');
const studyPercentComplete = document.getElementById('study-percent-complete');
const studyProgressBar = document.getElementById('study-progress-bar');
const interactiveFlashcard = document.getElementById('interactive-flashcard');
const cardFrontContent = document.getElementById('card-front-content');
const cardBackContent = document.getElementById('card-back-content');
const ratingControlsContainer = document.getElementById('rating-controls-container');
const flipPromptContainer = document.getElementById('flip-prompt-container');
const revealAnswerBtn = document.getElementById('study-flip-card-btn');

// Editor mode UI
const editDeckTitle = document.getElementById('edit-deck-title');
const deckEditorCardsTbody = document.getElementById('deck-editor-cards-tbody');

// State Variables
let decks = [];
let currentDeck = null;
let sessionCards = [];
let sessionIndex = 0;
let cardFlipped = false;
let cardsAttempted = 0;

// Preloaded demo decks
const DEMO_DECKS = [
  {
    id: 'deck_demo_1',
    name: 'General Science Terminology',
    desc: 'Key scientific terms, definitions, and concepts for quick review.',
    cards: [
      { id: 'card_demo_1_1', front: 'Mitochondria', back: 'Powerhouse of the cell. Generates ATP (energy).' },
      { id: 'card_demo_1_2', front: 'Photosynthesis', back: 'Process by which plants convert sunlight, water, and CO2 into oxygen and glucose.' },
      { id: 'card_demo_1_3', front: 'Newton\'s First Law', back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.' }
    ]
  },
  {
    id: 'deck_demo_2',
    name: 'Web Dev Glossary',
    desc: 'Important definitions and abbreviations in web engineering.',
    cards: [
      { id: 'card_demo_2_1', front: 'API', back: 'Application Programming Interface. Enables different software applications to communicate with each other.' },
      { id: 'card_demo_2_2', front: 'DOM', back: 'Document Object Model. Tree representation of the HTML document structure.' },
      { id: 'card_demo_2_3', front: 'CORS', back: 'Cross-Origin Resource Sharing. Security mechanism restricting external domain requests.' }
    ]
  }
];

export function initFlashcardsModule() {
  decks = db.get('decks', []);
  
  if (decks.length === 0) {
    decks = DEMO_DECKS;
    db.set('decks', decks);
  }

  // Decks event triggers
  document.getElementById('create-deck-btn').addEventListener('click', openCreateDeckModal);
  document.getElementById('deck-modal-close').addEventListener('click', closeCreateDeckModal);
  deckForm.addEventListener('submit', handleCreateDeckSubmit);

  // Deck modal close overlay click
  deckModal.addEventListener('click', (e) => {
    if (e.target === deckModal) closeCreateDeckModal();
  });

  // Card modal event triggers
  document.getElementById('edit-add-card-btn').addEventListener('click', openAddCardModal);
  document.getElementById('card-modal-close').addEventListener('click', closeAddCardModal);
  cardForm.addEventListener('submit', handleAddCardSubmit);
  
  cardModal.addEventListener('click', (e) => {
    if (e.target === cardModal) closeAddCardModal();
  });

  // Study buttons
  document.getElementById('exit-study-btn').addEventListener('click', exitStudySession);
  interactiveFlashcard.addEventListener('click', flipCard);
  revealAnswerBtn.addEventListener('click', revealAnswer);

  document.getElementById('rate-easy-btn').addEventListener('click', () => handleRateCard('easy'));
  document.getElementById('rate-medium-btn').addEventListener('click', () => handleRateCard('medium'));
  document.getElementById('rate-hard-btn').addEventListener('click', () => handleRateCard('hard'));

  // Editor buttons
  document.getElementById('edit-deck-back-btn').addEventListener('click', showDashboard);

  showDashboard();
}

function showDashboard() {
  deckDashboardView.style.display = 'block';
  studyView.style.display = 'none';
  editorView.style.display = 'none';
  currentDeck = null;
  
  renderDecksGrid();
}

function renderDecksGrid() {
  if (decks.length === 0) {
    decksListContainer.innerHTML = `<p class="empty-msg" style="grid-column: 1/-1;">No flashcard decks created yet. Add one above!</p>`;
    return;
  }

  decksListContainer.innerHTML = decks.map(d => {
    return `
      <div class="glass-panel deck-card" data-id="${d.id}">
        <div>
          <h2 class="deck-card-title">${escapeHTML(d.name)}</h2>
          <p class="deck-card-desc">${escapeHTML(d.desc || 'No description provided')}</p>
          <div class="deck-card-count">${d.cards ? d.cards.length : 0} Cards</div>
        </div>
        <div class="deck-card-actions">
          <button class="btn btn-primary btn-sm" onclick="studyDeckClick('${d.id}')" ${!d.cards || d.cards.length === 0 ? 'disabled' : ''}>Study</button>
          <button class="btn btn-secondary btn-sm" onclick="manageDeckClick('${d.id}')">Manage</button>
          <button class="btn btn-secondary btn-sm" style="border-color: var(--accent-danger); color: var(--accent-danger); max-width: 44px; padding: 0;" onclick="deleteDeckClick('${d.id}')" title="Delete Deck">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 3px;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind globals
  window.studyDeckClick = (id) => {
    const deck = decks.find(d => d.id === id);
    if (deck) startStudySession(deck);
  };

  window.manageDeckClick = (id) => {
    const deck = decks.find(d => d.id === id);
    if (deck) openDeckEditor(deck);
  };

  window.deleteDeckClick = (id) => {
    if (confirm("Delete this entire deck and all its flashcards?")) {
      decks = decks.filter(d => d.id !== id);
      db.set('decks', decks);
      renderDecksGrid();
      showToast("Deck deleted", "info");
    }
  };
}

// CREATE DECK MODAL
function openCreateDeckModal() {
  deckModal.classList.add('active');
  deckForm.reset();
}

function closeCreateDeckModal() {
  deckModal.classList.remove('active');
}

function handleCreateDeckSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('deck-name-input').value.trim();
  const desc = document.getElementById('deck-desc-input').value.trim();

  if (!name) return;

  const newDeck = {
    id: 'deck_' + Date.now(),
    name,
    desc,
    cards: []
  };

  decks.push(newDeck);
  db.set('decks', decks);
  
  showToast("Deck created successfully!", "success");
  synth.playChime();

  closeCreateDeckModal();
  renderDecksGrid();
}

// STUDY SESSION ENGINE
function startStudySession(deck) {
  synth.init();
  currentDeck = deck;
  sessionCards = [...deck.cards];
  
  // Shuffle cards
  sessionCards.sort(() => Math.random() - 0.5);

  sessionIndex = 0;
  cardsAttempted = 0;
  cardFlipped = false;

  deckDashboardView.style.display = 'none';
  studyView.style.display = 'block';
  editorView.style.display = 'none';

  studyingDeckTitle.textContent = deck.name;
  
  renderActiveCard();
}

function renderActiveCard() {
  cardFlipped = false;
  interactiveFlashcard.classList.remove('flipped');

  const card = sessionCards[sessionIndex];
  
  studyCurrentIndex.textContent = sessionIndex + 1;
  studyTotalCards.textContent = sessionCards.length;
  
  const pct = Math.round((sessionIndex / sessionCards.length) * 100);
  studyPercentComplete.textContent = `${pct}%`;
  studyProgressBar.style.width = `${pct}%`;

  cardFrontContent.textContent = card.front;
  cardBackContent.textContent = card.back;

  // Reset controls
  ratingControlsContainer.style.visibility = 'hidden';
  flipPromptContainer.style.display = 'block';
}

function flipCard() {
  synth.init();
  if (cardFlipped) {
    interactiveFlashcard.classList.remove('flipped');
    cardFlipped = false;
  } else {
    interactiveFlashcard.classList.add('flipped');
    cardFlipped = true;
    revealAnswer();
  }
}

function revealAnswer() {
  cardFlipped = true;
  interactiveFlashcard.classList.add('flipped');
  
  flipPromptContainer.style.display = 'none';
  ratingControlsContainer.style.visibility = 'visible';
}

function handleRateCard(rating) {
  const currentCard = sessionCards[sessionIndex];

  if (rating === 'hard') {
    // Spaced repetition behavior: push card to the end of review queue
    sessionCards.push(currentCard);
    showToast("Review again later!", "warning");
    synth.playAlarm();
  } else {
    synth.playChime();
    showToast("Learned!", "success");
  }

  sessionIndex++;
  
  if (sessionIndex < sessionCards.length) {
    renderActiveCard();
  } else {
    finishStudySession();
  }
}

function finishStudySession() {
  showToast("Deck study session complete!", "success");
  synth.playChime();
  
  // Save focus statistics session (e.g. studied decks logged inside db)
  showDashboard();
}

function exitStudySession() {
  if (confirm("End study session? Progress will not be saved.")) {
    showDashboard();
  }
}

// DECK EDITOR CARD LIST MANAGEMENT
function openDeckEditor(deck) {
  currentDeck = deck;
  
  deckDashboardView.style.display = 'none';
  studyView.style.display = 'none';
  editorView.style.display = 'block';

  editDeckTitle.textContent = `Manage Deck: ${deck.name}`;
  renderEditorCardsTable();
}

function renderEditorCardsTable() {
  const list = currentDeck.cards || [];
  if (list.length === 0) {
    deckEditorCardsTbody.innerHTML = `<tr><td colspan="3" class="empty-msg" style="text-align:center;">No cards in this deck. Click Add New Card to populate.</td></tr>`;
    return;
  }

  deckEditorCardsTbody.innerHTML = list.map(c => {
    return `
      <tr data-id="${c.id}">
        <td>${escapeHTML(c.front)}</td>
        <td>${escapeHTML(c.back)}</td>
        <td class="card-action-btn-cell">
          <button class="btn btn-secondary btn-sm btn-icon-only edit" onclick="editCardClick('${c.id}')" title="Edit Card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn btn-secondary btn-sm btn-icon-only delete" style="color: var(--accent-danger);" onclick="deleteCardClick('${c.id}')" title="Delete Card">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Globals
  window.editCardClick = (cardId) => {
    const card = currentDeck.cards.find(c => c.id === cardId);
    if (card) openAddCardModal(card);
  };

  window.deleteCardClick = (cardId) => {
    if (confirm("Delete this flashcard?")) {
      currentDeck.cards = currentDeck.cards.filter(c => c.id !== cardId);
      
      // Save changes back to decks list
      decks = decks.map(d => d.id === currentDeck.id ? currentDeck : d);
      db.set('decks', decks);
      
      renderEditorCardsTable();
      showToast("Card deleted", "info");
    }
  };
}

// ADD/EDIT INDIVIDUAL CARD MODAL
function openAddCardModal(card = null) {
  cardModal.classList.add('active');
  document.getElementById('card-deck-id').value = currentDeck.id;
  
  if (card) {
    document.getElementById('card-modal-close').parentElement.querySelector('h2').textContent = "Edit Flashcard";
    document.getElementById('card-front-input').value = card.front;
    document.getElementById('card-back-input').value = card.back;
    cardForm.dataset.editId = card.id;
  } else {
    document.getElementById('card-modal-close').parentElement.querySelector('h2').textContent = "Add Flashcard";
    cardForm.reset();
    delete cardForm.dataset.editId;
  }
}

function closeAddCardModal() {
  cardModal.classList.remove('active');
}

function handleAddCardSubmit(e) {
  e.preventDefault();
  const deckId = document.getElementById('card-deck-id').value;
  const front = document.getElementById('card-front-input').value.trim();
  const back = document.getElementById('card-back-input').value.trim();
  const editId = cardForm.dataset.editId;

  if (!front || !back) return;

  const targetDeck = decks.find(d => d.id === deckId);
  if (!targetDeck) return;

  if (editId) {
    // Edit existing card
    targetDeck.cards = targetDeck.cards.map(c => c.id === editId ? { ...c, front, back } : c);
    showToast("Flashcard updated!", "success");
  } else {
    // Create new card
    const newCard = {
      id: 'card_' + Date.now(),
      front,
      back
    };
    targetDeck.cards.push(newCard);
    showToast("Flashcard added!", "success");
    synth.playChime();
  }

  // Save changes
  decks = decks.map(d => d.id === deckId ? targetDeck : d);
  db.set('decks', decks);

  closeAddCardModal();
  renderEditorCardsTable();
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
