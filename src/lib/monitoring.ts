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
 * Check WordPress version via REST API (public).
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
      if (data?.name && data?.namespaces?.includes("wp/v2")) {
        const version = (data as { gmt_offset?: number; version?: string }).version ?? null;
        return { version: version || "Detected" };
      }
    }
    return { version: null };
  } catch {
    return { version: null };
  }
}

export interface WordPressCredentials {
  wpUser: string;
  wpApplicationPassword: string;
}

/**
 * Check WordPress plugins via REST API (requires Application Password).
 * GET /wp/v2/plugins returns list; optional endpoint /artnacare/v1/updates can return plugins_outdated.
 */
/** Remove espaços da senha de aplicação (WordPress aceita com ou sem, mas alguns clientes têm problemas). */
function normalizeApplicationPassword(pwd: string): string {
  return (pwd ?? "").replace(/\s/g, "").trim();
}

export async function checkWordPressPlugins(
  url: string,
  credentials: WordPressCredentials
): Promise<{ pluginsCount: number; pluginsOutdated: number; wpVersion: string | null }> {
  const baseUrl = url.replace(/\/$/, "");
  const wpJson = baseUrl + "/wp-json";
  const pwd = normalizeApplicationPassword(credentials.wpApplicationPassword);
  const auth = Buffer.from(`${credentials.wpUser}:${pwd}`).toString("base64");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const headers: Record<string, string> = {
      "User-Agent": "ArtnaCare-Monitor/1.0",
      Authorization: `Basic ${auth}`,
    };

    // 1) Optional: ArtnaCare plugin endpoint (retorna plugins_outdated se o site tiver o plugin)
    let pluginsOutdated = 0;
    try {
      const updatesRes = await fetch(`${wpJson}/artnacare/v1/updates`, {
        signal: controller.signal,
        headers,
      });
      if (updatesRes.ok) {
        const data = (await updatesRes.json()) as { plugins_outdated?: number };
        if (typeof data?.plugins_outdated === "number") {
          pluginsOutdated = data.plugins_outdated;
        }
      }
    } catch {
      // endpoint opcional
    }

    // 2) Lista de plugins: GET /wp/v2/plugins (disponível apenas no WordPress 5.5+)
    let pluginsCount = 0;
    const pluginsRes = await fetch(`${wpJson}/wp/v2/plugins?per_page=100`, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeoutId);

    if (pluginsRes.ok) {
      const pluginsRaw = (await pluginsRes.json()) as unknown;
      let plugins: Array<{ plugin?: string; version?: string }> = [];
      if (Array.isArray(pluginsRaw)) {
        plugins = pluginsRaw;
      } else if (pluginsRaw && typeof pluginsRaw === "object") {
        const obj = pluginsRaw as Record<string, unknown>;
        if (Array.isArray(obj.plugins)) plugins = obj.plugins;
        else if (Array.isArray(obj.items)) plugins = obj.items;
        else if (Array.isArray(obj.data)) plugins = obj.data;
        else if (Array.isArray(obj.results)) plugins = obj.results;
      }
      pluginsCount = plugins.length;
    }

    // 3) Versão do WP: tentar pelo endpoint raiz /wp-json (funciona em qualquer versão)
    let wpVersion: string | null = null;
    try {
      const rootRes = await fetch(wpJson, { signal: controller.signal, headers });
      if (rootRes.ok) {
        const root = (await rootRes.json()) as { version?: string };
        wpVersion = root?.version ?? null;
      }
    } catch {
      // ignora
    }

    return { pluginsCount, pluginsOutdated, wpVersion: wpVersion || null };
  } catch {
    return { pluginsCount: 0, pluginsOutdated: 0, wpVersion: null };
  }
}

function normalizeUrl(url: string): string {
  const trimmed = (url ?? "").toString().trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `https://${trimmed}`
}

/** Tipos de site detectados automaticamente */
export type DetectedSiteType =
  | "WordPress"
  | "Next.js"
  | "React"
  | "PHP"
  | "HTML"
  | "Desconhecido"

/**
 * Detecta o tipo/tecnologia do site via resposta HTTP (headers + corpo).
 */
export async function detectSiteType(url: string): Promise<DetectedSiteType> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(normalizeUrl(url), {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ArtnaCare-Monitor/1.0" },
    });
    const poweredBy = (res.headers.get("x-powered-by") ?? "").toLowerCase();
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const isHtml = contentType.includes("text/html");
    let body = "";
    if (isHtml && res.ok) {
      body = await res.text();
      if (body.length > 80000) body = body.slice(0, 80000);
    }
    clearTimeout(timeoutId);

    const slice = body.toLowerCase();

    if (
      /wp-json|wp-content\/|wp-includes\/|"generator"[^>]*content="[^"]*wordpress/i.test(slice) ||
      /href="[^"]*\/wp-json\//i.test(slice)
    ) {
      return "WordPress";
    }
    if (/__next_data__|__NEXT_DATA__/i.test(slice)) return "Next.js";
    if (/data-reactroot|react-dom|createelement|id=["']root["']/i.test(slice)) return "React";
    if (/php\/|php\s/i.test(poweredBy)) return "PHP";
    if (/<!doctype\s+html|<\/html>/i.test(slice)) return "HTML";

    return "Desconhecido";
  } catch {
    return "Desconhecido";
  }
}

/**
 * Run all monitoring checks for a site URL.
 * For WordPress, pass optional credentials (Application Password) to detect plugins e plugins desatualizados.
 */
export async function runAllChecks(
  url: string,
  type: string,
  options?: { wpUser?: string; wpApplicationPassword?: string }
): Promise<MonitoringResult> {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    throw new Error("URL do site não informada ou inválida.");
  }
  const isWordPress = type === "WordPress";
  const hasWpAuth =
    isWordPress &&
    options?.wpUser &&
    options?.wpApplicationPassword &&
    options.wpUser.trim() !== "" &&
    options.wpApplicationPassword.trim() !== "";

  const [httpResult, sslResult, wpResult, wpPluginsResult, sucuriResult, siteType] = await Promise.all([
    checkHttp(normalizedUrl),
    checkSsl(normalizedUrl),
    isWordPress ? checkWordPress(normalizedUrl) : Promise.resolve({ version: null }),
    hasWpAuth
      ? checkWordPressPlugins(normalizedUrl, {
          wpUser: options!.wpUser!,
          wpApplicationPassword: options!.wpApplicationPassword!,
        })
      : Promise.resolve({ pluginsCount: 0, pluginsOutdated: 0, wpVersion: null }),
    checkSucuri(normalizedUrl),
    detectSiteType(normalizedUrl),
  ]);

  const wpVersion = hasWpAuth && wpPluginsResult.wpVersion ? wpPluginsResult.wpVersion : wpResult.version;
  const wpPluginsOutdated = hasWpAuth ? wpPluginsResult.pluginsOutdated : 0;

  return {
    httpOk: httpResult.ok,
    responseTimeMs: httpResult.responseTimeMs,
    sslValid: sslResult.valid,
    sslExpiryDays: sslResult.expiryDays,
    wpVersion,
    wpPluginsOutdated,
    wpThemeOutdated: false,
    malwareDetected: sucuriResult.malwareDetected,
    performanceScore: null,
    siteType,
  };
}
