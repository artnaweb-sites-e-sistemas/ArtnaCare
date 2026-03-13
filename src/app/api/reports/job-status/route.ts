import { NextResponse } from "next/server";
import { getReportJob } from "@/lib/firebase/admin-report-jobs";

/**
 * GET /api/reports/job-status?jobId=xxx
 * Retorna o status do job para polling.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId")?.trim();
    if (!jobId) {
      return NextResponse.json({ error: "jobId é obrigatório" }, { status: 400 });
    }

    const job = await getReportJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    }

    const done = job.status === "completed" || job.status === "failed";
    return NextResponse.json({
      status: job.status,
      processed: job.processedClientIds.length,
      total: job.totalClients,
      done,
      error: job.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Erro ao obter status", details: message }, { status: 500 });
  }
}
