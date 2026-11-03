interface AttemptEntry {
  count: number;
  resetAt: number;
}

/**
 * Compteur de tentatives en mémoire, par clé (e-mail, identifiant...).
 * Complète le rate limiting par IP, contournable avec plusieurs adresses.
 */
export class AttemptLimiter {
  private entries = new Map<string, AttemptEntry>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  isBlocked(key: string): boolean {
    const entry = this.getEntry(key);
    return Boolean(entry && entry.count >= this.maxAttempts);
  }

  /** Enregistre une tentative et retourne le nombre de tentatives dans la fenêtre courante. */
  hit(key: string): number {
    const now = Date.now();
    const entry = this.getEntry(key);
    if (entry) {
      entry.count += 1;
      return entry.count;
    }
    this.prune(now);
    this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
    return 1;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private getEntry(key: string): AttemptEntry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.resetAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private prune(now: number): void {
    if (this.entries.size < 10000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}
