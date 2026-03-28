import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA4gFq7pWNsvFI_KJGLQkOvKwY_Efqw3LY",
  authDomain: "treasury-777.firebaseapp.com",
  projectId: "treasury-777",
  storageBucket: "treasury-777.firebasestorage.app",
  messagingSenderId: "1029157530169",
  appId: "1:1029157530169:web:de6a2a19cfc10285077be8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "(default)");

// Messaging — only available in browsers that support service workers
export const messagingPromise = isSupported().then(ok => ok ? getMessaging(app) : null);

export default app;