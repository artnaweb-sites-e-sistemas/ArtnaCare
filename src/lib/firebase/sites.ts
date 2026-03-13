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
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

export interface Site {
  id?: string;
  name: string;
  url: string;
  clientId: string;
  clientName?: string;
  type: "WordPress" | "Static" | "Other";
  status: "Healthy" | "Warning" | "Critical" | "Unknown";
  issues?: string[];
  sslValid?: boolean;
  responseTime?: number;
  lastCheck?: Timestamp | Date | null;
  wpVersion?: string;
  wpAdminUrl?: string;
  wpAdminUser?: string;
  wpAdminPassword?: string;
  wpLoginPassword?: string;
  serverLoginUrl?: string;
  serverLoginUser?: string;
  serverLoginPassword?: string;
  reportEmail?: string;
  uptimerobotMonitorId?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

const SITES_COLLECTION = "sites";

export async function getSites(): Promise<Site[]> {
  const sitesRef = collection(db, SITES_COLLECTION);
  const q = query(sitesRef, orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Site));
}

export async function getSitesByClient(clientId: string): Promise<Site[]> {
  const sitesRef = collection(db, SITES_COLLECTION);
  const q = query(sitesRef, where("clientId", "==", clientId));
  const querySnapshot = await getDocs(q);

  const sites = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Site));
  return sites.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSite(id: string): Promise<Site | null> {
  const docRef = doc(db, SITES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Site;
  }
  return null;
}

export async function createSite(siteData: Omit<Site, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const sitesRef = collection(db, SITES_COLLECTION);
  const payload: Record<string, unknown> = {
    name: siteData.name,
    url: siteData.url,
    clientId: siteData.clientId,
    type: siteData.type,
    status: siteData.status || "Unknown",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const optionalKeys: (keyof Site)[] = [
    "clientName", "reportEmail", "wpAdminUrl", "wpAdminUser", "wpAdminPassword",
    "wpLoginPassword", "serverLoginUrl", "serverLoginUser", "serverLoginPassword",
  ];
  for (const key of optionalKeys) {
    const value = siteData[key as keyof typeof siteData];
    if (value !== undefined && value !== "") payload[key] = value;
  }
  const newDoc = await addDoc(sitesRef, payload);
  return newDoc.id;
}

export async function updateSite(id: string, siteData: Partial<Site>): Promise<void> {
  const docRef = doc(db, SITES_COLLECTION, id);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(siteData)) {
    if (value !== undefined) payload[key] = value;
  }
  await updateDoc(docRef, payload);
}

export async function deleteSite(id: string): Promise<void> {
  const docRef = doc(db, SITES_COLLECTION, id);
  await deleteDoc(docRef);
}
