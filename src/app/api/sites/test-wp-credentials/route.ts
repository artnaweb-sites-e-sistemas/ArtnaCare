import { NextResponse } from "next/server";

/**
 * POST /api/sites/test-wp-credentials
 * Testa se as credenciais WordPress (usuário + senha de aplicação) funcionam.
 * Body: { url: string, wpAdminUser: string, wpAdminPassword: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const wpAdminUser = typeof body.wpAdminUser === "string" ? body.wpAdminUser.trim() : "";
    const wpAdminPassword = typeof body.wpAdminPassword === "string" ? body.wpAdminPassword.trim() : "";

    if (!url) {
      return NextResponse.json({ ok: false, error: "URL do site é obrigatória." }, { status: 400 });
    }
    if (!wpAdminUser || !wpAdminPassword) {
      return NextResponse.json(
        { ok: false, error: "Preencha o usuário e a senha de aplicação para testar." },
        { status: 400 }
      );
    }

    let baseUrl = url.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(baseUrl)) baseUrl = "https://" + baseUrl;
    const siteRoot = baseUrl.replace(/\/wp-admin\/?.*$/i, "").replace(/\/$/, "");
    const usersMeUrl = `${siteRoot}/wp-json/wp/v2/users/me`;

    const pwd = wpAdminPassword.replace(/\s/g, "");
    const auth = Buffer.from(`${wpAdminUser}:${pwd}`, "utf-8").toString("base64");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(usersMeUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "ArtnaCare-Monitor/1.0",
        Authorization: `Basic ${auth}`,
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      return NextResponse.json({
        ok: false,
        error: "Credenciais recusadas. Confira se você usou a senha de aplicação (não a senha de login do WordPress).",
      });
    }
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `O site respondeu com status ${res.status}. Verifique a URL e se o WordPress está acessível.`,
      });
    }

    const data = await res.json().catch(() => null);
    if (data && typeof data === "object" && ("id" in data || "slug" in data || "name" in data)) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({
      ok: false,
      error: "Resposta inesperada da API. Confira usuário e senha de aplicação.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao testar a conexão.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
