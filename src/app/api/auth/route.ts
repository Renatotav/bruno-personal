import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      await setSessionCookie();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
