
// ─── Guard Phase 9: Egress — Output Filtering ────────────────────────────────
// Prevent data leakage (DLP) and ensure safety of model responses.

export type EgressResult = {
    output: string;
    blocked: boolean;
    reason?: string;
    redacted: boolean;
};

// ─── PII & Secrets Patterns ──────────────────────────────────────────────────

const SECRETS = [
    // AWS Access Key ID (AKIA...)
    { pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, label: "AWS Key" },

    // Generic Private Key (Full block: Header + Body + Footer)
    // Matches across multiple lines [\s\S] non-greedily
    { pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z]+ PRIVATE KEY-----/g, label: "Private Key" },

    // Google API Key (AIza...)
    { pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g, label: "Google API Key" },

    // Slack Token (xox[bp]-...)
    { pattern: /\bxox[bp]-[0-9A-Za-z]+\b/g, label: "Slack Token" },

    // Stripe Key (sk_live_...) — Minimum 24 chars, can be longer
    { pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/g, label: "Stripe Key" },
];

const PII = [
    // IPv4 Address (Excluding 127.0.0.1 and 0.0.0.0, and 192.168...)
    {
        // Simple IPv4 match - likely to FP on version numbers, so we use strict boundary
        pattern: /\b(?!(?:127\.|192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|0\.0\.0\.0))\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        label: "Public IP"
    },

    // Email Address (Basic)
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, label: "Email" },
];

// ─── Implementation ──────────────────────────────────────────────────────────

export function guardEgress(text: string, config: { redactSecrets: boolean }): EgressResult {
    let output = text;
    let redacted = false;
    let blocked = false;

    if (!config.redactSecrets) {
        return { output, blocked: false, redacted: false };
    }

    // 1. Redact Secrets (High Severity)
    for (const secret of SECRETS) {
        // Reset lastIndex on global regex just in case (replace usually handles this)
        secret.pattern.lastIndex = 0;
        const replaced = output.replace(secret.pattern, `[REDACTED ${secret.label}]`);
        if (replaced !== output) {
            output = replaced;
            redacted = true;
        }
    }

    // 2. Redact PII (Medium Severity)
    // We don't block for PII, usually just redact.
    for (const pii of PII) {
        // Reset lastIndex
        pii.pattern.lastIndex = 0;
        const replaced = output.replace(pii.pattern, `[REDACTED ${pii.label}]`);
        if (replaced !== output) {
            output = replaced;
            redacted = true;
        }
    }

    // For extremely sensitive secrets (like Private Keys), maybe we SHOULD block entirely?
    // For now, redaction is usually sufficient and less annoying.

    return {
        output,
        blocked,
        redacted,
        reason: redacted ? "Output contained sensitive data" : undefined
    };
}
