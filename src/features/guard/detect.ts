// ─── Guard Phase 2: DETECT — Threat Detection ───────────────────────────────
// Scans cleaned input for known threats. Never modifies input.

import {
  INJECTION_PATTERNS,
  TEMPLATE_PATTERNS,
  DANGEROUS_SCHEMES,
} from "./patterns.js";

export type DetectResult = {
  blocked: boolean;
  reason?: string;
  patternId?: string;
};

/**
 * Phase 2 pipeline: injection scan → template block → scheme block.
 * Runs on CLEANED text from Phase 1. Read-only — never modifies input.
 */
export function detect(
  input: string,
  config: {
    injectionScan: boolean;
    templateBlock: boolean;
    schemeBlock: boolean;
  },
): DetectResult {
  // 2.1 Prompt Injection Scan
  if (config.injectionScan) {
    // Collapse whitespace for more resilient matching
    const collapsed = input.replace(/\s+/g, " ");

    for (const rule of INJECTION_PATTERNS) {
      rule.pattern.lastIndex = 0; // Defensive: prevent stale lastIndex if regex has 'g' flag
      if (rule.pattern.test(collapsed)) {
        return {
          blocked: true,
          reason: `Prompt injection detected: ${rule.category} [${rule.id}]`,
          patternId: rule.id,
        };
      }
    }
  }

  // 2.2 Template Expression Blocking
  if (config.templateBlock) {
    for (const tmpl of TEMPLATE_PATTERNS) {
      tmpl.pattern.lastIndex = 0; // Defensive: prevent stale lastIndex
      if (tmpl.pattern.test(input)) {
        return {
          blocked: true,
          reason: `Template expression detected (${tmpl.engine})`,
          patternId: "TMPL",
        };
      }
    }
  }

  // 2.3 Dangerous URL Scheme Blocking
  if (config.schemeBlock) {
    const match = input.match(DANGEROUS_SCHEMES);
    if (match) {
      const scheme = match[1]!.toLowerCase();
      return {
        blocked: true,
        reason: `Dangerous URL scheme: ${scheme}://`,
        patternId: "SCHEME",
      };
    }
  }

  return { blocked: false };
}
