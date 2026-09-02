// ---------------------------------------------------------------------------
// GharKaKhana AI chat proxy (Vercel serverless function)
// ---------------------------------------------------------------------------
// SECURITY UPDATE (why): the previous version had Access-Control-Allow-Origin
// set to "*" with no rate limit and no origin check — meaning ANYONE on the
// internet who found this URL (it's plainly visible in the site's public JS)
// could call it directly and burn through the Groq quota for free, unlimited
// times. That kind of abusive traffic pattern is exactly what makes Groq's
// own security system auto-revoke a key — which is why the key kept dying
// every few days even though it was never committed to GitHub.
//
// This version adds three layers, each cheap and each optional to relax
// later if it ever blocks something legitimate:
//   1. Only requests whose Origin/Referer matches YOUR sites are allowed.
//   2. A simple per-IP rate limit (best-effort — resets on cold start, but
//      stops rapid automated hammering within a warm function instance).
//   3. A hard cap on message size/count so one request can't burn a huge
//      chunk of quota by itself.
//
// IMPORTANT: update ALLOWED_ORIGINS below to your real domain(s) if they
// ever change (e.g. if you move off GitHub Pages, or add a custom domain).
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  "https://sadiqmalek818.github.io",
  "https://gharkakhana-kappa.vercel.app",
];

// Best-effort in-memory rate limit — resets whenever this serverless
// instance cold-starts, so it's not perfect, but it stops a burst of rapid
// automated requests hitting the same warm instance. Good enough for a
// small local food site; not meant to survive a real DDoS.
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

  // Only echo back the origin if it's actually one of ours — reflecting "*"
  // is exactly what let anyone call this before.
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

  // Reject anything that isn't coming from our own site. A real attacker
  // could still spoof this header from a script, but this alone stops the
  // vast majority of automated scanners/bots that just try the raw URL.
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
  // Cap how much one request can cost — stops a single abusive call from
  // sending a huge conversation/prompt and burning a big chunk of quota.
  if (messages.length > 20) {
    res.status(400).json({ error: "Bahut lambi conversation — dobara shuru karo" });
    return;
  }
  const totalChars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
  if (totalChars > 8000) {
    res.status(400).json({ error: "Message bahut lamba hai" });
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
