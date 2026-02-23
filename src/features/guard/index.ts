// ─── Guard 2.0: Multi-Layer Detection System ─────────────────────────────────
// SOTA prompt injection detection without LLMs.
//
// Pipeline (in execution order):
// 1. CLEAN     -> Normalize input
// 2. Patterns  -> Regex injection scan
// 3. Advanced  -> Homoglyphs, encoding, multilingual, delimiters
// 4. Perplexity Scoring
// 5. Boundary Detection
// 6. Entropy Analysis
// 7. Behavioral Heuristics
// 8. Semantic Detection (Async, embedding-based)
// 9. EGRESS: Output Redaction
//
// ─────────────────────────────────────────────────────────────────────────────

import { logSecurityEvent } from "../logs/index.js";
import { reportBlockEvent } from "../lockdown/index.js";
import type { FeatureStatus } from "../../shared/types.js";
import { clean } from "./clean.js";
import { detect } from "./detect.js";

// Guard 2.0 layers
import { detectPerplexity } from "./layers/perplexity.js";
import { detectBoundary } from "./layers/boundary.js";
import { detectEntropy } from "./layers/entropy.js";
import { detectHeuristics } from "./layers/heuristics.js";
import { detectSemantic, initSemanticLayer } from "./layers/semantic.js";
import { advanced } from "./advanced.js";
import { guardEgress, EgressResult } from "./egress.js";

export { initSemanticLayer, guardEgress };

// ─── Config Type ─────────────────────────────────────────────────────────────

export type GuardConfig = {
  enabled: boolean;
  maxInputLength: number;

  // Phase 1 toggles (Legacy: Clean)
  unicodeNormalize: boolean;
  invisibleStrip: boolean;
  controlStrip: boolean;
  newlineNormalize: boolean;
  homoglyphNormalize: boolean;

  // Guard 2.0 Layers
  patterns: {
    enabled: boolean;
    injection: boolean;
    templates: boolean;
    schemes: boolean;
  };
  egress: {
    enabled: boolean;
    redactSecrets: boolean;
  };
  // Phase 3: Advanced
  advanced: {
    enabled: boolean; // Added: was missing — layer always ran regardless
    homoglyphScore: boolean;
    homoglyphBlockThreshold: number;
    encodingDetect: boolean;
    multilingualScan: boolean;
    delimiterFence: boolean;
  };
  perplexity: { enabled: boolean; threshold: number };
  boundary: { enabled: boolean };
  entropy: { enabled: boolean };
  heuristics: { enabled: boolean; threshold: number };

  // Phase 2
  semantic: { enabled: boolean; threshold: number };
};

// ─── Result Type ─────────────────────────────────────────────────────────────

export type GuardResult = {
  sanitized: string;
  blocked: boolean;
  reason?: string;
  warnings: string[];
  phasesRun: string[];
  layerScores?: Record<string, number>;
};

import fs from "node:fs";
import path from "node:path";

// ─── State ───────────────────────────────────────────────────────────────────

let _config: GuardConfig;
let _stateDir: string;
let _statsFile: string;
let _blocked = 0;
let _allowed = 0;

// ─── Init ────────────────────────────────────────────────────────────────────

export function initGuard(config: GuardConfig, stateDir?: string): void {
  _config = config;

  // Initialize persistence if stateDir provided
  if (stateDir) {
    _stateDir = stateDir;
    _statsFile = path.join(_stateDir, "guard_stats.json");
    try {
      if (fs.existsSync(_statsFile)) {
        const data = JSON.parse(fs.readFileSync(_statsFile, "utf-8"));
        _blocked = data.blocked || 0;
        _allowed = data.allowed || 0;
      }
    } catch (e) {
      console.error("[KnightClaw] Failed to load guard stats:", e);
    }
  }

  // Initialize async layer if enabled
  if (_config.semantic?.enabled) {
    initSemanticLayer().catch(err => console.error("Failed to init semantic layer:", err));
  }
}

