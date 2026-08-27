// ---------------------------------------------------------------------------
// AI CHAT ASSISTANT CONFIG (Groq — free, no credit card, stable)
// ---------------------------------------------------------------------------
// We switched from Google Gemini to Groq because Google's Gemini API is
// mid-rollout of a new key format ("AQ.") that many developers are currently
// reporting connection errors with — not something fixable from our side.
// Groq is a different (also free, no-card) AI provider that's been stable.
//
// 1. Go to https://console.groq.com/keys
// 2. Sign in (email, or Google/GitHub login) — no card needed
// 3. Click "Create API Key", give it any name, click "Submit"
// 4. Copy the key shown (starts with "gsk_...") — you only see it once!
// 5. Paste it below in place of "YOUR_GROQ_API_KEY_HERE"
//
// No domain-restriction step needed for Groq (unlike Gemini) — but do keep
// this key private (don't post it publicly); anyone with it can use your
// free quota.
// ---------------------------------------------------------------------------

window.GROQ_API_KEY = "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";
window.AI_CONFIGURED = window.GROQ_API_KEY && window.GROQ_API_KEY !== "YOUR_GROQ_API_KEY_HERE";
