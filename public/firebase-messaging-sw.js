// Firebase Messaging Service Worker — handles background push notifications
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA4gFq7pWNsvFI_KJGLQkOvKwY_Efqw3LY",
  authDomain: "treasury-777.firebaseapp.com",
  projectId: "treasury-777",
  storageBucket: "treasury-777.firebasestorage.app",
  messagingSenderId: "1029157530169",
  appId: "1:1029157530169:web:de6a2a19cfc10285077be8"
});

const messaging = firebase.messaging();

// Handle messages received while app is in the background
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || "Treasury";
  const body  = payload.notification?.body  || "";
  self.registration.showNotification(title, {
    body,
    icon:  "/logo.png",
    badge: "/logo.png",
    tag:   "treasury-notif",
    renotify: true,
    data: payload.data || {},
  });
});

// Open / focus the app when notification is clicked
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
