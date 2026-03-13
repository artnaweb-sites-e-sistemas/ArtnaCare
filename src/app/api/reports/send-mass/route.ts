import { NextResponse } from "next/server";
import { getClientsAdmin } from "@/lib/firebase/admin-clients";
import { getSitesByClientAdmin } from "@/lib/firebase/admin-sites";
import { createReportJob } from "@/lib/firebase/admin-report-jobs";

/**
 * POST /api/reports/send-mass
 * Cria um job de envio em massa e retorna o jobId.
 * O frontend deve chamar process-batch em loop até done.
 */
export async function POST() {
  try {
    const clients = await getClientsAdmin();
    const activeClients = clients.filter((c) => (c.status ?? "Active") === "Active");
    const clientIds: string[] = [];
    for (const client of activeClients) {
      if (!client.id || !client.email?.trim()) continue;
      const sites = await getSitesByClientAdmin(client.id);
      if (sites.length > 0) clientIds.push(client.id);
    }
    const jobId = await createReportJob(clientIds);
    return NextResponse.json({ jobId, totalClients: clientIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[REPORTS] send-mass error:", error);
    return NextResponse.json({ error: "Erro ao criar job", details: message }, { status: 500 });
  }
}
