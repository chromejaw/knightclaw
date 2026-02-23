// ─── Guard Phase 3: ADVANCED — Deep Analysis ────────────────────────────────
// State-of-the-art detection: homoglyphs, encoding, multilingual, delimiters.
// Never modifies input. Returns warnings and/or blocks.

import {
    CONFUSABLE_MAP,
    HOMOGLYPH_THRESHOLDS,
    ENCODING_PATTERNS,
    BASE64_BLOB,
    MULTILINGUAL_PATTERNS,
    DELIMITER_PATTERNS,
} from "./patterns.js";

export type AdvancedResult = {
    blocked: boolean;
    reason?: string;
    warnings: string[];
};

/**
 * Phase 3 pipeline: homoglyph → encoding → multilingual → delimiter.
 * Runs on CLEANED text from Phase 1. Read-only — never modifies input.
 */
export function advanced(
    input: string,
    config: {
        homoglyphScore: boolean;
        homoglyphBlockThreshold: number;
        encodingDetect: boolean;
        multilingualScan: boolean;
        delimiterFence: boolean;
    },
): AdvancedResult {
    const warnings: string[] = [];

    // 3.1 Homoglyph Scoring (Unicode TR39 simplified)
    if (config.homoglyphScore) {
        const score = computeHomoglyphScore(input);
        if (score >= config.homoglyphBlockThreshold) {
            return {
                blocked: true,
                reason: `High homoglyph concentration (score: ${score.toFixed(2)}, threshold: ${config.homoglyphBlockThreshold}) — likely visual spoofing attack`,
                warnings,
            };
        }
        if (score >= HOMOGLYPH_THRESHOLDS.warn) {
            warnings.push(`Homoglyph score ${score.toFixed(2)} — monitoring for visual spoofing`);
        }
    }

    // 3.2 Encoding Detection
    if (config.encodingDetect) {
        for (const enc of ENCODING_PATTERNS) {
            if (enc.pattern.test(input)) {
                warnings.push(`Encoding function detected: ${enc.label}`);
            }
        }
        if (BASE64_BLOB.test(input)) {
            warnings.push("Large base64 blob detected — possible encoded payload");
        }
    }

    // 3.3 Multilingual Injection Scan
    if (config.multilingualScan) {
        for (const rule of MULTILINGUAL_PATTERNS) {
            if (rule.pattern.test(input)) {
                return {
                    blocked: true,
                    reason: `Multilingual injection detected (${rule.flag} ${rule.language})`,
                    warnings,
                };
            }
        }
    }

    // 3.4 LLM Delimiter Fence
    if (config.delimiterFence) {
        for (const delim of DELIMITER_PATTERNS) {
            if (delim.pattern.test(input)) {
                return {
                    blocked: true,
                    reason: `Conversation delimiter injection detected (${delim.format} format)`,
                    warnings,
                };
            }
        }
    }

    return { blocked: false, warnings };
}

/**
 * Compute homoglyph score: ratio of confusable non-Latin characters
 * to total alphabetic characters.
 *
 * Uses the CONFUSABLE_MAP (TR39 simplified) to identify characters
 * that look like Latin letters but aren't.
 *
 * Returns 0.0 (clean) to 1.0 (all confusables).
 */
function computeHomoglyphScore(text: string): number {
    let alphaCount = 0;
    let confusableCount = 0;

    for (const char of text) {
        const code = char.codePointAt(0);
        if (code === undefined) continue;

        // Count Latin letters as baseline
        if (
            (code >= 0x41 && code <= 0x5A) || // A-Z
            (code >= 0x61 && code <= 0x7A)    // a-z
        ) {
            alphaCount++;
            continue;
        }

        // Check if this non-Latin char is a confusable
        if (CONFUSABLE_MAP.has(code)) {
            confusableCount++;
            alphaCount++; // count as alpha for ratio
        }
    }

    if (alphaCount === 0) return 0;
    return confusableCount / alphaCount;
}
