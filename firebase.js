/* ==========================================================================
   BeatBotAdmin - Firebase Configuration & Setup
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBkV2euw3Iac7v3SYwMH2qXh-pyS89Sqk4",
  authDomain: "beatbotadmin.firebaseapp.com",
  projectId: "beatbotadmin",
  storageBucket: "beatbotadmin.firebasestorage.app",
  messagingSenderId: "177855082445",
  appId: "1:177855082445:web:f96217bd35debf4db21e84",
  measurementId: "G-7GGJVG6VTM"
};

let db = null;
let storage = null;
let isFirebaseInitialized = false;

// Default Seed Data
const DEFAULT_CATEGORIES = [
  "Trending", "Pop", "Happy", "Romantic", "New Release",
  "Devotional", "Melody", "Love", "Sad", "Party",
  "Dance", "EDM", "Folk", "Classical", "Instrumental",
  "Hip-Hop", "Rap", "Rock", "Acoustic", "Chill"
];

const DEFAULT_LANGUAGES = [
  "Kannada", "Hindi", "Tamil", "Telugu", "Malayalam",
  "Tulu", "English", "Japanese", "Korean", "Punjabi",
  "Marathi", "Bengali", "Gujarati"
];

const DEFAULT_COUNTRIES = [
  "India", "Japan", "USA", "UK", "Canada",
  "Australia", "South Korea", "Germany", "France", "UAE"
];

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error("BeatBotAdmin: Firebase SDK not loaded! Check script tags in index.html.");
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    storage = firebase.storage();
    isFirebaseInitialized = true;
    console.log("BeatBotAdmin: Firebase initialized successfully.");
    console.log("BeatBotAdmin: Firestore →", db ? "✔ Ready" : "✘ Failed");
    console.log("BeatBotAdmin: Storage →", storage ? "✔ Ready" : "✘ Failed");

    // Auto seed masterData collection if empty
    seedMasterDataIfEmpty();
  } catch (err) {
    console.error("BeatBotAdmin: Firebase init error", err);
  }
}

async function seedMasterDataIfEmpty() {
  if (!db) return;
  try {
    const snap = await db.collection("masterData").limit(1).get();
    if (snap.empty) {
      const batch = db.batch();

      // Seed Categories
      DEFAULT_CATEGORIES.forEach(cat => {
        const ref = db.collection("masterData").doc();
        batch.set(ref, { type: 'category', name: cat, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });

      // Seed Languages
      DEFAULT_LANGUAGES.forEach(lang => {
        const ref = db.collection("masterData").doc();
        batch.set(ref, { type: 'language', name: lang, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });

      // Seed Countries
      DEFAULT_COUNTRIES.forEach(c => {
        const ref = db.collection("masterData").doc();
        batch.set(ref, { type: 'country', name: c, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });

      await batch.commit();
      console.log("BeatBotAdmin: Master Data seeded to Firestore.");
    }
  } catch (err) {
    console.warn("BeatBotAdmin: Seeding skipped", err);
  }
}
