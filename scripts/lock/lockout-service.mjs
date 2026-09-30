/**
 * Lumenn Phone Hub - Lockout Service
 * Gerencia o bloqueio progressivo por falhas consecutivas de PIN.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

const COOLDOWNS = [
  0, // 0 falhas
  500, // 1 falha: 500 ms
  1000, // 2 falhas: 1 s
  2000, // 3 falhas: 2 s
  4000, // 4 falhas: 4 s
  30000, // 5 falhas: 30 s
  60000, // 6 falhas: 60 s
  120000, // 7 falhas: 120 s
  300000, // 8 falhas: 5 min
  900000, // 9+ falhas: 15 min
];

export class LockoutService {
  /** @type {Map<string, { attempts: number[], lockUntil: number }>} */
  static _state = new Map();

  /**
   * Limpa tentativas antigas fora da janela de 15 minutos.
   * @param {string} actorUuid
   * @private
   */
  static _prune(actorUuid) {
    const entry = this._state.get(actorUuid);
    if (!entry) return;

    const now = Date.now();
    entry.attempts = entry.attempts.filter((ts) => now - ts < WINDOW_MS);

    if (entry.attempts.length === 0 && entry.lockUntil <= now) {
      this._state.delete(actorUuid);
    }
  }

  /**
   * Verifica o estado de lockout para um ator.
   * @param {string} actorUuid
   * @returns {{ isLocked: boolean, remainingMs: number, attemptCount: number }}
   */
  static getLockoutState(actorUuid) {
    this._prune(actorUuid);
    const entry = this._state.get(actorUuid);
    if (!entry) {
      return { isLocked: false, remainingMs: 0, attemptCount: 0 };
    }

    const now = Date.now();
    const remainingMs = Math.max(0, entry.lockUntil - now);

    return {
      isLocked: remainingMs > 0,
      remainingMs,
      attemptCount: entry.attempts.length,
    };
  }

  /**
   * Registra uma falha de autenticação.
   * @param {string} actorUuid
   * @returns {{ isLocked: boolean, remainingMs: number, attemptCount: number }}
   */
  static recordFailure(actorUuid) {
    this._prune(actorUuid);
    const now = Date.now();
    let entry = this._state.get(actorUuid);

    if (!entry) {
      entry = { attempts: [], lockUntil: 0 };
      this._state.set(actorUuid, entry);
    }

    entry.attempts.push(now);
    const count = entry.attempts.length;
    const cooldownIdx = Math.min(count, COOLDOWNS.length - 1);
    const cooldownMs = COOLDOWNS[cooldownIdx];

    entry.lockUntil = now + cooldownMs;

    return {
      isLocked: true,
      remainingMs: cooldownMs,
      attemptCount: count,
    };
  }

  /**
   * Registra sucesso na autenticação, resetando as falhas.
   * @param {string} actorUuid
   */
  static recordSuccess(actorUuid) {
    this._state.delete(actorUuid);
  }
}
