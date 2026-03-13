import { NextResponse } from "next/server";
import { getReportJob, updateReportJobProgress } from "@/lib/firebase/admin-report-jobs";
import { generateAndSendReportForClient } from "@/lib/report-generation";

const BATCH_SIZE = 5;

/**
 * POST /api/reports/process-batch
 * Processa um lote de clientes do job (até BATCH_SIZE).
 * Body: { jobId: string }
 * Retorna: { status, processed, total, done }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
    if (!jobId) {
      return NextResponse.json({ error: "jobId é obrigatório" }, { status: 400 });
    }

    const job = await getReportJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    }
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        status: job.status,
        processed: job.processedClientIds.length,
        total: job.totalClients,
        done: true,
      });
    }

    const remaining = job.clientIds.filter((id) => !job.processedClientIds.includes(id));
    const batch = remaining.slice(0, BATCH_SIZE);
    const newProcessed = [...job.processedClientIds];

    for (const clientId of batch) {
      try {
        await generateAndSendReportForClient(clientId);
        newProcessed.push(clientId);
      } catch (err) {
        console.error("[REPORTS] process-batch client error:", clientId, err);
        newProcessed.push(clientId);
      }
    }

    const done = newProcessed.length >= job.totalClients;
    await updateReportJobProgress(jobId, newProcessed, done ? "completed" : undefined);

    return NextResponse.json({
      status: done ? "completed" : "processing",
      processed: newProcessed.length,
      total: job.totalClients,
      done,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[REPORTS] process-batch error:", error);
    return NextResponse.json({ error: "Erro ao processar lote", details: message }, { status: 500 });
  }
}
