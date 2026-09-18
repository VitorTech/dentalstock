-- The attempt counter is no longer specific to login: the write routes use the
-- same table, keyed by prefix ("login:user:", "login:ip:", "write:ip:").
-- Renaming keeps the existing counters, so a deploy does not clear an
-- in-progress block.
ALTER TABLE "LoginThrottle" RENAME TO "ThrottleCounter";
ALTER INDEX "LoginThrottle_pkey" RENAME TO "ThrottleCounter_pkey";
ALTER INDEX "LoginThrottle_updatedAt_idx" RENAME TO "ThrottleCounter_updatedAt_idx";
