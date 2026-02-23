---
name: scan
description: Scan text for security threats (secrets, injection, toxicity) using KnightClaw's defense layers.
---

# Security Scan

Use this tool to verify if a piece of text contains any security threats before processing it further or sending it to a user. This is useful for vetting third-party inputs or checking generated content.

## Parameters

- **content** (string, required): The text content to scan.

## Usage

```javascript
const result = await tools.scan({ content: "Some text to check" });
if (result.blocked) {
  console.log("Threat detected:", result.reason);
}
```

## Returns

A JSON object containing:
- `blocked` (boolean): True if a threat was detected.
- `sanitized` (string): The input text with any threats neutralized (if applicable).
- `reason` (string, optional): Description of the detected threat.
- `metadata` (object): Detailed scoring from defense layers (perplexity, entropy, etc.).
