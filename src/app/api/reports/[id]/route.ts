import { NextResponse } from "next/server";
import { deleteReportAdmin } from "@/lib/firebase/admin-reports";

/**
 * DELETE /api/reports/[id]
 * Remove um relatório do histórico.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "ID do relatório é obrigatório" },
        { status: 400 }
      );
    }
    await deleteReportAdmin(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao excluir relatório:", error);
    return NextResponse.json(
      { error: "Erro ao excluir relatório", details: message },
      { status: 500 }
    );
  }
}
