/**
 * Server-side leitura dos registros de manutenção (para relatórios e cron).
 */

import * as admin from "firebase-admin";
import { adminDb } from "./admin";

const MAINTENANCE_COLLECTION = "maintenance_logs";

export interface MaintenanceEntryAdmin {
  id: string;
  siteId: string;
  siteName?: string;
  type: "Update" | "Backup" | "Security" | "Performance" | "Other";
  description: string;
  performedBy: string;
  createdAt: admin.firestore.Timestamp | Date;
}

function toMs(t: admin.firestore.Timestamp | Date | undefined): number {
  if (!t) return 0;
  if (typeof (t as admin.firestore.Timestamp).toMillis === "function")
    return (t as admin.firestore.Timestamp).toMillis();
  if (t instanceof Date) return t.getTime();
  return 0;
}

/**
 * Busca registros de manutenção de um ou mais sites dentro de um período.
 * Ordenados do mais recente para o mais antigo.
 */
export async function getMaintenanceLogsAdmin(
  siteIds: string[],
  startDate: Date,
  endDate: Date
): Promise<MaintenanceEntryAdmin[]> {
  if (siteIds.length === 0) return [];

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const results: MaintenanceEntryAdmin[] = [];

  for (const siteId of siteIds) {
    const snapshot = await adminDb
      .collection(MAINTENANCE_COLLECTION)
      .where("siteId", "==", siteId)
      .get();

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const createdAt = data.createdAt;
      const ms = toMs(createdAt);
      if (ms >= startMs && ms <= endMs) {
        results.push({
          id: d.id,
          siteId: data.siteId ?? siteId,
          siteName: data.siteName,
          type: data.type ?? "Other",
          description: data.description ?? "",
          performedBy: data.performedBy ?? "",
          createdAt: data.createdAt,
        });
      }
    });
  }

  results.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return results;
}
