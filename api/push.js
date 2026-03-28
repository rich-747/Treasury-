// Vercel Serverless Function — FCM v1 API (modern, no legacy key needed)
// Env var required: GOOGLE_SERVICE_ACCOUNT  (full JSON content of service account key)
// Project ID:       treasury-777

import { createSign } from "node:crypto";

const PROJECT_ID = "treasury-777";

// ── Build a signed JWT and exchange it for a Google OAuth access token ──
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);

  const b64url = str =>
    Buffer.from(str).toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const toSign = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(toSign);
  const sig = signer.sign(sa.private_key, "base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${toSign}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await tokenRes.json();
  if (!data.access_token) throw new Error("Token exchange failed: " + JSON.stringify(data));
  return data.access_token;
}

// ── Send one FCM v1 message to a single token ──
async function sendOne(accessToken, token, title, body) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: title || "Treasury", body: body || "" },
          webpush: {
            notification: {
              icon:  "/logo.png",
              badge: "/logo.png",
              tag:   "treasury-notif",
              renotify: true,
            },
            fcm_options: { link: "/" },
          },
        },
      }),
    }
  );
  return res.json();
}

// ── Main handler ──
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const { tokens, title, body } = req.body || {};
  if (!tokens?.length) return res.status(200).json({ success: true, skipped: "no tokens" });

  const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!saRaw) {
    console.error("GOOGLE_SERVICE_ACCOUNT env var not set");
    return res.status(500).json({ error: "Push not configured" });
  }

  try {
    const sa = JSON.parse(saRaw);
    const accessToken = await getAccessToken(sa);

    // Send to all tokens in parallel (FCM v1 is per-token)
    const results = await Promise.allSettled(
      tokens.map(tok => sendOne(accessToken, tok, title, body))
    );

    return res.status(200).json({ sent: results.length, results });
  } catch (err) {
    console.error("FCM v1 push error:", err);
    return res.status(500).json({ error: err.message });
  }
}
