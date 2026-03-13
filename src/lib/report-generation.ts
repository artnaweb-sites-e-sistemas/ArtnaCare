/**
 * Geração e envio de relatório para um único cliente.
 * Usado pelo cron de relatórios e pelo job em background (envio em massa).
 */

import * as admin from "firebase-admin";
import { getClientsAdmin } from "@/lib/firebase/admin-clients";
import { getSitesByClientAdmin } from "@/lib/firebase/admin-sites";
import { getMaintenanceLogsAdmin, type MaintenanceEntryAdmin } from "@/lib/firebase/admin-maintenance";
import { createReportAdmin } from "@/lib/firebase/admin-reports";
import { getReportTemplateAdmin } from "@/lib/firebase/admin-report-template";
import { calculateStatus } from "@/lib/status-calculator";
import { generateReportEmailHtml, sendEmail } from "@/lib/email";
import { generatePdfFromHtml } from "@/lib/pdf";

const TYPE_LABELS: Record<MaintenanceEntryAdmin["type"], string> = {
  Update: "Atualização",
  Backup: "Backup",
  Security: "Segurança",
  Performance: "Performance",
  Other: "Outros",
};

function formatMaintenanceDate(t: admin.firestore.Timestamp | Date): string {
  if (typeof (t as admin.firestore.Timestamp).toDate === "function")
    return (t as admin.firestore.Timestamp).toDate().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (t instanceof Date) return t.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return "";
}

function buildMaintenanceRecordsSectionHtml(entries: MaintenanceEntryAdmin[]): string {
  if (entries.length === 0) {
    return `<p class="muted" style="color: #6b7280; font-size: 14px; margin: 0;">Nenhum registro de manutenção lançado para este site neste mês.</p>`;
  }
  const rows = entries
    .map(
      (e) => `
    <tr>
      <td class="stats-grid-cell" style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; vertical-align: top;">
        <span class="pill pill-gray" style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; background: #e5e7eb; color: #374151;">${TYPE_LABELS[e.type]}</span>
      </td>
      <td class="stats-grid-cell" style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #374151;">${escapeHtml(e.description)}</td>
      <td class="stats-grid-cell" style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${escapeHtml(e.performedBy)}</td>
      <td class="stats-grid-cell stats-value" style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; color: #6b7280;">${formatMaintenanceDate(e.createdAt)}</td>
    </tr>`
    )
    .join("");
  return `
  <div style="margin-top: 12px; overflow-x: auto;">
    <table class="stats-grid" style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr>
          <th style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Tipo</th>
          <th style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Descrição</th>
          <th style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Realizado por</th>
          <th style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #374151;">Data e hora</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface GenerateReportResult {
  success: boolean;
  emailSent: boolean;
}

/**
 * Gera e envia o relatório para um cliente (e opcionalmente apenas um site).
 * Retorna { success, emailSent }. success = true se o relatório foi gerado e o registro salvo; emailSent indica se o e-mail foi enviado.
 */
export async function generateAndSendReportForClient(
  clientId: string,
  siteId?: string
): Promise<GenerateReportResult> {
  const clients = await getClientsAdmin();
  const client = clients.find((c) => c.id === clientId && (c.status ?? "Active") === "Active");
  if (!client?.id || !client.email?.trim()) {
    return { success: false, emailSent: false };
  }

  let sites = await getSitesByClientAdmin(client.id);
  if (siteId) sites = sites.filter((s) => s.id === siteId);
  if (sites.length === 0) return { success: false, emailSent: false };

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
  const period = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const siteIds = sites.map((s) => s.id).filter(Boolean) as string[];
  const maintenanceLogs = await getMaintenanceLogsAdmin(siteIds, startOfMonth, endOfMonth);
  const maintenanceRecordsSection = buildMaintenanceRecordsSectionHtml(maintenanceLogs);

  const reportTemplateData = {
    clientName: client.name,
    period,
    sitesTotal: sites.length,
    sitesHealthy,
    sitesWarning,
    sitesCritical,
    uptimePercentage,
    siteStatus: siteStatusLabel,
    siteUrl: sites[0]?.url ?? "",
    maintenanceRecordsSection,
  };

  const templateHtml = await getReportTemplateAdmin();
  const htmlContent = generateReportEmailHtml(reportTemplateData, templateHtml);

  let attachments: Array<{ filename: string; content: string }> = [];
  try {
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    attachments = [
      {
        filename: `ArtnaCare_Relatorio_${client.name.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ];
  } catch {
    // PDF opcional
  }

  const emailResult = await sendEmail({
    to: client.email,
    subject: `Relatório de manutenção - ${period}`,
    html: htmlContent,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  const reportMeta = {
    clientId: client.id,
    clientName: client.name,
    period,
    emailSent: emailResult.success,
    pdfGenerated: attachments.length > 0,
    email: client.email,
    ...(!emailResult.success && { emailError: emailResult.error ?? "Erro desconhecido" }),
  };
  await createReportAdmin(reportMeta);

  return { success: true, emailSent: emailResult.success };
}
