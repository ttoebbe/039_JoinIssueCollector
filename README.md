# Join — Kanban Task Manager

A vanilla JavaScript task management web application with real-time Firebase sync. Organize tasks across a drag-and-drop Kanban board, manage contacts, and track progress via a summary dashboard.

---

## Features

- **Authentication** — Register, log in, or try the app as a guest
- **Summary Dashboard** — At-a-glance KPIs: open tasks, urgent items, and upcoming deadlines
- **Kanban Board** — Drag-and-drop cards across four columns: *To Do*, *In Progress*, *Awaiting Feedback*, *Done*
- **Task Management** — Create tasks with title, description, priority, due date, assigned contacts, and subtasks
- **Contacts** — Add and manage contacts for task assignment
- **Search** — Filter tasks on the board in real time
- **Responsive** — Works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Database | Firebase Realtime Database (REST API) |
| Auth | Custom auth via Firebase |
| Build | None — served as static files |

---

## Project Structure

```
024_Join/
├── index.html              # Entry point (login page)
├── assets/
│   ├── img/                # SVG icons and branding
│   └── fonts/              # Custom fonts
├── css/
│   ├── core/               # CSS variables and base styles
│   ├── pages/              # Page-specific styles
│   └── components/         # Reusable component styles
├── html/
│   ├── pages/              # App pages (board, contacts, summary, ...)
│   └── components/         # Shared HTML snippets
└── js/
    ├── core/               # Firebase service, constants, utilities
    ├── features/           # Feature modules (auth, board, add-task, contacts, summary)
    ├── components/         # Reusable JS components (toast, overlays, ...)
    └── templates/          # Template rendering helpers
```

---

## Getting Started

No build step required. Open the project directly in a browser or serve it with a local static server.

**Option A — VS Code Live Server**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → *Open with Live Server*

**Option B — Python**

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

---

## Firebase Configuration

The Firebase project URL and API key are defined in [js/core/constants.js](js/core/constants.js). Replace the values there if you want to point the app at your own Firebase project.

---

## Architecture Notes

- **No framework, no bundler** — plain ES6 modules loaded via `<script type="module">`
- **Service layer** — All Firebase REST calls are abstracted in `firebase-service.js` (`UserService`, `TaskService`, `ContactService`)
- **Feature modules** — Each feature (auth, board, contacts, etc.) is self-contained under `js/features/`
- **Local storage** — Used for session state between page navigations

---

## License

This project is for educational purposes.
