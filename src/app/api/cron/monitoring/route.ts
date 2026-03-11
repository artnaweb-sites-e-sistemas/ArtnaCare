import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSitesAdmin, updateSiteAdmin, addMonitoringLogAdmin } from "@/lib/firebase/admin-sites";
import { runAllChecks } from "@/lib/monitoring";
import { calculateStatus } from "@/lib/status-calculator";

/**
 * POST /api/cron/monitoring
 * Runs monitoring checks on all registered sites and stores results.
 * Uses Firebase Admin SDK (works on Vercel serverless without user auth).
 */
export async function POST() {
  try {
    const sites = await getSitesAdmin();

    if (sites.length === 0) {
      return NextResponse.json({ message: "No sites to monitor", results: [] });
    }

    const results = [];

    for (const site of sites) {
      try {
        const monitoringResult = await runAllChecks(site.url, site.type);
        const statusResult = calculateStatus(monitoringResult);

        await updateSiteAdmin(site.id!, {
          status: statusResult.status,
          issues: statusResult.issues,
          sslValid: monitoringResult.sslValid ?? undefined,
          responseTime: monitoringResult.responseTimeMs ?? undefined,
          wpVersion: monitoringResult.wpVersion ?? undefined,
        });

        await addMonitoringLogAdmin({
          siteId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          status: statusResult.status,
          issues: statusResult.issues,
          httpOk: monitoringResult.httpOk,
          responseTimeMs: monitoringResult.responseTimeMs ?? undefined,
          sslValid: monitoringResult.sslValid,
          sslExpiryDays: monitoringResult.sslExpiryDays ?? undefined,
          wpVersion: monitoringResult.wpVersion ?? undefined,
          malwareDetected: monitoringResult.malwareDetected,
          performanceScore: monitoringResult.performanceScore ?? undefined,
        });

        results.push({
          siteId: site.id,
          name: site.name,
          url: site.url,
          status: statusResult.status,
          issues: statusResult.issues,
          responseTimeMs: monitoringResult.responseTimeMs ?? null,
          sslValid: monitoringResult.sslValid ?? null,
          wpVersion: monitoringResult.wpVersion ?? null,
        });
      } catch (error) {
        console.error(`Error checking site ${site.name}:`, error);
        results.push({
          siteId: site.id,
          name: site.name,
          url: site.url,
          status: "Error",
          issues: ["Falha na verificação de monitoramento"],
          responseTimeMs: null,
          sslValid: null,
          wpVersion: null,
        });
      }
    }

    return NextResponse.json({
      message: `Monitoring complete. Checked ${results.length} site(s).`,
      results,
    });
  } catch (error) {
    console.error("Monitoring CRON error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/monitoring
 * Returns recent monitoring logs (uses Admin SDK for server-side).
 */
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("monitoring_logs")
      .orderBy("checkedAt", "desc")
      .limit(100)
      .get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      const checkedAt = data.checkedAt;
      let serializedCheckedAt = checkedAt;
      if (checkedAt && typeof checkedAt === "object") {
        const sec = (checkedAt as { seconds?: number }).seconds ?? (checkedAt as { _seconds?: number })._seconds;
        if (typeof sec === "number") {
          serializedCheckedAt = { seconds: sec };
        }
      }
      return {
        id: doc.id,
        ...data,
        checkedAt: serializedCheckedAt,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching monitoring logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
