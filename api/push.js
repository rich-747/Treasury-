// Vercel Serverless Function — proxies FCM push via Legacy HTTP API
// Environment variable required: FCM_SERVER_KEY
// Get it from: Firebase Console → Project Settings → Cloud Messaging → Legacy API → Server key

export default async function handler(req, res) {
  // Allow CORS from same origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { tokens, title, body, icon } = req.body || {};

  if (!tokens || !tokens.length) return res.status(200).json({ success: true, skipped: "no tokens" });

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.error("FCM_SERVER_KEY env var not set");
    return res.status(500).json({ error: "Push not configured" });
  }

  try {
    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${serverKey}`,
      },
      body: JSON.stringify({
        registration_ids: tokens.slice(0, 500), // FCM multicast limit
        notification: {
          title: title || "Treasury",
          body:  body  || "",
          icon:  icon  || "/logo.png",
          badge: "/logo.png",
        },
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title: title || "Treasury",
            body:  body  || "",
            icon:  icon  || "/logo.png",
            badge: "/logo.png",
            requireInteraction: false,
            tag: "treasury-notif",
            renotify: true,
          },
          fcm_options: { link: "/" },
        },
      }),
    });

    const data = await fcmRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("FCM send error:", err);
    return res.status(500).json({ error: err.message });
  }
}
