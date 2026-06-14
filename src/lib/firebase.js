import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyChr3m4mnVkYwVm5ZnC8BhEAqWO74rR5W4",
  authDomain: "casey-genmedia.firebaseapp.com",
  projectId: "casey-genmedia",
  storageBucket: "casey-genmedia.firebasestorage.app",
  messagingSenderId: "128509221012",
  appId: "1:128509221012:web:5bd73a95aea4b7a2837c81",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
