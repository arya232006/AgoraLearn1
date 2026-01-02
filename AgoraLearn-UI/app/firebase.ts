// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6JGSMhrOGaCqPR0vYplpDVz5p9VUl0i0",
  authDomain: "agoralearn-774e9.firebaseapp.com",
  projectId: "agoralearn-774e9",
  storageBucket: "agoralearn-774e9.firebasestorage.app",
  messagingSenderId: "22428297052",
  appId: "1:22428297052:web:4e71c37175aa37dace0399",
  measurementId: "G-VN23SS9H3X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
export const auth = getAuth(app)