// js/firebase-config.js

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqKchHPI1l56fliiuD4sUPGOkCefYOMpo",
  authDomain: "nexapay-23062.firebaseapp.com",
  databaseURL: "https://nexapay-23062-default-rtdb.firebaseio.com",
  projectId: "nexapay-23062",
  storageBucket: "nexapay-23062.appspot.com",
  messagingSenderId: "893795666866",
  appId: "1:893795666866:android:7ff80c3faf47d195d032ab" 
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// For Authentication and Firestore (if used)
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize Firebase Realtime Database
const realtimeDb = firebase.database();
