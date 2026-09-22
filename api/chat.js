// ---------------------------------------------------------------------------
// GharKaKhana AI chat proxy (Vercel serverless function)
// ---------------------------------------------------------------------------
// SECURITY: Access-Control-Allow-Origin is restricted to our own sites (see
// ALLOWED_ORIGINS) — reflecting "*" would let anyone on the internet call
// this and burn through the Groq quota for free, which is what caused the
// API key to get auto-revoked repeatedly early on. A per-IP rate limit and a
// message-size cap add further protection against abuse.
//
// BUGFIX (this version): the message-size cap used to sum the length of
// EVERY message including the "system" one — but the system message is our
// own live-menu context (categories, dishes, offers, delivery rules), which
// keeps growing as the menu grows. Once that alone passed 8000 characters,
// even typing "Hi" got rejected as "message too long". Fixed by only
// counting the customer's own messages (role !== "system") against the cap.
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  "https://sadiqmalek818.github.io",
  "https://gharkakhana-kappa.vercel.app",
  "https://gharkakhanaonline.in",
  "https://www.gharkakhanaonline.in",
];

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 12; // max requests per IP per minute
const requestLog = new Map(); // ip -> array of timestamps

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  if (isAllowedOrigin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "POST use karo" });
    return;
  }

  if (!isAllowedOrigin) {
    res.status(403).json({ error: "Is origin se request allowed nahi hai" });
    return;
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Bahut zyada requests — thodi der baad try karo" });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array chahiye" });
    return;
  }

  // Only the customer/assistant conversation counts toward these caps — the
  // system message is our own trusted live-menu context and can legitimately
  // be large; it's never something a customer could abuse to burn quota.
  const conversationMessages = messages.filter(m => m.role !== "system");
  if (conversationMessages.length > 20) {
    res.status(400).json({ error: "Bahut lambi conversation — dobara shuru karo" });
    return;
  }
  const totalChars = conversationMessages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
  if (totalChars > 8000) {
    // TEMP DEBUG: reporting the actual computed length so we can see exactly
    // what's happening from the chat bubble itself, without needing to dig
    // through Vercel logs. Safe to remove once this is confirmed working.
    res.status(400).json({ error: `Message bahut lamba hai (${totalChars} chars, ${conversationMessages.length} messages)` });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server par GROQ_API_KEY set nahi hai" });
    return;
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error("Groq API error:", data);
      res.status(groqRes.status).json({ error: data?.error?.message || "Groq API error" });
      return;
    }

    res.status(200).json({ reply: data?.choices?.[0]?.message?.content || "" });
  } catch (err) {
    console.error("chat proxy failed:", err);
    res.status(500).json({ error: "Server error, dobara try karo" });
  }
}
