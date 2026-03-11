/**
 * Server-side Firestore operations using Firebase Admin SDK.
 * Use these in API routes (cron, etc.) where there is no authenticated user.
 */

import { adminDb } from "./admin";
import type { Site } from "./sites";

const SITES_COLLECTION = "sites";
const MONITORING_LOGS_COLLECTION = "monitoring_logs";

export async function getSitesAdmin(): Promise<Site[]> {
  const snapshot = await adminDb.collection(SITES_COLLECTION).orderBy("name", "asc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Site));
}

export async function updateSiteAdmin(
  id: string,
  data: Partial<Pick<Site, "status" | "sslValid" | "responseTime" | "wpVersion">>
): Promise<void> {
  await adminDb.collection(SITES_COLLECTION).doc(id).update({
    ...data,
    updatedAt: new Date(),
  });
}

export async function addMonitoringLogAdmin(log: {
  siteId?: string;
  siteName: string;
  siteUrl: string;
  status: string;
  issues: string[];
  httpOk?: boolean;
  responseTimeMs?: number;
  sslValid?: boolean | null;
  sslExpiryDays?: number | null;
  wpVersion?: string | null;
  malwareDetected?: boolean;
  performanceScore?: number | null;
}): Promise<void> {
  await adminDb.collection(MONITORING_LOGS_COLLECTION).add({
    ...log,
    checkedAt: new Date(),
  });
}
