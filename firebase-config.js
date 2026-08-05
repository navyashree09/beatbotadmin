/* ==========================================================================
   BeatBotAdmin - Firebase Configuration & Initializer
   ========================================================================== */

// Firebase Configuration Object from user credentials
const firebaseConfig = {
  apiKey: "AIzaSyBkV2euw3Iac7v3SYwMH2qXh-pyS89Sqk4",
  authDomain: "beatbotadmin.firebaseapp.com",
  projectId: "beatbotadmin",
  storageBucket: "beatbotadmin.firebasestorage.app",
  messagingSenderId: "177855082445",
  appId: "1:177855082445:web:f96217bd35debf4db21e84",
  measurementId: "G-7GGJVG6VTM"
};

// Global variables for Firebase services
let db = null;
let storage = null;
let isFirebaseReady = false;

// Default Taxonomies for Seeding
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

/**
 * Initialize Firebase Application & Firestore/Storage instances
 */
function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      storage = firebase.storage();
      isFirebaseReady = true;
      console.log("BeatBotAdmin: Firebase successfully initialized.");

      // Auto seed taxonomies if empty
      seedDefaultsIfEmpty();
    } else {
      console.warn("BeatBotAdmin: Firebase SDK script not loaded yet.");
    }
  } catch (error) {
    console.error("BeatBotAdmin: Firebase initialization error", error);
  }
}

/**
 * Auto-seed default Categories, Languages, and Countries if Firestore collections are empty
 */
async function seedDefaultsIfEmpty() {
  if (!db) return;
  try {
    // Check & seed categories
    const catSnap = await db.collection("categories").get();
    if (catSnap.empty) {
      const batch = db.batch();
      DEFAULT_CATEGORIES.forEach(cat => {
        const ref = db.collection("categories").doc();
        batch.set(ref, { name: cat, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      console.log("BeatBotAdmin: Seeded default categories.");
    }

    // Check & seed languages
    const langSnap = await db.collection("languages").get();
    if (langSnap.empty) {
      const batch = db.batch();
      DEFAULT_LANGUAGES.forEach(lang => {
        const ref = db.collection("languages").doc();
        batch.set(ref, { name: lang, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      console.log("BeatBotAdmin: Seeded default languages.");
    }

    // Check & seed countries
    const countrySnap = await db.collection("countries").get();
    if (countrySnap.empty) {
      const batch = db.batch();
      DEFAULT_COUNTRIES.forEach(c => {
        const ref = db.collection("countries").doc();
        batch.set(ref, { name: c, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      console.log("BeatBotAdmin: Seeded default countries.");
    }
  } catch (err) {
    console.warn("BeatBotAdmin: Seeding check skipped or permission error", err);
  }
}