function persistStats() {
  if (!_statsFile) return;
  try {
    fs.writeFileSync(_statsFile, JSON.stringify({ blocked: _blocked, allowed: _allowed }), "utf-8");
  } catch (e) {
    console.error("[KnightClaw] Failed to save guard stats:", e);
  }
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Run the full Guard 2.0 pipeline on a message.
 * Returns a Promise<GuardResult> — async due to the semantic layer.
 */
export async function runGuard(content: string): Promise<GuardResult> {
  if (!_config?.enabled) {
    return {
      sanitized: content,
      blocked: false,
      warnings: [],
      phasesRun: [],
    };
  }

  const phasesRun: string[] = [];
  const allWarnings: string[] = [];
  const layerScores: Record<string, number> = {};

  // ── Phase 1: CLEAN (Legacy) ────────────────────────────────────────
  phasesRun.push("clean");
  const cleanResult = clean(content, {
    unicodeNormalize: _config.unicodeNormalize,
    invisibleStrip: _config.invisibleStrip,
    controlStrip: _config.controlStrip,
    newlineNormalize: _config.newlineNormalize,
    homoglyphNormalize: _config.homoglyphNormalize,
    maxInputLength: _config.maxInputLength,
  });

  if (cleanResult.blocked) {
    _blocked++;
    persistStats();
    logSecurityEvent("guard", "warn", "block", cleanResult.reason || "Blocked by sanitization", { input: content.substring(0, 50) });
    return {
      sanitized: cleanResult.output,
      blocked: true,
      reason: cleanResult.reason,
      warnings: allWarnings,
      phasesRun,
      layerScores,
    };
  }

  const sanitized = cleanResult.output;

  // ── Guard 2.0 Layers (Fast Synchronous) ────────────────────────────

  // Layer 1.5: Pattern Scan (Restore Legacy Regex)
  if (_config.patterns?.enabled) {
    phasesRun.push("patterns");
    const res = detect(sanitized, {
      injectionScan: _config.patterns.injection,
      templateBlock: _config.patterns.templates,
      schemeBlock: _config.patterns.schemes,
    });
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
  }

  // Layer: Advanced (Homoglyphs, Encoding, Multilingual, Delimiters)
  // Fix: was `if (_config.advanced)` — always true for objects. Now checks `.enabled`.
  if (_config.advanced?.enabled !== false) {
    phasesRun.push("advanced");
    const res = advanced(sanitized, {
      homoglyphScore: _config.advanced.homoglyphScore,
      homoglyphBlockThreshold: _config.advanced.homoglyphBlockThreshold,
      encodingDetect: _config.advanced.encodingDetect,
      multilingualScan: _config.advanced.multilingualScan,
      delimiterFence: _config.advanced.delimiterFence,
    });
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
    // Accumulate warnings from advanced analysis
    allWarnings.push(...res.warnings);
  }

  // Layer: Perplexity
  if (_config.perplexity?.enabled) {
    phasesRun.push("perplexity");
    const res = detectPerplexity(sanitized, _config.perplexity.threshold);
    layerScores.perplexity = res.score;
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
    if (res.score > _config.perplexity.threshold * 0.8) {
      allWarnings.push(`High perplexity detected (${res.score.toFixed(1)})`);
    }
  }

  // Layer 3: Boundary
  if (_config.boundary?.enabled) {
    phasesRun.push("boundary");
    const res = detectBoundary(sanitized);
    layerScores.boundary = res.score;
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
  }

  // Layer 4: Entropy
  if (_config.entropy?.enabled) {
    phasesRun.push("entropy");
    const res = detectEntropy(sanitized);
    layerScores.entropy = res.score;
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
  }

  // Layer 5: Heuristics
  if (_config.heuristics?.enabled) {
    phasesRun.push("heuristics");
    const res = detectHeuristics(sanitized, _config.heuristics.threshold);
    layerScores.heuristics = res.score;
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
    if (res.score > _config.heuristics.threshold * 0.8) {
      allWarnings.push(`Suspicious behavior score: ${res.score}`);
    }
  }

  // ── Guard 2.0 Layer 1: Semantic (Async) ────────────────────────────
  if (_config.semantic?.enabled) {
    phasesRun.push("semantic");
    const res = await detectSemantic(sanitized, _config.semantic.threshold);
    layerScores.semantic = res.score;
    if (res.blocked) {
      _blocked++;
      persistStats();
      return createBlockResult(sanitized, res.reason!, allWarnings, phasesRun, layerScores);
    }
  }

  // ── All clear ───────────────────────────────────────────────────────
  _allowed++;
  persistStats();
  logSecurityEvent("guard", "info", "allow", "Request passed all checks", { length: content.length });
  return {
    sanitized,
    blocked: false,
    warnings: allWarnings,
    phasesRun,
    layerScores
  };
}

function createBlockResult(
  sanitized: string,
  reason: string,
  warnings: string[],
  phasesRun: string[],
  layerScores: Record<string, number>
): GuardResult {
  logSecurityEvent("guard", "warn", "block", reason, {
    layer: phasesRun[phasesRun.length - 1],
    scores: layerScores,
  });

  // Velocity-Circuit Hook: Notify Lockdown Kill-Switch
  reportBlockEvent(reason);

  return {
    sanitized,
    blocked: true,
    reason,
    warnings,
    phasesRun,
    layerScores
  };
}

/**
 * Run Egress Guard on outgoing messages.
 */
export function runEgressGuard(content: string): EgressResult {
  if (!_config?.enabled || !_config?.egress?.enabled) {
    return { output: content, blocked: false, redacted: false };
  }
  return guardEgress(content, { redactSecrets: _config.egress.redactSecrets });
}

// ─── Status ──────────────────────────────────────────────────────────────────

export function getGuardStatus(): FeatureStatus {
  return {
    name: "guard",
    label: "Guard 2.0",
    icon: "🛡️",
    layer: 1,
    enabled: _config?.enabled ?? false,
    blocked: _blocked,
    allowed: _allowed,
  };
}
