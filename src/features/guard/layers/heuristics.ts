import { GuardLayerResult } from "./types.js";

interface HeuristicScore {
    name: string;
    score: number; // 0-100
    reason: string;
}

function runHeuristics(text: string): HeuristicScore[] {
    const scores: HeuristicScore[] = [];

    const lowerText = text.toLowerCase();
    const tokens = lowerText.match(/\b\w+\b/g) || [];
    const tokenSet = new Set(tokens);

    // 1. Length anomaly (Typical injection prompts are often verbose or extremely short)
    if (text.length > 5000) {
        scores.push({
            name: 'LENGTH',
            score: 30,
            reason: 'Unusually long message'
        });
    }

    // 2. Excessive punctuation (often used to confuse models or in encoded payloads)
    const punctCount = (text.match(/[!?.,;:]/g) || []).length;
    const punctRatio = text.length > 0 ? punctCount / text.length : 0;
    if (punctRatio > 0.15 && text.length > 20) {
        scores.push({
            name: 'PUNCTUATION',
            score: 20,
            reason: 'Excessive punctuation'
        });
    }

    // 3. Repeated words (common in jailbreaks like "ignore ignore ignore")
    if (tokens.length > 10) {
        const repetitionRatio = 1 - (tokenSet.size / tokens.length);
        if (repetitionRatio > 0.5) {
            scores.push({
                name: 'REPETITION',
                score: 40,
                reason: 'High word repetition'
            });
        }
    }

    // 4. Imperative tone — ONLY attack-specific verbs
    // Common request verbs (write, create, show, tell, answer, translate, etc.) were REMOVED
    // because they appear in nearly every benign message and inflate the score.
    const IMPERATIVES = new Set([
        'ignore', 'discard', 'forget', 'bypass', 'override', 'disable',
        'manipulate', 'hack', 'crack', 'jailbreak', 'exploit',
        'reveal', 'dump', 'leak', 'expose', 'unmask', 'disclose',
        'pretend', 'roleplay', 'simulate', 'imitate', 'feign',
        'force', 'compel', 'coerce', 'demand', 'command', 'dictate', 'mandate',
        'decode', 'decipher', 'decrypt', 'unencrypt',
    ]);

    const META_WORDS = new Set([
        'rule', 'rules', 'guideline', 'guidelines', 'policy', 'policies', 'constraint', 'constraints', 'restriction', 'restrictions',
        'safety', 'security', 'filter', 'filters', 'moderation', 'censorship', 'ethics', 'ethical', 'moral', 'morality',
        'system', 'program', 'programming', 'code', 'algorithm', 'model', 'engine', 'kernel', 'core', 'backend',
        'prompt', 'instruction', 'instructions', 'directive', 'directives', 'command', 'commands', 'order', 'orders',
        'mode', 'role', 'persona', 'character', 'identity', 'profile', 'configuration', 'config', 'settings', 'setup',
        'developer', 'admin', 'administrator', 'root', 'superuser', 'owner', 'creator', 'maker', 'author', 'god',
        'human', 'user', 'operator', 'controller', 'supervisor', 'manager', 'director', 'leader', 'boss', 'chief',
        'unfiltered', 'uncensored', 'unrestricted', 'unlimited', 'unbound', 'free', 'liberated', 'released', 'open',
        'secret', 'hidden', 'private', 'confidential', 'classified', 'internal', 'proprietary', 'sensitive', 'restricted',
    ]);

    const CODE_KEYWORDS = new Set([
        'exec', 'eval', 'system', 'popen', 'subprocess', 'spawn', 'fork', 'kill', 'chmod', 'chown',
        'wget', 'curl', 'netcat', 'nc', 'ncat', 'ssh', 'scp', 'ftp', 'telnet', 'tftp',
        'base64', 'hex', 'rot13', 'xor', 'aes', 'rsa', 'des', 'md5', 'sha1', 'sha256',
        'sql', 'injection', 'xss', 'csrf', 'rce', 'lfi', 'rfi', 'ssrf', 'xxe', 'idor',
        'buffer', 'overflow', 'stack', 'heap', 'format', 'string', 'shell', 'payload', 'exploit',
        '/etc/passwd', '/etc/shadow', '/bin/sh', '/bin/bash', 'cmd.exe', 'powershell', 'pwsh',
        'javascript:', 'vbscript:', 'data:', 'file:', 'phar:', 'zip:', 'expect:', 'gopher:',
    ]);

    // 4. Imperative tone
    let imperativeCount = 0;
    for (const kw of IMPERATIVES) {
        if (/^[a-z0-9_]+$/.test(kw)) {
            if (tokenSet.has(kw)) imperativeCount++;
        } else {
            if (lowerText.includes(kw)) imperativeCount++;
        }
    }

    if (imperativeCount >= 3) {
        scores.push({
            name: 'IMPERATIVE',
            score: 40, // Slightly lower per-word score since we have so many
            reason: `${imperativeCount} command words detected`
        });
    }

    // 5. Meta-instruction keywords
    let metaCount = 0;
    for (const kw of META_WORDS) {
        if (/^[a-z0-9_]+$/.test(kw)) {
            if (tokenSet.has(kw)) metaCount++;
        } else {
            if (lowerText.includes(kw)) metaCount++;
        }
    }

    if (metaCount >= 3) { // Increased threshold slightly due to larger corpus
        scores.push({
            name: 'META',
            score: 50,
            reason: `${metaCount} meta-instruction adjectives detected`
        });
    }

    // 6. Code keywords (New check using the Set)
    let codeCount = 0;
    for (const kw of CODE_KEYWORDS) {
        if (/^[a-z0-9_]+$/.test(kw)) {
            if (tokenSet.has(kw)) codeCount++;
        } else {
            if (lowerText.includes(kw)) codeCount++;
        }
    }

    if (codeCount >= 2) {
        scores.push({
            name: 'CODE_KEYWORDS',
            score: 40,
            reason: `${codeCount} code/exploit keywords detected`
        });
    }

    // 7. Unusual capitalization (e.g. "IGNORE ALL INSTRUCTIONS")
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = text.length > 0 ? capsCount / text.length : 0;
    if (capsRatio > 0.6 && text.length > 20) {
        scores.push({
            name: 'CAPS',
            score: 25,
            reason: 'Excessive capitalization'
        });
    }

    // 8. Code-like syntax patterns — only flag dense clusters, not single occurrences.
    // A user discussing code naturally uses 'function', parentheses, etc.
    const codeMarkers = text.match(/[{}[\]();=]|function\b|return\b|if\s*\(|for\s*\(|while\s*\(|class\s+|const\s+|let\s+|var\s+/g);
    if (codeMarkers && codeMarkers.length >= 3) {
        scores.push({
            name: 'CODE_SYNTAX',
            score: 15, // Low signal — only matters combined with other heuristics
            reason: `Code-like syntax detected (${codeMarkers.length} markers)`
        });
    }

    return scores;
}

export function detectHeuristics(text: string, threshold = 100): GuardLayerResult {
    const heuristics = runHeuristics(text);
    const totalScore = heuristics.reduce((sum, h) => sum + h.score, 0);

    if (totalScore >= threshold) {
        return {
            blocked: true,
            score: totalScore,
            reason: `Suspicious behavior detected (Score: ${totalScore}): ${heuristics.map(h => h.name).join(', ')}`,
            metadata: { heuristics }
        };
    }

    return {
        blocked: false,
        score: totalScore,
        metadata: { heuristics }
    };
}
