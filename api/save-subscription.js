// ---------------------------------------------------------------------------
// GharKaKhana — Save Push Subscription (Vercel serverless function)
// ---------------------------------------------------------------------------
// Save this as api/save-subscription.js (same folder as api/chat.js and
// api/send-notification.js). Needs the same FIREBASE_SERVICE_ACCOUNT env var
// as send-notification.js — see that file's comment for full setup steps.
// ---------------------------------------------------------------------------

const admin = require("firebase-admin");

const ALLOWED_ORIGINS = [
  "https://sadiqmalek818.github.io",
  "https://gharkakhana-kappa.vercel.app",
];

// Same defensive init pattern as send-notification.js — see that file's
// comment for why this is wrapped instead of run loose at module load.
function initFirebase(){
  if(admin.apps.length) return;
  if(!process.env.FIREBASE_SERVICE_ACCOUNT){
    throw new Error("FIREBASE_SERVICE_ACCOUNT env variable set nahi hai");
  }
  let serviceAccount;
  try{
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch(e){
    throw new Error("FIREBASE_SERVICE_ACCOUNT valid JSON nahi hai — Vercel mein value dobara paste karo: " + e.message);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST use karo" }); return; }

  const { subscription, customerPhone } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "subscription chahiye" });
    return;
  }

  try {
    initFirebase();
    const db = admin.firestore();
    const docId = Buffer.from(subscription.endpoint).toString("base64").slice(-120);
    await db.collection("pushSubscriptions").doc(docId).set({
      subscription,
      customerPhone: customerPhone || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-subscription failed:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
}
