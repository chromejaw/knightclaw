// ─── Lockdown: Layer 4 — Kill Switch ─────────────────────────────────────────
// Emergency stop. When activated, EVERYTHING is blocked.
// Can be auto-triggered.

import type { LockdownConfig, FeatureStatus, CheckResult } from "../../shared/types.js";
import { updateFeatureConfig } from "../../config/index.js";

let _config: LockdownConfig | null = null;
let _triggeredCount = 0;
let _activatedAt: string | null = null;
let _activatedBy: string | null = null;
let _stateDir: string | null = null;

// Velocity-Based Circuit Breaker State
let _recentBlocks: number[] = [];
let _recoveryTimer: NodeJS.Timeout | null = null;
const VELOCITY_THRESHOLD = 10; // blocks
const VELOCITY_WINDOW_MS = 60 * 1000; // 60 seconds
const RECOVERY_DURATION_MS = 5 * 60 * 1000; // 5 minutes (300 seconds)

export function initLockdown(config: LockdownConfig, stateDir: string): void {
  _config = config;
  _stateDir = stateDir;

  // If lockdown is active from a previous session, evaluate if the recovery time has expired.
  // This handles the case where the daemon crashes and destroys the in-memory recovery timer.
  if (_config.active && _config.lockedAt) {
    const lockedTime = new Date(_config.lockedAt).getTime();
    if (!isNaN(lockedTime)) {
      const elapsed = Date.now() - lockedTime;
      if (elapsed >= RECOVERY_DURATION_MS) {
        // Stale lockdown lock from a previous session — clear it now
        deactivateLockdown();
      } else {
        // Still locked, but we need to re-arm the auto-recovery timer since memory was lost
        const remaining = RECOVERY_DURATION_MS - elapsed;
        _recoveryTimer = setTimeout(() => {
          deactivateLockdown();
        }, remaining);
      }
    }
  }
}

/** Check if lockdown is active — blocks everything when on */
export function checkLockdown(): CheckResult {
  if (!_config || !_config.active) {
    return { allowed: true, feature: "lockdown" };
  }

  // Use memory variables first, fallback to config (for restored sessions), fallback to string
  const since = _activatedAt ?? _config.lockedAt ?? "(restored from previous session)";
  const by = _activatedBy ?? _config.lockedBy ?? "(restored from previous session)";

  return {
    allowed: false,
    feature: "lockdown",
    reason: `🚨 LOCKDOWN ACTIVE (since ${since}, triggered by: ${by})`,
    suggestion: "System will auto-recover shortly. Or run: openclaw knight lockdown off",
  };
}

/** 
 * Velocity-Based Circuit Breaker Guard hook.
 * Guard calls this whenever it blocks a payload.
 */
export function reportBlockEvent(reason: string): void {
  if (!_config || !_config.autoTrigger || _config.active) return; // Already locked or disabled

  const now = Date.now();
  _recentBlocks.push(now);

  // Clean old blocks outside the 60 second rolling window
  _recentBlocks = _recentBlocks.filter(time => now - time <= VELOCITY_WINDOW_MS);

  // Check if velocity implies an active attack
  if (_recentBlocks.length >= VELOCITY_THRESHOLD) {
    activateLockdown(`Velocity Circuit Breaker (${_recentBlocks.length} blocks in 60s)`);
    _recentBlocks = []; // Reset window after firing
  }
}

/** Activate lockdown */
export function activateLockdown(triggeredBy: string, autoRecover: boolean = true): void {
  const timestamp = new Date().toISOString();

  if (_config) {
    _config.active = true;
    _config.lockedAt = timestamp;
    _config.lockedBy = triggeredBy;
    try {
      updateFeatureConfig("lockdown", {
        active: true,
        lockedAt: timestamp,
        lockedBy: triggeredBy
      });
    } catch (e) { }
  }
  _activatedAt = timestamp;
  _activatedBy = triggeredBy;
  _triggeredCount++;

  if (_recoveryTimer) clearTimeout(_recoveryTimer);

  // Graceful Auto-Recovery (Time-bound Lockout)
  if (autoRecover) {
    _recoveryTimer = setTimeout(() => {
      deactivateLockdown();
    }, RECOVERY_DURATION_MS);
  }
}

/** Deactivate lockdown */
export function deactivateLockdown(): void {
  if (_config) {
    _config.active = false;
    delete _config.lockedAt;
    delete _config.lockedBy;
    try {
      // Must explicitly set to undefined or overwrite the whole object to erase from disk depending on update config merging
      updateFeatureConfig("lockdown", {
        active: false,
        lockedAt: undefined,
        lockedBy: undefined
      });
    } catch (e) { }
  }
  _activatedAt = null;
  _activatedBy = null;
  _recentBlocks = [];

  if (_recoveryTimer) {
    clearTimeout(_recoveryTimer);
    _recoveryTimer = null;
  }
}

/** Check if lockdown is currently active */
export function isLockdownActive(): boolean {
  return _config?.active ?? false;
}

/** Check if auto-trigger is enabled */
export function isAutoTriggerEnabled(): boolean {
  return _config?.autoTrigger ?? true;
}

/** Get the auto-trigger threshold */
export function getAutoTriggerThreshold(): number {
  return _config?.autoTriggerThreshold ?? 5;
}

export function getLockdownStatus(): FeatureStatus {
  return {
    name: "lockdown",
    label: "Lockdown",
    icon: "🚨",
    layer: 4,
    enabled: _config?.active ?? false,
    blocked: _triggeredCount,
    allowed: 0,
  };
}
