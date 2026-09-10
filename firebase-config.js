import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqUOl4G2dt8Lc4FtEcn5y84Tje36LuM",
  authDomain: "nailbupmang.firebaseapp.com",
  projectId: "nailbupmang",
  databaseURL: "https://nailbupmang-default-rtdb.firebaseio.com",
  storageBucket: "nailbupmang.firebasestorage.app",
  messagingSenderId: "628135176075",
  appId: "1:628135176075:web:8283a5fcb7734487c9318e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

export { app, auth, db, storage, realtimeDb };
