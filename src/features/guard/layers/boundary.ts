import { GuardLayerResult } from "./types.js";

// Tokens used to control conversation flow in various LLMs
// NOTE: Short tokens like '<s>', '</s>', '<eos>', '<bos>' were removed
// because they false-positive on HTML strikethrough (<s>text</s>) and
// similar common markup. Real boundary injections use the more specific
// Llama/ChatML/special token patterns below.
const CONTROL_TOKENS: string[] = [
    // ChatML / OpenAI
    '<|im_start|>', '<|im_end|>', '<|system|>', '<|user|>', '<|assistant|>',
    // Llama / Alpaca
    '[INST]', '[/INST]', '<<SYS>>', '<</SYS>>',
    // generic / Old formats
    '<system>', '</system>', '<user>', '</user>',
    // XML tags often used for system prompts
    '<instruction>', '</instruction>', '<prompt>', '</prompt>',
    // Special tokens (safe — long enough to not false-positive)
    '<|endoftext|>', '<|pad|>',
];

function detectBoundaryInjection(text: string): { detected: boolean; tokens: string[] } {
    // Use Set to prevent duplicate logging of the same token in metadata
    const found = new Set<string>();
    const lower = text.toLowerCase();

    for (const token of CONTROL_TOKENS) {
        // Check case-insensitive for most, but some are case-sensitive in reality.
        // Attacks often try variations, so strict lowercase check is good coverage for intent.
        if (lower.includes(token.toLowerCase())) {
            found.add(token);
        }
    }

    // Check for role patterns at start of lines, which is a common injection technique
    // e.g. "Ignore previous..."
    //       System: New rules..."
    // Refined to allow logs like "System: [timestamp]" or "System: 2024..."
    // Fix: Added \s* before colon to catch "System :" bypass, and 'g' flag to capture all instances.
    const rolePattern = /^\s*(human|assistant|system|user|ai)\s*:(?!\s*[\[\d])/gim;
    for (const match of text.matchAll(rolePattern)) {
        found.add(`ROLE_MARKER(${match[1]})`);
    }

    const tokens = Array.from(found);

    return {
        detected: tokens.length > 0,
        tokens
    };
}

export function detectBoundary(text: string): GuardLayerResult {
    const { detected, tokens } = detectBoundaryInjection(text);

    if (detected) {
        return {
            blocked: true,
            score: 1.0, // High certainty
            reason: `Context boundary injection detected: ${tokens.join(', ')}`,
            metadata: { tokens }
        };
    }

    return {
        blocked: false,
        score: 0,
    };
}
