const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 15 * 60 * 1000; // 15 minutos

function getKey(name) {
  return String(name).toLowerCase();
}

export function isBlocked(name) {
  const key = getKey(name);
  const data = loginAttempts.get(key);

  if (!data) return false;

  // ainda bloqueado
  if (data.blockUntil && Date.now() < data.blockUntil) {
    return true;
  }

  // desbloqueia automaticamente
  if (data.blockUntil && Date.now() >= data.blockUntil) {
    loginAttempts.delete(key);
  }

  return false;
}

export function registerFail(name) {
  const key = getKey(name);
  const data = loginAttempts.get(key) || { attempts: 0 };

  data.attempts += 1;

  if (data.attempts >= MAX_ATTEMPTS) {
    data.blockUntil = Date.now() + BLOCK_TIME;
  }

  loginAttempts.set(key, data);
}

export function resetAttempts(name) {
  const key = getKey(name);
  loginAttempts.delete(key);
}
