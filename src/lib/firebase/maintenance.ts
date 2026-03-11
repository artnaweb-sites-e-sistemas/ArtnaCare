import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

export interface MaintenanceEntry {
  id?: string;
  siteId: string;
  siteName?: string;
  type: "Update" | "Backup" | "Security" | "Performance" | "Other";
  description: string;
  performedBy: string;
  createdAt?: Timestamp | Date;
}

const MAINTENANCE_COLLECTION = "maintenance_logs";

export async function getMaintenanceLogs(siteId: string): Promise<MaintenanceEntry[]> {
  const ref = collection(db, MAINTENANCE_COLLECTION);
  const q = query(ref, where("siteId", "==", siteId));
  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceEntry));
  entries.sort((a, b) => {
    const toMs = (t: Timestamp | Date | undefined) => {
      if (!t) return 0;
      if (typeof (t as Timestamp).toMillis === "function") return (t as Timestamp).toMillis();
      if (t instanceof Date) return t.getTime();
      return 0;
    };
    return toMs(b.createdAt) - toMs(a.createdAt);
  });
  return entries;
}

export async function addMaintenanceLog(entry: Omit<MaintenanceEntry, "id" | "createdAt">): Promise<string> {
  const ref = collection(db, MAINTENANCE_COLLECTION);
  const newDoc = await addDoc(ref, { ...entry, createdAt: serverTimestamp() });
  return newDoc.id;
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  const docRef = doc(db, MAINTENANCE_COLLECTION, id);
  await deleteDoc(docRef);
}
