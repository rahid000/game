// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDgZOUXkABQbIEFlRUyljDKLJPl2OWfZnc",
  authDomain: "game-c31f6.firebaseapp.com",
  projectId: "game-c31f6",
  storageBucket: "game-c31f6.appspot.com",
  messagingSenderId: "760266959396",
  appId: "1:760266959396:web:0e10fa3de2d530df0046b1",
  measurementId: "G-CDX2E2VX6L"
};

// Initialize with fallback values for robustness
let appInstance: FirebaseApp = { name: "fallback-initial", options: {}, automaticDataCollectionEnabled: false } as FirebaseApp;
let authInstance: Auth = { currentUser: null } as unknown as Auth; // More robust fallback
let dbInstance: Firestore = {} as Firestore; // Fallback to an empty object
let storageInstance: FirebaseStorage = {} as FirebaseStorage; // Fallback to an empty object

try {
  // Check for essential config values before initializing
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_PLACEHOLDER_IF_ANY" && firebaseConfig.projectId) {
    if (!getApps().length) {
      console.log("DEBUG: Initializing Firebase app for the first time...");
      appInstance = initializeApp(firebaseConfig);
      console.log("DEBUG: Firebase app initialized successfully:", appInstance.name);
    } else {
      appInstance = getApps()[0];
      console.log("DEBUG: Using existing Firebase app:", appInstance.name);
    }
  } else {
    console.warn("DEBUG: Firebase config is not set, is incomplete, or is still using placeholder values. Firebase will use fallback instances.");
    // If there's an existing app (e.g., from a previous hot reload with bad config), try to use it,
    // otherwise stick to the initial `fallback-initial`.
    if (getApps().length) {
        const existingApp = getApps()[0];
        // Only use existing app if it looks somewhat configured, otherwise stick to `fallback-initial`
        if (existingApp && existingApp.name !== "fallback-initial" && (existingApp.options.apiKey || existingApp.options.projectId)) {
             appInstance = existingApp;
        } else if (existingApp && existingApp.name !== "fallback-initial") {
            // Existing app is found but looks misconfigured, log it but still try to use it if it's not the initial fallback
            console.warn("DEBUG: An existing Firebase app was found but seems misconfigured. Proceeding with caution or using fallback:", existingApp.name);
            appInstance = existingApp; // Potentially problematic, but better than re-init with bad config
        }
    }
  }

  // Check if appInstance is properly initialized before getting services
  // The check for appInstance.name against "fallback-initial" and appInstance.options.apiKey is crucial
  if (appInstance && appInstance.name !== "fallback-initial" && appInstance.options.apiKey && appInstance.options.projectId) {
    console.log("DEBUG: Getting Firebase services (Auth, Firestore, Storage)...");
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
    console.log("DEBUG: Firebase services obtained successfully.");
  } else {
    // This block will be hit if config was missing/placeholder OR if appInstance remained the initial fallback
    // OR if an existing app was used but it was badly configured.
    if (appInstance.name !== "fallback-initial") {
        // This implies config was present, but appInstance didn't initialize properly above OR an existing misconfigured app was used.
        console.warn("DEBUG: Firebase services (Auth, Firestore, Storage) could not be initialized due to app instance issue or incomplete config, using fallbacks. App instance name:", appInstance.name, "Configured API Key:", !!appInstance.options.apiKey);
    } else {
        // Config was missing or placeholder, and we're on the initial fallback.
        console.log("DEBUG: Using fallback Firebase service instances because config was missing or placeholder and using initial fallback app.");
    }
    // Ensure fallbacks are assigned if they weren't already or got overwritten by problematic getAuth/getFirestore calls on a bad appInstance
    authInstance = authInstance.currentUser === null ? { currentUser: null } as unknown as Auth : authInstance;
    dbInstance = Object.keys(dbInstance).length === 0 ? {} as Firestore : dbInstance; // Check if it's still an empty object
    storageInstance = Object.keys(storageInstance).length === 0 ? {} as FirebaseStorage : storageInstance;
  }
} catch (error) {
  console.error("DEBUG: Critical Firebase initialization error:", error);
  console.log("DEBUG: Due to critical error, ensuring fallback instances are used. App instance at error:", JSON.stringify(appInstance));
  // Fallbacks should already be assigned, but re-affirm just in case initialization of services threw error
  authInstance = authInstance.currentUser === null ? { currentUser: null } as unknown as Auth : authInstance;
  dbInstance = Object.keys(dbInstance).length === 0 ? {} as Firestore : dbInstance;
  storageInstance = Object.keys(storageInstance).length === 0 ? {} as FirebaseStorage : storageInstance;
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

// Helper function to check if Firestore is likely active and configured
export function isFirestoreActive(): boolean {
    const firestore = dbInstance as Firestore; // Cast to Firestore to access 'app'
    // Check if the app object exists and has a name different from the initial fallback, and has an API key.
    // Also check if firestore.app is defined.
    const isActive = !!(firestore && firestore.app && firestore.app.name !== "fallback-initial" && firestore.app.options.apiKey);
    // console.log("DEBUG: isFirestoreActive check:", isActive, "dbInstance.app.name:", firestore.app?.name, "dbInstance.app.options.apiKey present:", !!firestore.app?.options?.apiKey);
    return isActive;
}

// Log final status after module load to help diagnose initialization issues
// console.log("DEBUG: Firebase module loaded. Firestore active status:", isFirestoreActive());
// if((dbInstance as Firestore).app) {
//     console.log("DEBUG: dbInstance app details:", {name: (dbInstance as Firestore).app.name, options: (dbInstance as Firestore).app.options});
// } else {
//     console.log("DEBUG: dbInstance.app is not available (indicates Firestore service not properly obtained or using fallback).");
// }
// if(storageInstance && storageInstance.app){
//     console.log("DEBUG: storageInstance app details:", {name: storageInstance.app.name, options: storageInstance.app.options});
// } else {
//     console.log("DEBUG: storageInstance.app is not available (indicates Storage service not properly obtained or using fallback).");
// }
