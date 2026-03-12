/**
 * Server-side Firestore operations for the report template.
 */

import { adminDb } from "./admin";

const TEMPLATE_DOC = "report_template";
const SETTINGS_COLLECTION = "settings";

export async function getReportTemplateAdmin(): Promise<string | null> {
  const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(TEMPLATE_DOC).get();
  const data = doc.data();
  return typeof data?.html === "string" ? data.html : null;
}

export async function setReportTemplateAdmin(html: string): Promise<void> {
  await adminDb.collection(SETTINGS_COLLECTION).doc(TEMPLATE_DOC).set(
    { html, updatedAt: new Date() },
    { merge: true }
  );
}
