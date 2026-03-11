/**
 * Centralized Status Calculator
 * Takes raw monitoring results and determines the overall status for a site.
 */

export interface MonitoringResult {
  httpOk: boolean;
  responseTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiryDays: number | null;
  wpVersion: string | null;
  wpPluginsOutdated: number;
  wpThemeOutdated: boolean;
  malwareDetected: boolean;
  performanceScore: number | null; // 0-100
}

export type SiteStatus = "Healthy" | "Warning" | "Critical" | "Unknown";

export interface StatusResult {
  status: SiteStatus;
  issues: string[];
}

/**
 * Calculate the overall status from monitoring results.
 * Priority: Critical > Warning > Healthy
 */
export function calculateStatus(result: MonitoringResult): StatusResult {
  const issues: string[] = [];
  let hasCritical = false;
  let hasWarning = false;

  // HTTP Check
  if (!result.httpOk) {
    issues.push("Site offline ou inacessível");
    hasCritical = true;
  }

  // Response Time
  if (result.responseTimeMs !== null) {
    if (result.responseTimeMs > 5000) {
      issues.push(`Tempo de resposta muito lento (${result.responseTimeMs} ms)`);
      hasCritical = true;
    } else if (result.responseTimeMs > 2000) {
      issues.push(`Tempo de resposta lento (${result.responseTimeMs} ms)`);
      hasWarning = true;
    }
  }

  // SSL
  if (result.sslValid === false) {
    issues.push("Certificado SSL inválido");
    hasCritical = true;
  } else if (result.sslExpiryDays !== null && result.sslExpiryDays < 14) {
    issues.push(`SSL expira em ${result.sslExpiryDays} dias`);
    hasWarning = true;
  }

  // Malware
  if (result.malwareDetected) {
    issues.push("Malware detectado");
    hasCritical = true;
  }

  // WordPress Plugins
  if (result.wpPluginsOutdated > 5) {
    issues.push(`${result.wpPluginsOutdated} plugins desatualizados`);
    hasWarning = true;
  } else if (result.wpPluginsOutdated > 0) {
    issues.push(`${result.wpPluginsOutdated} plugin(s) desatualizado(s)`);
  }

  // Performance
  if (result.performanceScore !== null) {
    if (result.performanceScore < 30) {
      issues.push(`Performance baixa (${result.performanceScore}/100)`);
      hasWarning = true;
    } else if (result.performanceScore < 50) {
      issues.push(`Performance abaixo da média (${result.performanceScore}/100)`);
    }
  }

  let status: SiteStatus;
  if (hasCritical) {
    status = "Critical";
  } else if (hasWarning) {
    status = "Warning";
  } else if (!result.httpOk && result.responseTimeMs === null) {
    status = "Unknown";
  } else {
    status = "Healthy";
  }

  return { status, issues };
}
