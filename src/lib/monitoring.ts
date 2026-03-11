/**
 * Monitoring Services
 * Individual check functions for site health monitoring.
 */

import { MonitoringResult } from "./status-calculator";
import { checkSucuri } from "./integrations";

/**
 * Perform an HTTP health check on a URL.
 * Returns response time and whether the site responds with HTTP 200.
 */
export async function checkHttp(url: string): Promise<{ ok: boolean; responseTimeMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "ArtnaCare-Monitor/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - start;
    return { ok: res.status >= 200 && res.status < 400, responseTimeMs };
  } catch {
    return { ok: false, responseTimeMs: Date.now() - start };
  }
}

/**
 * Check SSL certificate validity (basic).
 * For a full check you'd need a server-side library; this stub checks the URL scheme.
 */
export async function checkSsl(url: string): Promise<{ valid: boolean | null; expiryDays: number | null }> {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== "https:") {
      return { valid: false, expiryDays: null };
    }
    // Basic check: if we can fetch via HTTPS without error, SSL is valid
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    return { valid: true, expiryDays: null }; // Expiry details need server-side cert inspection
  } catch {
    return { valid: false, expiryDays: null };
  }
}

/**
 * Check WordPress version via REST API.
 */
export async function checkWordPress(url: string): Promise<{ version: string | null }> {
  try {
    const wpApiUrl = url.replace(/\/$/, "") + "/wp-json";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(wpApiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ArtnaCare-Monitor/1.0" },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      // WordPress REST API root returns namespace with version info
      if (data?.name) {
        // Try to get version from generator tag
        const generatorMatch = data?.description;
        return { version: data?.namespaces?.includes("wp/v2") ? "Detected" : null };
      }
    }
    return { version: null };
  } catch {
    return { version: null };
  }
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `https://${trimmed}`
}

/**
 * Run all monitoring checks for a site URL.
 */
export async function runAllChecks(url: string, type: string): Promise<MonitoringResult> {
  const normalizedUrl = normalizeUrl(url)
  const [httpResult, sslResult, wpResult, sucuriResult] = await Promise.all([
    checkHttp(normalizedUrl),
    checkSsl(normalizedUrl),
    type === "WordPress" ? checkWordPress(normalizedUrl) : Promise.resolve({ version: null }),
    checkSucuri(normalizedUrl),
  ]);

  return {
    httpOk: httpResult.ok,
    responseTimeMs: httpResult.responseTimeMs,
    sslValid: sslResult.valid,
    sslExpiryDays: sslResult.expiryDays,
    wpVersion: wpResult.version,
    wpPluginsOutdated: 0, // Will be populated by WP plugin endpoint
    wpThemeOutdated: false,
    malwareDetected: sucuriResult.malwareDetected,
    performanceScore: null, // Will be populated by PageSpeed API
  };
}
