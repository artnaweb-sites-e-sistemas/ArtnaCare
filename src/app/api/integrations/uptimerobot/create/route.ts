import { NextResponse } from "next/server";
import { createUptimeRobotMonitor } from "@/lib/integrations";

/**
 * POST /api/integrations/uptimerobot/create
 * Cria um monitor no UptimeRobot para um site cadastrado na ArtnaCare.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url } = body;
    if (!name || !url) {
      return NextResponse.json(
        { error: "name e url são obrigatórios" },
        { status: 400 }
      );
    }
    const result = await createUptimeRobotMonitor(name, url);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ monitorId: result.monitorId });
  } catch (error) {
    console.error("UptimeRobot create monitor error:", error);
    return NextResponse.json(
      { error: "Erro ao criar monitor no UptimeRobot" },
      { status: 500 }
    );
  }
}
