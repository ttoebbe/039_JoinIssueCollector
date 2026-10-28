const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  CONTACTS: 'contacts'
};

const CURRENT_USER_KEY = 'join_current_user';

const USERS_KEY = 'join_users';

const ROUTES = {
  LOGIN: '/html/pages/login.html',
  SUMMARY: '/html/pages/summary.html',
  BOARD: '/html/pages/board.html',
  CONTACTS: '/html/pages/contacts.html',
  ADD_TASK: '/html/pages/add-task.html',
  HELP: '/html/pages/help.html',
  LEGAL_NOTICE: '/html/pages/legal-notice.html',
  PRIVACY_POLICY: '/html/pages/privacy-policy.html'
};

const TASK_STATUS = {
  TRIAGE: 'triage',
  TODO: 'todo',
  IN_PROGRESS: 'inprogress',
  AWAIT_FEEDBACK: 'awaitfeedback',
  DONE: 'done'
};

const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Display labels only. The keys are the values stored in the database and
// compared in code; they must never be translated.
const STATUS_LABELS = {
  triage: 'Triage',
  todo: 'Zu erledigen',
  inprogress: 'In Bearbeitung',
  awaitfeedback: 'Warten auf Feedback',
  done: 'Erledigt'
};

const PRIORITY_LABELS = {
  urgent: 'Dringend',
  medium: 'Mittel',
  low: 'Niedrig'
};

const CATEGORY_LABELS = {
  userstory: 'User Story',
  technical: 'Technische Aufgabe'
};

const API_CONFIG = {
  BASE_URL: 'https://joinv2withn8n-default-rtdb.europe-west1.firebasedatabase.app',
  TIMEOUT: 10000
};

// The web API key identifies the Firebase project and ships with every
// Firebase web app; it grants nothing by itself. Access is decided by the
// database rules, which only let signed-in sessions through.
const AUTH_CONFIG = {
  API_KEY: 'AIzaSyDfZhcTaeJWwRV4BaDKiePBEGib8SCOKJA',
  ACCOUNTS_URL: 'https://identitytoolkit.googleapis.com/v1/accounts',
  TOKEN_URL: 'https://securetoken.googleapis.com/v1/token'
};

const AUTH_SESSION_KEY = 'join_auth_session';

// The secret ships inside the delivered client code and is therefore not a real
// secret. It keeps random requests away, nothing more. What actually protects
// the endpoint sits in the n8n workflow: the recipient address is read from the
// database instead of the request, unknown status values are rejected, and the
// number of mails per ticket and day is capped.
const NOTIFY_CONFIG = {
  ENDPOINT: 'https://join.thomas-toebbe.de/webhook/join-status',
  SECRET: 'join-v2-demo'
};
