// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKiQvar1lMhiqYL5ZLDh2qMJRjTbyHSA",
  authDomain: "all-hall.firebaseapp.com",
  projectId: "all-hall",
  storageBucket: "all-hall.appspot.com",
  messagingSenderId: "141379512602",
  appId: "1:141379512602:web:83f6f9465564693efa4a43",
  measurementId: "G-QQPRQQJW4L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
