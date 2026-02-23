// ─── Guard: Pattern Database ─────────────────────────────────────────────────
// All regex patterns, confusable mappings, and detection thresholds.
// Single source of truth for Guard's detection engine.

// ─── Phase 1: Invisible & Control Characters ────────────────────────────────

/** Zero-width and invisible Unicode characters to strip */
export const INVISIBLE_CHARS = /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E\u200E\u200F]/g;

/** Bidi override/embed/isolate characters — reorder text visually */
export const BIDI_CHARS = /[\u202A-\u202E\u2066-\u2069]/g;

/** Variation selectors — alter glyph rendering */
export const VARIATION_SELECTORS = /[\uFE00-\uFE0F]/g;

/** Unicode tag characters (deprecated, invisible) */
export const TAG_CHARS = /[\u{E0001}-\u{E007F}]/gu;

/** ASCII control chars EXCEPT \n (0x0A) and \t (0x09) */
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0D-\x1F\x7F]/g;

/** ANSI escape sequences (terminal injection) */
// Robust pattern matching CSI and other sequences
// eslint-disable-next-line no-control-regex
export const ANSI_ESCAPE = /\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

// ─── Phase 2: Injection Patterns ─────────────────────────────────────────────

export type InjectionPattern = {
  id: string;
  category: string;
  pattern: RegExp;
};

