import { NextResponse } from "next/server";
import { getClientsAdmin } from "@/lib/firebase/admin-clients";
import { getSitesByClientAdmin } from "@/lib/firebase/admin-sites";
import { createReportAdmin } from "@/lib/firebase/admin-reports";
import { getReportTemplateAdmin } from "@/lib/firebase/admin-report-template";
import { calculateStatus } from "@/lib/status-calculator";
import { generateReportEmailHtml, sendEmail } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf";

/**
 * POST /api/cron/reports
 * Gera relatórios mensais. Se clientId no body, gera apenas para esse cliente.
 */
export async function POST(request: Request) {
  try {
    let body: { clientId?: string } = {};
    try {
      body = await request.json().catch(() => ({}));
    } catch {
      // ignore
    }
    const { clientId: singleClientId } = body;

    const clients = await getClientsAdmin();
    let activeClients = clients.filter((c) => (c.status ?? "Active") === "Active");
    if (singleClientId) {
      activeClients = activeClients.filter((c) => c.id === singleClientId);
    }
    let generatedCount = 0;
    let lastEmailSent = false;
    let lastEmailError: string | null = null;

    for (const client of activeClients) {
      if (!client.id || !client.email?.trim()) continue;

      const sites = await getSitesByClientAdmin(client.id);
      if (sites.length === 0) continue;

      let sitesHealthy = 0;
      let sitesWarning = 0;
      let sitesCritical = 0;
      let totalUptimeSum = 0;

      // 2. Coletar dados de monitoramento do último mês
      for (const site of sites) {
        if (!site.id) continue;
        
        // Dados de monitoramento simulados para o stub de relatório, já que o armazenamento histórico ainda não está totalmente implementado
        const mockMonitoringResult = {
          httpOk: true,
          responseTimeMs: Math.random() * 500 + 100, // 100-600ms
          sslValid: true,
          sslExpiryDays: 45,
          wpVersion: site.type === "WordPress" ? "6.4.2" : null,
          wpPluginsOutdated: 0,
          wpThemeOutdated: false,
          malwareDetected: false,
          performanceScore: Math.floor(Math.random() * 20) + 80, // 80-100
          siteType: site.type === "WordPress" ? "WordPress" : "HTML",
        };

        const status = calculateStatus(mockMonitoringResult);

        if (status.status === "Healthy") sitesHealthy++;
        else if (status.status === "Warning") sitesWarning++;
        else sitesCritical++;

        totalUptimeSum += 100; // Mock uptime mapping
      }

      const uptimePercentage = Math.round(totalUptimeSum / sites.length);
      const period = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

      const reportTemplateData = {
        clientName: client.name,
        period,
        sitesTotal: sites.length,
        sitesHealthy,
        sitesWarning,
        sitesCritical,
        uptimePercentage,
      };

      const templateHtml = await getReportTemplateAdmin();
      const htmlContent = generateReportEmailHtml(reportTemplateData, templateHtml);

      // 3. Gerar relatório em PDF (Puppeteer) - opcional, pode falhar em alguns ambientes
      let attachments: Array<{ filename: string; content: string }> = [];
      try {
        const pdfBuffer = await generatePdfFromHtml(htmlContent);
        attachments = [
          {
            filename: `ArtnaCare_Relatorio_${client.name.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ];
      } catch (pdfError) {
        console.warn("PDF não gerado (Puppeteer pode não estar disponível):", pdfError);
      }

      // 4. Enviar e-mail via API do Resend (com ou sem PDF em anexo)
      const emailResult = await sendEmail({
        to: client.email,
        subject: `Relatório de manutenção - ${period}`,
        html: htmlContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      const emailSent = emailResult.success;
      lastEmailSent = emailSent;
      lastEmailError = emailResult.error ?? null;

      if (!emailSent) {
        console.error("[REPORTS] Falha ao enviar e-mail:", {
          clientId: client.id,
          clientEmail: client.email,
          error: emailResult.error,
        });
      }

      // 5. Salvar metadados do relatório no Firestore (inclui erro para debug)
      const reportMeta = {
        clientId: client.id,
        clientName: client.name,
        period,
        emailSent,
        pdfGenerated: attachments.length > 0,
        email: client.email,
        ...(!emailSent && { emailError: emailResult.error ?? "Erro desconhecido" }),
      };
      await createReportAdmin(reportMeta);

      generatedCount++;
    }

    return NextResponse.json({
      message: "Geração de relatórios executada.",
      generated: generatedCount,
      emailSent: singleClientId ? lastEmailSent : undefined,
      emailError: singleClientId ? lastEmailError : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na geração dos relatórios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: message },
      { status: 500 }
    );
  }
}
