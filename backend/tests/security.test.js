import { describe, it, expect } from 'vitest';
import { syncService } from '../services/syncService';
import { SCORING_CONFIG } from '../config/scoringConfig';

describe('Security, Anti-Gaming & Cooldown Enforcement', () => {
  it('enforces manual sync cooldown window', () => {
    // Just synced 1 minute ago
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const check = syncService.isSyncOnCooldown(oneMinAgo);
    expect(check.onCooldown).toBe(true);
    expect(check.remainingSeconds).toBeGreaterThan(0);
    expect(check.remainingSeconds).toBeLessThanOrEqual(
      SCORING_CONFIG.freshness.cooldown_minutes_manual_sync * 60
    );
  });

  it('allows sync after cooldown duration has elapsed', () => {
    // Synced 10 minutes ago (exceeds 5 min cooldown)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const check = syncService.isSyncOnCooldown(tenMinAgo);
    expect(check.onCooldown).toBe(false);
  });

  it('allows initial sync if never synced before', () => {
    const check = syncService.isSyncOnCooldown(null);
    expect(check.onCooldown).toBe(false);
  });
});
