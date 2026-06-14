import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE_NAME = "agent_session";

// Função para gerar um hash seguro da senha administrativa (lê do banco ou do env)
async function getExpectedHash(): Promise<string> {
  try {
    const dbConfig = await prisma.configuracao.findUnique({
      where: { key: "ADMIN_PASSWORD_HASH" },
    });
    if (dbConfig) {
      return dbConfig.value;
    }
  } catch (error) {
    console.error("Erro ao buscar hash de senha no banco, usando fallback de ENV:", error);
  }

  const password = process.env.ADMIN_PASSWORD || "admin123";
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return false;

  const expectedHash = await getExpectedHash();
  return session.value === expectedHash;
}

export async function setSessionCookie() {
  const cookieStore = await cookies();
  const hash = await getExpectedHash();

  cookieStore.set({
    name: COOKIE_NAME,
    value: hash,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 dias em segundos
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
