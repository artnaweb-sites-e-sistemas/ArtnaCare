/**
 * Server-side Firestore operations for clients using Firebase Admin SDK.
 */

import { adminDb } from "./admin";
import type { Client } from "./firestore";

const CLIENTS_COLLECTION = "clients";

export async function getClientsAdmin(): Promise<Client[]> {
  const snapshot = await adminDb
    .collection(CLIENTS_COLLECTION)
    .orderBy("name", "asc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Client));
}
