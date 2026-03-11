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

export async function getSiteAdmin(id: string): Promise<Site | null> {
  const doc = await adminDb.collection(SITES_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Site;
}

/** Remove chaves com valor undefined para não enviar ao Firestore (não aceita undefined). */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

export async function updateSiteAdmin(
  id: string,
  data: Partial<Pick<Site, "status" | "issues" | "sslValid" | "responseTime" | "wpVersion">>
): Promise<void> {
  const payload = omitUndefined({ ...data, updatedAt: new Date() });
  await adminDb.collection(SITES_COLLECTION).doc(id).update(payload);
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
  siteType?: string | null;
  malwareDetected?: boolean;
  performanceScore?: number | null;
}): Promise<void> {
  const data: Record<string, unknown> = {
    siteId: log.siteId,
    siteName: log.siteName,
    siteUrl: log.siteUrl,
    status: log.status,
    issues: log.issues,
    checkedAt: new Date(),
  };
  if (log.httpOk !== undefined) data.httpOk = log.httpOk;
  if (log.responseTimeMs !== undefined && log.responseTimeMs !== null) data.responseTimeMs = log.responseTimeMs;
  if (log.sslValid !== undefined && log.sslValid !== null) data.sslValid = log.sslValid;
  if (log.sslExpiryDays !== undefined && log.sslExpiryDays !== null) data.sslExpiryDays = log.sslExpiryDays;
  if (log.wpVersion !== undefined && log.wpVersion !== null) data.wpVersion = log.wpVersion;
  if (log.siteType !== undefined && log.siteType !== null && log.siteType !== "") data.siteType = log.siteType;
  if (log.malwareDetected !== undefined) data.malwareDetected = log.malwareDetected;
  if (log.performanceScore !== undefined && log.performanceScore !== null) data.performanceScore = log.performanceScore;
  await adminDb.collection(MONITORING_LOGS_COLLECTION).add(data);
}
