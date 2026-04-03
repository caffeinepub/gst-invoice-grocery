// Manager Mode — PIN stored in localStorage, session active in sessionStorage

const PIN_KEY = "manager_pin";
const SESSION_KEY = "manager_mode_active";
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
