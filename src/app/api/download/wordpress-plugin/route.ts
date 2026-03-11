import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/download/wordpress-plugin
 * Retorna o plugin ArtnaCare compactado (.zip) para download.
 */
export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), "docs", "wordpress-plugin.zip");
    const buffer = await readFile(zipPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="artnacare-updates.zip"',
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error serving plugin zip:", error);
    return NextResponse.json({ error: "Plugin não encontrado" }, { status: 404 });
  }
}
