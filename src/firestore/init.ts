import {
  type App,
  applicationDefault,
  initializeApp,
} from "firebase-admin/app";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;
export function initFirestore(): Firestore {
  if (db) {
    return db;
  }

  if (!app) {
    app = initializeApp({
      projectId: "part3-game-8440c",
      credential: applicationDefault(),
    });
  }

  db = getFirestore();

  return db;
}
