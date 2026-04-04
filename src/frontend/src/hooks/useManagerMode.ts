// Manager Mode — PIN stored in localStorage, session active in sessionStorage

const PIN_KEY = "manager_pin";
const SESSION_KEY = "manager_mode_active";
const SECURITY_Q_KEY = "manager_security_question";
const SECURITY_A_KEY = "manager_security_answer";
const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function resetInactivityTimer() {
  if (!isManagerModeActive()) return;
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    lockManagerMode();
  }, INACTIVITY_MS);
}

// Call this in App.tsx or top-level component to start the timer
export function initManagerModeActivityTracking() {
  const events = ["click", "keydown", "touchstart", "mousemove"];
  const handler = () => resetInactivityTimer();
  for (const ev of events) {
    window.addEventListener(ev, handler, { passive: true });
  }
}

export function isManagerModeActive(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setManagerPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function getManagerPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function hasManagerPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function unlockManagerMode(pin: string): boolean {
  const stored = getManagerPin();
  if (!stored) return false;
  if (stored !== pin) return false;
  sessionStorage.setItem(SESSION_KEY, "1");
  resetInactivityTimer();
  return true;
}

export function lockManagerMode(): void {
  sessionStorage.removeItem(SESSION_KEY);
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// ── Security Question for PIN recovery ──────────────────────────────────────

export const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  "What is your best friend's name?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favourite food?",
  "What is your childhood nickname?",
];

export function setSecurityQuestion(question: string, answer: string): void {
  localStorage.setItem(SECURITY_Q_KEY, question);
  // Normalise: lowercase + trim so answer matching is case-insensitive
  localStorage.setItem(SECURITY_A_KEY, answer.toLowerCase().trim());
}

export function getSecurityQuestion(): string | null {
  return localStorage.getItem(SECURITY_Q_KEY);
}

export function hasSecurityQuestion(): boolean {
  return (
    !!localStorage.getItem(SECURITY_Q_KEY) &&
    !!localStorage.getItem(SECURITY_A_KEY)
  );
}

export function verifySecurityAnswer(answer: string): boolean {
  const stored = localStorage.getItem(SECURITY_A_KEY);
  if (!stored) return false;
  return stored === answer.toLowerCase().trim();
}

export function clearSecurityQuestion(): void {
  localStorage.removeItem(SECURITY_Q_KEY);
  localStorage.removeItem(SECURITY_A_KEY);
}
