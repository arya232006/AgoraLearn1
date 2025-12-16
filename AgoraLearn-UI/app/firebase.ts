// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbj5jAL21VvwDC1oCrry_Bv-7yLjtNFs8",
  authDomain: "agoralearn-fcede.firebaseapp.com",
  projectId: "agoralearn-fcede",
  storageBucket: "agoralearn-fcede.firebasestorage.app",
  messagingSenderId: "83632439072",
  appId: "1:83632439072:web:db11aa4186e6d963206145",
  measurementId: "G-3WJ6SG8YBT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app)