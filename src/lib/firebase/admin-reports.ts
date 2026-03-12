/**
 * Server-side Firestore operations for reports using Firebase Admin SDK.
 */

import * as admin from "firebase-admin";
import { adminDb } from "./admin";

export interface ReportRecord {
  id?: string;
  clientId: string;
  clientName: string;
  period: string;
  generatedAt: admin.firestore.Timestamp | Date;
  emailSent: boolean;
  pdfGenerated: boolean;
  email?: string;
  emailError?: string;
}

const REPORTS_COLLECTION = "reports";

export async function createReportAdmin(data: Omit<ReportRecord, "id" | "generatedAt">): Promise<string> {
  const docRef = await adminDb.collection(REPORTS_COLLECTION).add({
    ...data,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function getReportsAdmin(): Promise<ReportRecord[]> {
  const snapshot = await adminDb
    .collection(REPORTS_COLLECTION)
    .orderBy("generatedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const generatedAt = data.generatedAt;
    return {
      id: doc.id,
      ...data,
      generatedAt: generatedAt?.toDate?.() ?? (generatedAt instanceof Date ? generatedAt : new Date()),
    } as ReportRecord;
  });
}

export async function deleteReportAdmin(id: string): Promise<void> {
  await adminDb.collection(REPORTS_COLLECTION).doc(id).delete();
}
