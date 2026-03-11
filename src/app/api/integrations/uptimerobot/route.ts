import { NextResponse } from "next/server";
import { getUptimeRobotMonitors } from "@/lib/integrations";

/**
 * GET /api/integrations/uptimerobot
 * Retorna os monitores do UptimeRobot (requer UPTIMEROBOT_API_KEY).
 */
export async function GET() {
  try {
    const result = await getUptimeRobotMonitors();
    return NextResponse.json(result);
  } catch (error) {
    console.error("UptimeRobot API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch UptimeRobot data", monitors: [] },
      { status: 500 }
    );
  }
}
