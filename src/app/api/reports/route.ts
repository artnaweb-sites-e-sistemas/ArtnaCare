import { NextResponse } from "next/server";
import { getReportsAdmin } from "@/lib/firebase/admin-reports";

/**
 * GET /api/reports
 * Retorna a lista de relatórios gerados com metadados.
 */
export async function GET() {
  try {
    const reports = await getReportsAdmin();
    return NextResponse.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao buscar relatórios:", error);
    return NextResponse.json(
      { error: "Erro ao buscar relatórios", details: message },
      { status: 500 }
    );
  }
}
