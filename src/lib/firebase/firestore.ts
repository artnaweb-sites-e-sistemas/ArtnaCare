import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  sites: number;
  address?: string;
  status: "Active" | "Inactive";
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

const CLIENTS_COLLECTION = "clients";

export async function getClients(): Promise<Client[]> {
  const clientsRef = collection(db, CLIENTS_COLLECTION);
  const q = query(clientsRef, orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Client));
}

export async function getClient(id: string): Promise<Client | null> {
  const docRef = doc(db, CLIENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Client;
  }
  return null;
}

export async function createClient(clientData: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const clientsRef = collection(db, CLIENTS_COLLECTION);
  const newDoc = await addDoc(clientsRef, {
    ...clientData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDoc.id;
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...clientData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClient(id: string): Promise<void> {
  const docRef = doc(db, CLIENTS_COLLECTION, id);
  await deleteDoc(docRef);
}
