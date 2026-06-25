# 🎓 Sarthi StudyMate

A premium, highly interactive, glassmorphic Study Planner web application designed to optimize student focus, organization, and learning retention. Built with vanilla HTML5, modern CSS3 (with theme triggers), and ES modules.

---

## ✨ Features

1.  **📊 Dashboard Overview:** A centralized view of today's study metrics, daily focus hours, upcoming tasks progress rings, flashcard counts, and upcoming reminders.
2.  **📝 To-Do List:** Full-featured task planner. Category tagging (Math, Science, Languages, etc.), priority badge sorting (High, Medium, Low), due date countdown alerts, and completed task archives. Select any task to set it as today's active Pomodoro focus.
3.  **⏱️ Pomodoro Timer:** Study timer utilizing circular SVG progress countdowns and sound chimes. Fully custom configurations for focus duration, short break, and long break intervals. Connects automatically to active focus tasks.
4.  **⏰ Smart Reminders:** Time-based alert scheduling system. Features notification toast alarms, log listings, and repeating options (daily/weekly).
5.  **✍️ Quiz Maker:** Custom multiple-choice exam creator. Take quizzes on an interactive screen featuring a ticking 30-second timer per question, immediate score indicators, and historical percentage tracking rings. Includes a preloaded **10-question Web Technology Essentials quiz**.
6.  **🗂️ Flashcard Decks:** Study decks featuring 3D double-sided CSS card flips. Spaced repetition recall rating system (Easy, Medium, Hard - Hard cards are queued to show again later in the session until learned).
7.  **🌓 Theme Controller:** Smooth transitions between Light and Dark mode templates.
8.  **🔊 Web Audio Synth Engine:** Audio alerts synthesized using the browser's native Web Audio API (no external MP3 downloads or path errors).
9.  **💾 Local Persistence:** All data is saved inside the browser's local storage database instantly.

---

## 🚀 How to Run the App

Sarthi StudyMate does not require any external dependencies and can run on any machine with Node.js installed.

### Step 1: Run the Dev Server
Run the local dev server using Node.js:
```bash
npm run dev
# or
node server.js
```

### Step 2: Open your Browser
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Project Structure

```text
jsdr Capstone Project/
├── index.html        # Entry SPA structure
├── server.js         # Light static server
├── package.json      # Node scripts
├── css/
│   ├── styles.css    # Global theme rules & resets
│   ├── dashboard.css # Dashboard widget designs
│   ├── tasks.css     # Task board styles
│   ├── pomodoro.css  # Circular timer animations
│   ├── quiz.css      # Quiz layout templates
│   ├── flashcards.css# 3D cards flip classes
│   └── reminders.css # Reminders list layouts
└── js/
    ├── app.js        # Core controller, theme, and router
    ├── tasks.js      # Task board logic
    ├── pomodoro.js   # Timer tickers
    ├── reminders.js  # Scheduler checks
    ├── quiz.js       # Quiz game states
    └── flashcards.js # Flashcard study loops
```
