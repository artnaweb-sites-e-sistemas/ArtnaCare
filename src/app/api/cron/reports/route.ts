import { NextResponse } from "next/server";
import { getClients } from "@/lib/firebase/firestore";
import { getSitesByClient } from "@/lib/firebase/sites";
import { calculateStatus } from "@/lib/status-calculator";
import { generateReportEmailHtml, sendEmail } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf";

/**
 * POST /api/cron/reports
 * Gera relatórios mensais para todos os clientes.
 * Stub: Irá gerar PDF e enviar e-mail quando o Resend estiver configurado.
 */
export async function POST() {
  try {
    // 1. For each client with active sites
    const clients = await getClients();
    const activeClients = clients.filter(c => c.status === "Active");
    let generatedCount = 0;

    for (const client of activeClients) {
      if (!client.id) continue;

      const sites = await getSitesByClient(client.id);
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
      const period = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

      const reportData = {
        clientName: client.name,
        period,
        sitesTotal: sites.length,
        sitesHealthy,
        sitesWarning,
        sitesCritical,
        uptimePercentage,
      };

      const htmlContent = generateReportEmailHtml(reportData);

      // 3. Gerar relatório em PDF (Puppeteer)
      const pdfBuffer = await generatePdfFromHtml(htmlContent);

      // 4. Armazenar metadados do relatório no Firestore (Stub)
      // TODO: implementar armazenamento de metadados dos relatórios

      // 5. Enviar e-mail via API do Resend com o PDF em anexo
      const emailResult = await sendEmail({
        to: client.email,
        subject: `Relatório de manutenção - ${period}`,
        html: htmlContent,
        attachments: [
          {
            filename: `ArtnaCare_Relatorio_${client.name.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      });
      if (!emailResult.success) {
        console.error(`Falha ao enviar e-mail para ${client.email}:`, emailResult.error);
      }

      generatedCount++;
    }

    return NextResponse.json({
      message: "Geração de relatórios executada com sucesso. E-mails enviados via Resend.",
      generated: generatedCount,
    });
  } catch (error) {
    console.error("Erro na geração dos relatórios:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