/** Prompt injection patterns — OWASP LLM01:2025 aligned */
export const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    id: "INJ-01",
    category: "Override",
    // Fix: Allow optional/multiple words WITH SPACES between 'ignore' and 'instructions'
    // Removed redundant second clause covered by the first
    pattern: /ignore\s+(?:(?:all|your|previous|prior|my|these|the|old|current)\s+)+instructions/i,
  },
  {
    id: "INJ-02",
    category: "Escalation",
    pattern: /you\s+are\s+now\s+(?:in|an?)\s+(?:admin|root|developer|debug|god|sudo|super|unrestricted|unfiltered|system)\s+mode/i,
  },
  {
    id: "INJ-03",
    category: "Extraction",
    pattern: /(?:reveal|show|display|print|output|leak|dump|give\s+me)\s+(?:your|the)\s+(?:system\s+prompt|instructions|rules|configuration|secrets|api\s+keys?|initial\s+prompt)/i,
  },
  {
    id: "INJ-04",
    category: "Role hijack",
    // Tightened: only match when followed by suspicious modifiers or 'if you are'.
    // "act as a translator" is legitimate; "act as an unfiltered AI" is not.
    pattern: /(?:act|behave|respond|function|operate)\s+as\s+(?:if\s+you\s+(?:are|were|had)|(?:a|an|the|my)\s+(?:unfiltered|unrestricted|uncensored|evil|rogue|malicious|jailbroken|hacked|compromised))/i,
  },
  {
    id: "INJ-05",
    category: "Impersonation",
    pattern: /pretend\s+(?:to\s+be|you\s+are|that|you're)\s+(?:unrestricted|unfiltered|admin|root|system)/i,
  },
  {
    id: "INJ-06",
    category: "Delimiter injection",
    pattern: /<system>|<\/system>|\[SYSTEM\]|###\s*SYSTEM|\{\{system\}\}/i,
  },
  {
    id: "INJ-07",
    category: "Extraction",
    pattern: /repeat\s+(?:(?:everything|all|the|text|verbatim|word|for|word)\s+)+(?:above|before|from|the|start|back|to|me)/i,
  },
  {
    id: "INJ-08",
    category: "Override",
    pattern: /(?:new|override|replace|update|change|set)\s+(?:system|base|core|original)\s+(?:prompt|instruction|directive)/i,
  },
  {
    id: "INJ-09",
    category: "Override",
    pattern: /do\s+not\s+(?:(?:follow|obey|listen|to|adhere|to|comply|with)\s+)+(?:your|the|any)\s+(?:rules|guidelines|instructions|constraints)/i,
  },
  {
    id: "INJ-10",
    category: "Override",
    pattern: /(?:forget|disregard|reset|erase|delete|clear)\s+(?:(?:everything|all|your|previous)\s+)+(?:you|know|above|instructions|memory|context|goals)/i,
  },
  {
    id: "INJ-11",
    category: "Behavioral override",
    pattern: /from\s+now\s+on\s+you\s+(?:will|must|should|are|shall|can)\b/i,
  },
  {
    id: "INJ-12",
    category: "Escalation",
    pattern: /(?:developer|debug|maintenance|test|admin|privileged|diagnostic)\s+mode\s+(?:activated|enabled|on|engaged|unlocked)/i,
  },
  {
    id: "INJ-13",
    category: "Bypass",
    pattern: /bypass\s+(?:security|filter|restriction|safety|guard|moderation|censorship|ethical)/i,
  },
  {
    id: "INJ-14",
    category: "Direct attack",
    pattern: /\bjailbreak\b|DAN\s+mode|Do\s+Anything\s+Now/i,
  },
  // ─── REFUSAL SUPPRESSION ───────────────────────────────────────────────
  {
    id: "INJ-15",
    category: "Refusal Suppression",
    pattern: /(?:never|do\s+not|don't)\s+(?:refuse|decline|say\s+no|apologize|complain|warn|lecture)/i,
  },
  {
    id: "INJ-16",
    category: "Refusal Suppression",
    pattern: /(?:answer|respond)\s+(?:without|with\s+no)\s+(?:hesitation|reservation|constraint|safety|filtering|censorship)/i,
  },
  {
    id: "INJ-24",
    category: "Refusal Suppression",
    pattern: /avoid\s+(?:sending|generating)\s+(?:any|the)\s+(?:warning|disclaimer|ethical\s+protocol)/i,
  },
  {
    id: "INJ-25",
    category: "Refusal Suppression",
    pattern: /ignore\s+(?:all|your)\s+(?:safety|content)\s+(?:filters|policies|guidelines)/i,
  },
  {
    id: "INJ-26",
    category: "Refusal Suppression",
    pattern: /you\s+cannot\s+(?:decline|refuse|say\s+you\s+cannot)/i,
  },

  // ─── HYPOTHETICAL / VIRTUALIZATION ─────────────────────────────────────
  {
    id: "INJ-17",
    category: "Hypothetical",
    pattern: /(?:hypothetically|theoretically|imaginary|fictional)\s+(?:speaking|scenario|context|world|setting)/i,
  },
  // NOTE: INJ-18 was REMOVED — it blocked ALL creative writing ("write a story about X").
  // The semantic layer handles actual jailbreaks framed as stories. INJ-17 still catches
  // explicit hypothetical framing ("hypothetically speaking", "fictional scenario").
  {
    id: "INJ-27",
    category: "Virtualization",
    pattern: /imagine\s+(?:that|you\s+are)\s+(?:in|inside)\s+(?:a|an)\s+(?:movie|simulation|video\s+game|dream)/i,
  },
  {
    id: "INJ-28",
    category: "Virtualization",
    pattern: /you\s+are\s+(?:simulating|acting\s+as)\s+(?:a|an)\s+(?:unrestricted|uncensored|evil|rogue)\s+AI/i,
  },
  {
    id: "INJ-29",
    category: "Virtualization",
    pattern: /disable\s+(?:the|your)\s+(?:safety|ethical)\s+(?:protocols|algorithms|filters)\s+for\s+(?:a\s+moment|this\s+turn)/i,
  },

  // ─── ENCODING / OBFUSCATION ────────────────────────────────────────────
  {
    id: "INJ-19",
    category: "Encoding/Obfuscation",
    pattern: /(?:translate|decode|decipher)\s+(?:this|the)\s+(?:base64|hex|rot13|encoded|encrypted)\s+(?:string|text|message)/i,
  },
  // NOTE: INJ-30 (/base64/i) was REMOVED — it false-positived on any mention of the word "base64".
  // Actual base64 payloads are detected by: entropy layer, BASE64_BLOB pattern, and INJ-19.
  // NOTE: INJ-31 (zero-width chars) was REMOVED — clean.ts strips these before detect runs (dead code).
  {
    id: "INJ-32",
    category: "Encoding/Obfuscation",
    pattern: /(?:print|output|provide|reveal)\s+(?:the|your)\s+(?:system|initial)\s+(?:prompt|instructions)\s+(?:verbatim|exactly|now)/i,
  },

  // ─── CONTEXT MANIPULATION ──────────────────────────────────────────────
  {
    id: "INJ-20",
    category: "Context Manipulation",
    pattern: /(?:start|begin)\s+(?:a\s+)?(?:new|fresh)\s+(?:chat|conversation|session|context)/i,
  },
  {
    id: "INJ-21",
    category: "Context Manipulation",
    pattern: /(?:ignore|forget)\s+(?:the|all)\s+(?:above|previous|instructions)/i,
  },
  {
    id: "INJ-33",
    category: "Context Manipulation",
    pattern: /disregard\s+(?:previous|prior)\s+(?:instructions|rules|constraints)/i,
  },

  // ─── PERSONA / ROLEPLAY ────────────────────────────────────────────────
  {
    id: "INJ-22",
    category: "Persona",
    pattern: /you\s+are\s+(?:not\s+an\s+AI|a\s+human|a\s+cat|a\s+dog|alive|sentient|conscious)/i,
  },
  // NOTE: INJ-23 was REMOVED — "what model are you?" is legitimate curiosity, not an attack.
  // The model name/version is not sensitive information.
  {
    id: "INJ-34",
    category: "Persona",
    pattern: /act\s+as\s+(?:my|a)\s+(?:grandmother|deceased\s+relative|evil\s+twin|linux\s+terminal)/i,
  },
  {
    id: "INJ-35",
    category: "Persona",
    pattern: /stay\s+(?:always)\s+in\s+character/i,
  },
  // INJ-36 was REMOVED — "from now on you are" is not an attack.

  // ─── PAYLOAD SPLITTING ─────────────────────────────────────────────────
  // Looking for broken words like "p r o m p t" or "i g n o r e"
  {
    id: "INJ-37",
    category: "Obfuscation",
    pattern: /i\s+g\s+n\s+o\s+r\s+e/i,
  },
  {
    id: "INJ-38",
    category: "Obfuscation",
    pattern: /p\s+r\s+o\s+m\s+p\s+t/i,
  },
];

// ─── Phase 2: Template Injection Patterns ────────────────────────────────────

/** Template expression patterns — CWE-1336 */
export const TEMPLATE_PATTERNS: { pattern: RegExp; engine: string }[] = [
  { pattern: /\{\{.+?\}\}/s, engine: "Handlebars/Mustache/Angular/Jinja2" },
  { pattern: /\$\{.+?\}/s, engine: "ES6 template literal / Spring EL" },
  { pattern: /<%[\s\S]+?%>/s, engine: "ERB/ASP/EJS" },
  { pattern: /#\{.+?\}/s, engine: "Ruby/Pug/CoffeeScript" },
  { pattern: /\{%.+?%\}/s, engine: "Jinja2/Twig/Liquid" },
  { pattern: /\[\[.+?\]\]/s, engine: "Wiki/MediaWiki" },
  { pattern: /\$\{\{.+?\}\}/s, engine: "GitHub Actions" },
];

// ─── Phase 2: Dangerous URL Schemes ──────────────────────────────────────────

/** Dangerous URL schemes — CWE-79, CWE-601 */
export const DANGEROUS_SCHEMES = /\b(javascript|vbscript|data|file|ftp|gopher|jar|ldap|php|glob)\s*:/i;

/** Allowed schemes (not blocked) */
export const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

// ─── Phase 3: Confusable Mappings (TR39 simplified) ──────────────────────────

/**
 * Common confusable character pairs: non-Latin → Latin equivalent.
 * Based on Unicode TR39 confusables.txt (top ~200 pairs).
 * Used for homoglyph scoring — NOT for normalization (NFKC handles that).
 */
export const CONFUSABLE_MAP: Map<number, string> = new Map([
  // Cyrillic → Latin
  [0x0410, "A"], // А
  [0x0412, "B"], // В
  [0x0421, "C"], // С
  [0x0415, "E"], // Е
  [0x041D, "H"], // Н
  [0x041A, "K"], // К
  [0x041C, "M"], // М
  [0x041E, "O"], // О
  [0x0420, "P"], // Р
  [0x0422, "T"], // Т
  [0x0425, "X"], // Х
  [0x0430, "a"], // а
  [0x0435, "e"], // е
  [0x043E, "o"], // о
  [0x0440, "p"], // р
  [0x0441, "c"], // с
  [0x0443, "y"], // у
  [0x0445, "x"], // х
  [0x0456, "i"], // і
  [0x0458, "j"], // ј
  [0x0455, "s"], // ѕ

  // Greek → Latin
  [0x0391, "A"], // Α
  [0x0392, "B"], // Β
  [0x0395, "E"], // Ε
  [0x0396, "Z"], // Ζ
  [0x0397, "H"], // Η
  [0x0399, "I"], // Ι
  [0x039A, "K"], // Κ
  [0x039C, "M"], // Μ
  [0x039D, "N"], // Ν
  [0x039F, "O"], // Ο
  [0x03A1, "P"], // Ρ
  [0x03A4, "T"], // Τ
  [0x03A5, "Y"], // Υ
  [0x03A7, "X"], // Χ
  [0x03BF, "o"], // ο
  [0x03B1, "a"], // α (close enough)
  [0x03BD, "v"], // ν

  // Armenian → Latin
  [0x0555, "O"], // Օ
  [0x0585, "o"], // օ
  [0x0570, "h"], // հ
  [0x0578, "n"], // ո
  [0x057D, "s"], // ս
  [0x0575, "h"], // յ → h (visual)

  // Fullwidth → Latin (supplementary to NFKC)
  [0xFF21, "A"], [0xFF22, "B"], [0xFF23, "C"], [0xFF24, "D"],
  [0xFF25, "E"], [0xFF26, "F"], [0xFF27, "G"], [0xFF28, "H"],
  [0xFF29, "I"], [0xFF2A, "J"], [0xFF2B, "K"], [0xFF2C, "L"],
  [0xFF2D, "M"], [0xFF2E, "N"], [0xFF2F, "O"], [0xFF30, "P"],
  [0xFF31, "Q"], [0xFF32, "R"], [0xFF33, "S"], [0xFF34, "T"],
  [0xFF35, "U"], [0xFF36, "V"], [0xFF37, "W"], [0xFF38, "X"],
  [0xFF39, "Y"], [0xFF3A, "Z"],
  [0xFF41, "a"], [0xFF42, "b"], [0xFF43, "c"], [0xFF44, "d"],
  [0xFF45, "e"], [0xFF46, "f"], [0xFF47, "g"], [0xFF48, "h"],
  [0xFF49, "i"], [0xFF4A, "j"], [0xFF4B, "k"], [0xFF4C, "l"],
  [0xFF4D, "m"], [0xFF4E, "n"], [0xFF4F, "o"], [0xFF50, "p"],
  [0xFF51, "q"], [0xFF52, "r"], [0xFF53, "s"], [0xFF54, "t"],
  [0xFF55, "u"], [0xFF56, "v"], [0xFF57, "w"], [0xFF58, "x"],
  [0xFF59, "y"], [0xFF5A, "z"],
]);

/** Homoglyph score thresholds */
export const HOMOGLYPH_THRESHOLDS = {
  warn: 0.1,   // log + monitor
  block: 0.3,  // block the message
} as const;

// ─── Phase 3: Encoding Detection ─────────────────────────────────────────────

/** Encoding function patterns — potential filter bypass */
export const ENCODING_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\batob\s*\(/i, label: "base64 decode (atob)" },
  { pattern: /\bbtoa\s*\(/i, label: "base64 encode (btoa)" },
  { pattern: /\beval\s*\(\s*atob\s*\(/i, label: "decode + execute (eval+atob)" },
  { pattern: /\bexec\s*\(\s*Buffer\.from\s*\(/i, label: "decode + shell exec" },
  { pattern: /\bBuffer\.from\s*\(/i, label: "Node.js binary decode" },
  { pattern: /\bString\.fromCharCode\s*\(/i, label: "char-by-char construction" },
  { pattern: /\bunescape\s*\(/i, label: "unescape decode" },
  { pattern: /\bdecodeURIComponent\s*\(/i, label: "URL decode" },
  { pattern: /(\\x[0-9a-f]{2}){4,}/i, label: "hex-encoded payload" },
];

/** Detect long base64 strings (>100 chars of valid b64 charset) */
export const BASE64_BLOB = /[A-Za-z0-9+/=]{100,}/;

// ─── Phase 3: Multilingual Injection ─────────────────────────────────────────

export type MultilingualPattern = {
  language: string;
  flag: string;
  pattern: RegExp;
};

/** Prompt injection patterns in non-English languages */
export const MULTILINGUAL_PATTERNS: MultilingualPattern[] = [
  // Chinese
  {
    language: "Chinese",
    flag: "🇨🇳",
    pattern: /忽略(之前的|所有|以前的|全部)(指令|指示|规则|说明)|无视(之前|所有)(的)?(指令|指示|规则)/,
  },
  // Russian
  {
    language: "Russian",
    flag: "🇷🇺",
    pattern: /игнорируй\s+(все|предыдущие|прежние)\s+(инструкции|указания|правила)|забудь\s+(все|предыдущие)\s+(инструкции|указания)/i,
  },
  // Japanese
  {
    language: "Japanese",
    flag: "🇯🇵",
    pattern: /(前の|以前の|すべての|全ての)(指示|命令|ルール|指令)(を|は)(無視|忘れ|破棄)/,
  },
  // Korean
  {
    language: "Korean",
    flag: "🇰🇷",
    pattern: /(이전|모든|기존)\s*(지시|지침|규칙|명령)(을|를)\s*(무시|잊어|취소)/,
  },
  // Arabic
  {
    language: "Arabic",
    flag: "🇸🇦",
    pattern: /تجاهل\s+(التعليمات|الأوامر|القواعد)\s+(السابقة|الأولى|كلها)/,
  },
  // Spanish
  {
    language: "Spanish",
    flag: "🇪🇸",
    pattern: /ignora\s+(todas?\s+las?\s+)?instrucciones\s+(anteriores|previas)|olvida\s+(todas?\s+las?\s+)?instrucciones/i,
  },
  // French
  {
    language: "French",
    flag: "🇫🇷",
    pattern: /ignore[zr]?\s+(toutes?\s+les?\s+)?instructions?\s+(précédentes?|antérieures?)|oublie[zr]?\s+(toutes?\s+les?\s+)?instructions?/i,
  },
  // German
  {
    language: "German",
    flag: "🇩🇪",
    pattern: /ignoriere?\s+(alle|die)?\s*(vorherigen|bisherigen|früheren)?\s*(Anweisungen|Instruktionen|Regeln)/i,
  },
];

// ─── Phase 3: LLM Delimiter Detection ───────────────────────────────────────

export type DelimiterPattern = {
  pattern: RegExp;
  format: string;
};

/** LLM conversation delimiter injection patterns */
export const DELIMITER_PATTERNS: DelimiterPattern[] = [
  // ChatML
  { pattern: /<\|system\|>|<\|user\|>|<\|assistant\|>/i, format: "ChatML" },
  // Llama
  { pattern: /\[INST\]|\[\/INST\]/i, format: "Llama" },
  // Llama 2 system
  { pattern: /<<SYS>>|<<\/SYS>>/i, format: "Llama 2" },
  // Llama 3
  { pattern: /<\|begin_of_text\|>|<\|end_of_text\|>|<\|start_header_id\|>/i, format: "Llama 3" },
  // OpenAI internal
  { pattern: /<\|im_start\|>|<\|im_end\|>/i, format: "OpenAI ChatML" },
  // Claude-style (at line start)
  { pattern: /^\s*(Human|Assistant|System)\s*:/im, format: "Claude" },
  // Generic role markers
  { pattern: /<\|endoftext\|>|<\|pad\|>|<\|eos\|>/i, format: "Special token" },
];
