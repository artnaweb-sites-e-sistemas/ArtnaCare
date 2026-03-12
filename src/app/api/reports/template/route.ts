import { NextResponse } from "next/server";
import { getReportTemplateAdmin, setReportTemplateAdmin } from "@/lib/firebase/admin-report-template";
import { getDefaultReportTemplate } from "@/lib/email";

/**
 * GET /api/reports/template
 * Retorna o modelo HTML do relatório (ou o padrão se não houver customizado).
 */
export async function GET() {
  try {
    const stored = await getReportTemplateAdmin();
    const html = stored ?? getDefaultReportTemplate();
    return NextResponse.json({ html });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao buscar modelo do relatório:", error);
    return NextResponse.json(
      { error: "Erro ao buscar modelo", details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reports/template
 * Atualiza o modelo HTML do relatório.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { html } = body;
    if (typeof html !== "string") {
      return NextResponse.json(
        { error: "Campo 'html' é obrigatório e deve ser uma string" },
        { status: 400 }
      );
    }
    await setReportTemplateAdmin(html);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao salvar modelo do relatório:", error);
    return NextResponse.json(
      { error: "Erro ao salvar modelo", details: message },
      { status: 500 }
    );
  }
}
