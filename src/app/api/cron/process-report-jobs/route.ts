import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getReportJob, updateReportJobProgress } from "@/lib/firebase/admin-report-jobs";
import { generateAndSendReportForClient } from "@/lib/report-generation";

const REPORT_JOBS_COLLECTION = "report_jobs";
const BATCH_SIZE = 5;

/**
 * GET /api/cron/process-report-jobs
 * Processa um lote de um job pendente (para cron em background).
 * Útil quando o usuário fechou a aba antes do envio em massa terminar.
 */
export async function GET() {
  try {
    let snapshot = await adminDb
      .collection(REPORT_JOBS_COLLECTION)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (snapshot.empty) {
      snapshot = await adminDb
        .collection(REPORT_JOBS_COLLECTION)
        .where("status", "==", "processing")
        .limit(1)
        .get();
    }
    if (snapshot.empty) {
      return NextResponse.json({ message: "Nenhum job pendente" });
    }

    const doc = snapshot.docs[0];
    const jobId = doc.id;
    const job = await getReportJob(jobId);
    if (!job || (job.status !== "pending" && job.status !== "processing")) {
      return NextResponse.json({ message: "Job já concluído ou não encontrado" });
    }

    const remaining = job.clientIds.filter((id) => !job.processedClientIds.includes(id));
    const batch = remaining.slice(0, BATCH_SIZE);
    const newProcessed = [...job.processedClientIds];

    for (const clientId of batch) {
      try {
        await generateAndSendReportForClient(clientId);
        newProcessed.push(clientId);
      } catch (err) {
        console.error("[REPORTS] cron process-report-jobs client error:", clientId, err);
        newProcessed.push(clientId);
      }
    }

    const done = newProcessed.length >= job.totalClients;
    await updateReportJobProgress(jobId, newProcessed, done ? "completed" : undefined);

    return NextResponse.json({
      jobId,
      processed: newProcessed.length,
      total: job.totalClients,
      done,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[REPORTS] process-report-jobs error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
