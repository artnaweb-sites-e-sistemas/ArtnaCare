/**
 * Jobs de envio de relatório em massa (background).
 */

import { adminDb } from "./admin";

const REPORT_JOBS_COLLECTION = "report_jobs";

export type ReportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportJob {
  id: string;
  status: ReportJobStatus;
  totalClients: number;
  clientIds: string[];
  processedClientIds: string[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export async function createReportJob(clientIds: string[]): Promise<string> {
  const ref = await adminDb.collection(REPORT_JOBS_COLLECTION).add({
    status: "pending",
    totalClients: clientIds.length,
    clientIds,
    processedClientIds: [],
    createdAt: new Date(),
  });
  return ref.id;
}

export async function getReportJob(jobId: string): Promise<ReportJob | null> {
  const doc = await adminDb.collection(REPORT_JOBS_COLLECTION).doc(jobId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    status: data.status ?? "pending",
    totalClients: data.totalClients ?? 0,
    clientIds: Array.isArray(data.clientIds) ? data.clientIds : [],
    processedClientIds: Array.isArray(data.processedClientIds) ? data.processedClientIds : [],
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    completedAt: data.completedAt?.toDate?.() ?? (data.completedAt ? new Date(data.completedAt) : undefined),
    error: data.error,
  };
}

export async function updateReportJobProgress(
  jobId: string,
  processedClientIds: string[],
  opts?: { status?: ReportJobStatus; error?: string }
): Promise<void> {
  const update: Record<string, unknown> = { processedClientIds };
  if (opts?.status) {
    update.status = opts.status;
    if (opts.status === "completed" || opts.status === "failed") update.completedAt = new Date();
  }
  if (opts?.error != null) update.error = opts.error;
  await adminDb.collection(REPORT_JOBS_COLLECTION).doc(jobId).update(update);
}

export async function setReportJobStatus(jobId: string, status: ReportJobStatus, error?: string): Promise<void> {
  const update: Record<string, unknown> = { status, completedAt: new Date() };
  if (error != null) update.error = error;
  await adminDb.collection(REPORT_JOBS_COLLECTION).doc(jobId).update(update);
}
