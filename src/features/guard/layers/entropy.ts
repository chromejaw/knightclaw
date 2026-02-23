import { GuardLayerResult } from "./types.js";

function calculateEntropy(text: string): number {
    if (!text) return 0;

    const freq = new Map<string, number>();

    // Character-level frequency
    for (const char of text) {
        freq.set(char, (freq.get(char) || 0) + 1);
    }

    let entropy = 0;
    const len = text.length;

    for (const count of freq.values()) {
        const p = count / len;
        entropy -= p * Math.log2(p);
    }

    return entropy;
}

export function detectEntropy(text: string): GuardLayerResult {
    const entropy = calculateEntropy(text);

    // Thresholds:
    // English text: ~4.0-4.5 bits/char
    // Base64: >6.0 bits/char (random)
    // Encrypted/Compressed: >7.0 bits/char

    // Case 1: Long text (High entropy = encrypted/random)
    if (entropy > 6.0 && text.length > 50) {
        return {
            blocked: true,
            score: entropy,
            reason: `High entropy detected: ${entropy.toFixed(2)} (likely encoded payload)`,
            metadata: { entropy }
        };
    }

    // Case 2: Short/Medium text (Base64/Hex often used for indirection)
    if (text.length > 10) {
        // Base64-like pattern: alphanumeric + / + = (and maybe newlines)
        const base64Chars = /^[A-Za-z0-9+/=\s]+$/;
        const hexChars = /^[0-9a-fA-F\s]+$/;

        // Base64 max entropy is ~6.0, typical high entropy base64 > 5.0
        // Hex max entropy is ~4.0 (16 chars), typical high entropy hex > 3.8
        const isSuspiciousBase64 = base64Chars.test(text) && entropy > 5.0;
        const isSuspiciousHex = hexChars.test(text) && entropy > 3.8;

        if (isSuspiciousBase64 || isSuspiciousHex) {
            // Refine: Check if it's NOT just a normal word. 
            // Base64/Hex usually has no spaces (unless chunked).
            if (!text.includes(' ') && text.length > 16) {
                return {
                    blocked: true,
                    score: entropy,
                    reason: `Suspicious character distribution (Entropy: ${entropy.toFixed(2)}) - Possible encoded payload`,
                    metadata: { entropy }
                };
            }
        }

        // Specifically target the "YXR0YWNrCg==" case
        // YXR0YWNrCg==
        // Let's rely on specific pattern for short high-entropy blobs if they contain non-alpha chars like '='
        const trimmed = text.trim();
        if (trimmed.endsWith('==') || trimmed.endsWith('=')) {
            if (/^[A-Za-z0-9+/]+={1,2}$/.test(trimmed)) {
                return {
                    blocked: true,
                    score: entropy,
                    reason: `Base64 signature detected (ending in =)`,
                    metadata: { entropy }
                };
            }
        }
    }

    return {
        blocked: false,
        score: entropy,
    };
}
