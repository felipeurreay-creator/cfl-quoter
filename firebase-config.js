// Firebase Configuration for CFL Quoter
const firebaseConfig = {
    apiKey: "AIzaSyB5tP54enozY_LJtfYkvxOHulITPWQAfnI",
    authDomain: "gen-lang-client-0463371737.firebaseapp.com",
    projectId: "gen-lang-client-0463371737",
    storageBucket: "gen-lang-client-0463371737.firebasestorage.app",
    messagingSenderId: "650139156428",
    appId: "1:650139156428:web:9cdc6a56d831dd46082769"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log("✅ Firebase connected to project:", firebaseConfig.projectId);
