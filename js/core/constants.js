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

const API_CONFIG = {
  BASE_URL: 'https://joinv2withn8n-default-rtdb.europe-west1.firebasedatabase.app',
  TIMEOUT: 10000
};

// The secret ships inside the delivered client code and is therefore not a real
// secret. It keeps random requests away, nothing more. What actually protects
// the endpoint sits in the n8n workflow: the recipient address is read from the
// database instead of the request, unknown status values are rejected, and the
// number of mails per ticket and day is capped.
const NOTIFY_CONFIG = {
  ENDPOINT: 'https://n8n.thomas-toebbe.de/webhook/join-status',
  SECRET: 'join-v2-demo'
};
