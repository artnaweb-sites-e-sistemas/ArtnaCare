/**
 * External Integration Stubs
 * These services wrap external APIs. Each is a stub that can be implemented
 * with real API keys from the corresponding service.
 */

// ──────────────────────────────────────────────
// UptimeRobot API
// Docs: https://uptimerobot.com/api/
// ──────────────────────────────────────────────
export async function getUptimeRobotMonitors() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    return { error: "UPTIMEROBOT_API_KEY not configured", monitors: [] };
  }

  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        format: "json",
        logs: 1,
        logs_limit: 90,
        all_time_uptime_ratio: 1,
        response_times: 1,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.stat === "fail") {
      const msg = data.error?.message || data.error?.msg || "UptimeRobot retornou erro";
      return { error: msg, monitors: [] };
    }
    return { error: null, monitors: data.monitors || [] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro de rede";
    return { error: `Falha ao buscar UptimeRobot: ${msg}`, monitors: [] };
  }
}

/**
 * Create a new monitor in UptimeRobot.
 * type 1 = HTTP(s) monitor
 */
export async function createUptimeRobotMonitor(
  friendlyName: string,
  url: string
): Promise<{ monitorId?: string; error?: string }> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    return { error: "UPTIMEROBOT_API_KEY not configured" };
  }

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      format: "json",
      type: "1",
      url: normalizedUrl,
      friendly_name: friendlyName,
    });
    const res = await fetch("https://api.uptimerobot.com/v2/newMonitor", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.stat === "ok" && data.monitor?.id) {
      return { monitorId: String(data.monitor.id) };
    }
    const errMsg = data.error?.message || data.error?.msg || (data.stat === "fail" ? "UptimeRobot recusou a requisição" : null);
    return { error: errMsg || "Falha ao criar monitor no UptimeRobot" };
  } catch (error) {
    return { error: "Falha ao criar monitor no UptimeRobot" };
  }
}

// ──────────────────────────────────────────────
// Google PageSpeed Insights API
// Docs: https://developers.google.com/speed/docs/insights/v5/get-started
// ──────────────────────────────────────────────
export async function getPageSpeedScore(url: string): Promise<{ score: number | null; error: string | null }> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return { score: null, error: "PAGESPEED_API_KEY not configured" };
  }

  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`;
    const res = await fetch(endpoint);
    const data = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    return { score: score !== undefined ? Math.round(score * 100) : null, error: null };
  } catch (error) {
    return { score: null, error: "Failed to fetch PageSpeed data" };
  }
}

// ──────────────────────────────────────────────
// WPScan API
// Docs: https://wpscan.com/api
// ──────────────────────────────────────────────
export async function checkWpScan(domain: string): Promise<{ vulnerabilities: number; error: string | null }> {
  const apiToken = process.env.WPSCAN_API_TOKEN;
  if (!apiToken) {
    return { vulnerabilities: 0, error: "WPSCAN_API_TOKEN not configured" };
  }

  // Stub: In production, call WPScan API with the domain
  // For now, return a placeholder
  return { vulnerabilities: 0, error: null };
}

// ──────────────────────────────────────────────
// Sucuri SiteCheck API
// Docs: https://sitecheck.sucuri.net/api/
// ──────────────────────────────────────────────
export async function checkSucuri(url: string): Promise<{ malwareDetected: boolean; error: string | null }> {
  try {
    const endpoint = `https://sitecheck.sucuri.net/api/v3/?scan=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    const data = await res.json();

    // Check if blacklisted or malware found
    const malwareDetected = data?.warnings?.security?.length > 0 || data?.blacklisted === true;
    return { malwareDetected: !!malwareDetected, error: null };
  } catch (error) {
    return { malwareDetected: false, error: "Failed to check Sucuri" };
  }
}
