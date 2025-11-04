/**
 * Simple token bucket that supports dynamic capacity refill and honoring retry-after.
 * We keep state in-memory for worker-local pacing; global rate limiting is handled by BullMQ limiter.
 */
export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillIntervalMs: number;
  private lastRefillAt: number;

  constructor(capacity: number, refillIntervalMs: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefillAt = Date.now();
  }

  /** Reserve a token, waiting if necessary. */
  async take(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.max(50, this.timeUntilRefill());
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  /** Apply a retry-after hint by pausing refills for the given milliseconds. */
  honorRetryAfter(retryAfterMs: number): void {
    // Push lastRefillAt forward to delay next refill window
    const now = Date.now();
    this.lastRefillAt = Math.max(this.lastRefillAt, now) + retryAfterMs;
  }

  private timeUntilRefill(): number {
    const now = Date.now();
    const nextRefill = this.lastRefillAt + this.refillIntervalMs;
    return Math.max(0, nextRefill - now);
  }

  private refill(): void {
    const now = Date.now();
    if (now - this.lastRefillAt >= this.refillIntervalMs) {
      const intervals = Math.floor((now - this.lastRefillAt) / this.refillIntervalMs);
      if (intervals > 0) {
        this.tokens = Math.min(this.capacity, this.tokens + intervals);
        this.lastRefillAt += intervals * this.refillIntervalMs;
      }
    }
  }
}


