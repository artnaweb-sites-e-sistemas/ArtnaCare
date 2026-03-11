import { NextResponse } from "next/server";
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getSites, updateSite } from "@/lib/firebase/sites";
import { runAllChecks } from "@/lib/monitoring";
import { calculateStatus } from "@/lib/status-calculator";

/**
 * POST /api/cron/monitoring
 * Runs monitoring checks on all registered sites and stores results.
 * Can be invoked by a CRON job (e.g., Vercel Cron) or manually.
 */
export async function POST(request: Request) {
  try {
    // Optional: verify CRON secret in production
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const sites = await getSites();

    if (sites.length === 0) {
      return NextResponse.json({ message: "No sites to monitor", results: [] });
    }

    const results = [];

    for (const site of sites) {
      try {
        // Run all monitoring checks
        const monitoringResult = await runAllChecks(site.url, site.type);
        const statusResult = calculateStatus(monitoringResult);

        // Update site status in Firestore
        await updateSite(site.id!, {
          status: statusResult.status,
          sslValid: monitoringResult.sslValid ?? undefined,
          responseTime: monitoringResult.responseTimeMs ?? undefined,
          wpVersion: monitoringResult.wpVersion ?? undefined,
        });

        // Save monitoring log entry
        const logsRef = collection(db, "monitoring_logs");
        await addDoc(logsRef, {
          siteId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          status: statusResult.status,
          issues: statusResult.issues,
          httpOk: monitoringResult.httpOk,
          responseTimeMs: monitoringResult.responseTimeMs,
          sslValid: monitoringResult.sslValid,
          sslExpiryDays: monitoringResult.sslExpiryDays,
          wpVersion: monitoringResult.wpVersion,
          malwareDetected: monitoringResult.malwareDetected,
          performanceScore: monitoringResult.performanceScore,
          checkedAt: serverTimestamp(),
        });

        results.push({
          siteId: site.id,
          name: site.name,
          status: statusResult.status,
          issues: statusResult.issues,
          responseTimeMs: monitoringResult.responseTimeMs,
        });
      } catch (error) {
        console.error(`Error checking site ${site.name}:`, error);
        results.push({
          siteId: site.id,
          name: site.name,
          status: "Error",
          issues: ["Monitoring check failed"],
          responseTimeMs: null,
        });
      }
    }

    return NextResponse.json({
      message: `Monitoring complete. Checked ${results.length} site(s).`,
      results,
    });
  } catch (error) {
    console.error("Monitoring CRON error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/cron/monitoring
 * Returns recent monitoring logs.
 */
export async function GET() {
  try {
    const logsRef = collection(db, "monitoring_logs");
    const q = query(logsRef, orderBy("checkedAt", "desc"));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.slice(0, 100).map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching monitoring logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
