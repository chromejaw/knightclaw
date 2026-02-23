// ─── Guard Phase 1: CLEAN — Normalize & Sanitize ─────────────────────────────
// Modifies input to a safe canonical form. Always runs first.

import {
  INVISIBLE_CHARS,
  BIDI_CHARS,
  VARIATION_SELECTORS,
  TAG_CHARS,
  CONTROL_CHARS,
  ANSI_ESCAPE,
  CONFUSABLE_MAP,
} from "./patterns.js";

export type CleanResult = {
  output: string;
  blocked: boolean;
  reason?: string;
  modified: boolean;
};

/**
 * Phase 1 pipeline: normalize → strip → length check.
 * Order matters — normalize first so downstream checks work on clean text.
 */
export function clean(
  input: string,
  config: {
    unicodeNormalize: boolean;
    invisibleStrip: boolean;
    controlStrip: boolean;
    newlineNormalize: boolean;
    homoglyphNormalize: boolean;
    maxInputLength: number;
  },
): CleanResult {
  let text = input;
  let modified = false;

  // 1.1 Unicode NFKC Normalization
  if (config.unicodeNormalize) {
    const normalized = text.normalize("NFKC");
    if (normalized !== text) {
      text = normalized;
      modified = true;
    }
  }

  // 1.2 Invisible Character Stripping (zero-width, bidi, variation selectors, tags)
  if (config.invisibleStrip) {
    const stripped = text
      .replace(INVISIBLE_CHARS, "")
      .replace(BIDI_CHARS, "")
      .replace(VARIATION_SELECTORS, "")
      .replace(TAG_CHARS, "");
    if (stripped !== text) {
      text = stripped;
      modified = true;
    }
  }

  // 1.3 Control Character Stripping (ANSI escapes, null bytes, etc.)
  if (config.controlStrip) {
    const stripped = text
      .replace(ANSI_ESCAPE, "")
      .replace(CONTROL_CHARS, "");
    if (stripped !== text) {
      text = stripped;
      modified = true;
    }
  }

  // 1.4 Newline Normalization (\r\n → \n, \r → \n)
  if (config.newlineNormalize) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (normalized !== text) {
      text = normalized;
      modified = true;
    }
  }

  // 1.5 Homoglyph Normalization (Cyrillic -> Latin, etc.)
  if (config.homoglyphNormalize) {
    let normalized = "";
    let hasHomoglyphs = false;

    for (const char of text) {
      const code = char.codePointAt(0);
      if (code !== undefined && CONFUSABLE_MAP.has(code)) {
        normalized += CONFUSABLE_MAP.get(code);
        hasHomoglyphs = true;
      } else {
        normalized += char;
      }
    }

    if (hasHomoglyphs) {
      text = normalized;
      modified = true;
    }
  }

  // 1.6 Length Limit
  if (text.length > config.maxInputLength) {
    return {
      output: text,
      blocked: true,
      reason: `Input too large (${text.length.toLocaleString()} chars, max ${config.maxInputLength.toLocaleString()})`,
      modified,
    };
  }

  return { output: text, blocked: false, modified };
}
