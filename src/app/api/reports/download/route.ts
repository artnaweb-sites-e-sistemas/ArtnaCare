import { NextResponse } from "next/server";
import { getClientsAdmin } from "@/lib/firebase/admin-clients";
import { getSitesByClientAdmin } from "@/lib/firebase/admin-sites";
import { getReportTemplateAdmin } from "@/lib/firebase/admin-report-template";
import { calculateStatus } from "@/lib/status-calculator";
import { generateReportEmailHtml } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf";

/**
 * GET /api/reports/download?clientId=xxx&period=March%202026
 * Gera e retorna o PDF do relatório para download.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const period = searchParams.get("period");

    if (!clientId || !period) {
      return NextResponse.json(
        { error: "clientId e period são obrigatórios" },
        { status: 400 }
      );
    }

    const clients = await getClientsAdmin();
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const sites = await getSitesByClientAdmin(clientId);
    if (sites.length === 0) {
      return NextResponse.json(
        { error: "Nenhum site encontrado para este cliente" },
        { status: 404 }
      );
    }

    let sitesHealthy = 0;
    let sitesWarning = 0;
    let sitesCritical = 0;
    let totalUptimeSum = 0;
    let lastSiteStatus: "Healthy" | "Warning" | "Critical" | "Unknown" = "Unknown";

    for (const site of sites) {
      if (!site.id) continue;
      const mockMonitoringResult = {
        httpOk: true,
        responseTimeMs: Math.random() * 500 + 100,
        sslValid: true,
        sslExpiryDays: 45,
        wpVersion: site.type === "WordPress" ? "6.4.2" : null,
        wpPluginsOutdated: 0,
        wpThemeOutdated: false,
        malwareDetected: false,
        performanceScore: Math.floor(Math.random() * 20) + 80,
        siteType: site.type === "WordPress" ? "WordPress" : "HTML",
      };
      const status = calculateStatus(mockMonitoringResult);
      lastSiteStatus = status.status;
      if (status.status === "Healthy") sitesHealthy++;
      else if (status.status === "Warning") sitesWarning++;
      else sitesCritical++;
      totalUptimeSum += 100;
    }

    const uptimePercentage = Math.round(totalUptimeSum / sites.length);
    const siteStatusLabel =
      lastSiteStatus === "Healthy"
        ? "Saudável"
        : lastSiteStatus === "Warning"
          ? "Aviso"
          : lastSiteStatus === "Critical"
            ? "Crítico"
            : "Desconhecido";
    const reportData = {
      clientName: client.name,
      period,
      sitesTotal: sites.length,
      sitesHealthy,
      sitesWarning,
      sitesCritical,
      uptimePercentage,
      siteStatus: siteStatusLabel,
      siteUrl: sites[0]?.url ?? "",
      maintenanceRecordsSection: "",
    };

    const templateHtml = await getReportTemplateAdmin();
    const htmlContent = generateReportEmailHtml(reportData, templateHtml);

    const rawName = `${client.name.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}`;
    const baseFilename = rawName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u201c\u201d\u2018\u2019]/g, "")
      .replace(/[^\x00-\x7F]/g, "");

    try {
      const pdfBuffer = await generatePdfFromHtml(htmlContent);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ArtnaCare_Relatorio_${baseFilename || "relatorio"}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.warn("PDF não gerado (Puppeteer/Chromium indisponível), retornando HTML:", pdfError);
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="ArtnaCare_Relatorio_${baseFilename || "relatorio"}.html"`,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro ao gerar relatório para download:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório", details: message },
      { status: 500 }
    );
  }
}
