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

// Initialize with fallback values
let appInstance: FirebaseApp = { name: "fallback-initial", options: {}, automaticDataCollectionEnabled: false } as FirebaseApp;
let authInstance: Auth = { currentUser: null } as unknown as Auth;
let dbInstance: Firestore = {} as Firestore; 
let storageInstance: FirebaseStorage = {} as FirebaseStorage; 

try {
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
    if (getApps().length) {
        const existingApp = getApps()[0];
        if (existingApp && existingApp.name !== "fallback-initial" && (!existingApp.options.apiKey || !existingApp.options.projectId)) {
             console.warn("DEBUG: An existing Firebase app was found but seems misconfigured. Sticking to initial fallbacks.");
        } else if (existingApp && existingApp.name !== "fallback-initial") {
             appInstance = existingApp; 
        }
    }
  }

  if (appInstance && appInstance.name !== "fallback-initial" && appInstance.options.apiKey && appInstance.options.projectId) {
    console.log("DEBUG: Getting Firebase services (Auth, Firestore, Storage)...");
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
    console.log("DEBUG: Firebase services obtained successfully.");
  } else {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_PLACEHOLDER_IF_ANY" && firebaseConfig.projectId) {
        console.warn("DEBUG: Firebase services (Auth, Firestore, Storage) could not be initialized due to app instance issue or incomplete config, using fallbacks. App instance:", JSON.stringify(appInstance));
    } else {
        console.log("DEBUG: Using fallback Firebase service instances because config was missing or placeholder.");
    }
  }
} catch (error) {
  console.error("DEBUG: Critical Firebase initialization error:", error);
  console.log("DEBUG: Due to critical error, ensuring fallback instances are used. App instance at error:", JSON.stringify(appInstance));
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

export function isFirestoreActive(): boolean {
    const firestore = dbInstance as Firestore;
    // Check if the app object exists and has a name different from the initial fallback, and has an API key.
    const isActive = !!(firestore && firestore.app && firestore.app.name !== "fallback-initial" && firestore.app.options.apiKey);
    console.log("DEBUG: isFirestoreActive check:", isActive, "dbInstance.app.name:", firestore.app?.name, "dbInstance.app.options.apiKey present:", !!firestore.app?.options?.apiKey);
    return isActive;
}

console.log("DEBUG: Firebase module loaded. Firestore active status:", isFirestoreActive());
if((dbInstance as Firestore).app) {
    console.log("DEBUG: dbInstance app details:", {name: (dbInstance as Firestore).app.name, options: (dbInstance as Firestore).app.options});
} else {
    console.log("DEBUG: dbInstance.app is not available.");
}
