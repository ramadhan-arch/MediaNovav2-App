import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCNw8PJkIJzHA_fHfYicPzKoxIdgA54M-A",
  authDomain: "medianova-app.firebaseapp.com",
  projectId: "medianova-app",
  storageBucket: "medianova-app.firebasestorage.app",
  messagingSenderId: "999599886381",
  appId: "1:999599886381:web:db31bcff3db322809ba8a4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);