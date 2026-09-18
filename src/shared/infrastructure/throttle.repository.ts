import type { PrismaClient } from "@prisma/client";
import type { ThrottleRepository } from "@/shared/application";
import type { AttemptState } from "@/shared/domain";

/** Counters idle for longer than this neither block nor count; they are dropped. */
const PRUNE_AFTER_MS = 60 * 60 * 1000;

/**
 * Attempt counters in PostgreSQL, shared by login and by the write routes.
 *
 * One row per key, updated in place — not one record per attempt. The
 * difference matters: a brute-force attack would write thousands of rows per
 * minute, turning the defense into a way of filling the victim's disk.
 */
export class PrismaThrottleRepository implements ThrottleRepository {
  constructor(private readonly db: PrismaClient) {}

  async find(key: string): Promise<AttemptState | null> {
    const row = await this.db.throttleCounter.findUnique({ where: { key } });
    if (!row) return null;
    return {
      failures: row.failures,
      firstFailureAt: row.firstFailureAt,
      blockedUntil: row.blockedUntil,
    };
  }

  async save(key: string, state: AttemptState): Promise<void> {
    await this.db.throttleCounter.upsert({
      where: { key },
      create: { key, ...state },
      update: state,
    });

    await this.pruneExpired();
  }

  async clear(key: string): Promise<void> {
    // `deleteMany` rather than `delete`: the key may not exist, and that is fine.
    await this.db.throttleCounter.deleteMany({ where: { key } });
  }

  /**
   * Removes counters that no longer block nor count.
   *
   * Done alongside the write instead of in a scheduled job: writes only happen
   * when someone fails or writes too often, so the cleanup runs at exactly the
   * rate the table grows, and the cutoff uses the `updatedAt` index.
   */
  private async pruneExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_MS);
    await this.db.throttleCounter.deleteMany({
      where: { updatedAt: { lt: cutoff }, blockedUntil: null },
    });
  }
}
