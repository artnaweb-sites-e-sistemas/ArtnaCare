/**
 * Email Service (Resend Integration)
 * Stub for sending automated reports and notifications via Resend.
 * Docs: https://resend.com/docs
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      }),
    });

    if (res.ok) {
      return { success: true, error: null };
    }

    const errorData = await res.json().catch(() => ({}));
    const errMsg =
      errorData.message ||
      errorData.error ||
      (typeof errorData === "string" ? errorData : null) ||
      `Resend API error (${res.status})`;
    return { success: false, error: errMsg };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: msg };
  }
}

export interface ReportData {
  clientName: string;
  period: string;
  sitesTotal: number;
  sitesHealthy: number;
  sitesWarning: number;
  sitesCritical: number;
  uptimePercentage: number;
  siteStatus?: string;
  siteUrl?: string;
  /** HTML da seção "Ajustes realizados neste mês" (registros de manutenção). */
  maintenanceRecordsSection?: string;
}

/**
 * Retorna o modelo HTML padrão do relatório (com placeholders).
 */
export function getDefaultReportTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArtnaCare - Relatório Mensal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #0f172a; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 22px;">ARTNA<span style="color: #34d399;">CARE</span></h1>
      <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Relatório de Manutenção Mensal</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">
        Olá <strong>{{clientName}}</strong>,<br><br>
        Segue o relatório de manutenção dos seus sites referente a <strong>{{period}}</strong>.
      </p>
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="font-size: 28px; font-weight: bold; color: #16a34a; margin: 0;">{{sitesHealthy}}</p>
          <p style="font-size: 12px; color: #4ade80; margin: 4px 0 0;">Saudáveis</p>
        </div>
        <div style="flex: 1; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="font-size: 28px; font-weight: bold; color: #ca8a04; margin: 0;">{{sitesWarning}}</p>
          <p style="font-size: 12px; color: #facc15; margin: 4px 0 0;">Avisos</p>
        </div>
        <div style="flex: 1; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="font-size: 28px; font-weight: bold; color: #dc2626; margin: 0;">{{sitesCritical}}</p>
          <p style="font-size: 12px; color: #f87171; margin: 4px 0 0;">Críticos</p>
        </div>
      </div>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        Uptime: <strong>{{uptimePercentage}}%</strong> &bull;
        Total de sites: <strong>{{sitesTotal}}</strong>
      </p>
    </div>
    <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Este relatório foi gerado automaticamente pelo ArtnaCare.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Aplica os dados ao modelo HTML (substitui placeholders).
 */
export function applyReportTemplate(templateHtml: string, data: ReportData): string {
  return templateHtml
    .replace(/\{\{clientName\}\}/g, data.clientName)
    .replace(/\{\{period\}\}/g, data.period)
    .replace(/\{\{sitesTotal\}\}/g, String(data.sitesTotal))
    .replace(/\{\{sitesHealthy\}\}/g, String(data.sitesHealthy))
    .replace(/\{\{sitesWarning\}\}/g, String(data.sitesWarning))
    .replace(/\{\{sitesCritical\}\}/g, String(data.sitesCritical))
    .replace(/\{\{uptimePercentage\}\}/g, String(data.uptimePercentage))
    .replace(/\{\{siteStatus\}\}/g, data.siteStatus ?? "")
    .replace(/\{\{siteUrl\}\}/g, data.siteUrl ?? "")
    .replace(/\{\{maintenanceRecordsSection\}\}/g, data.maintenanceRecordsSection ?? "");
}

/**
 * Gera o HTML do relatório a partir do modelo (padrão ou customizado) e dos dados.
 */
export function generateReportEmailHtml(data: ReportData, templateHtml?: string | null): string {
  const template = templateHtml ?? getDefaultReportTemplate();
  return applyReportTemplate(template, data);
}
