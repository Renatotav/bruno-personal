"use server";

import { prisma } from "@/lib/db";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

async function getCurrentHash(): Promise<string> {
  const db = await prisma.configuracao.findUnique({ where: { key: "ADMIN_PASSWORD_HASH" } });
  if (db) return db.value;
  const pwd = process.env.ADMIN_PASSWORD || "admin123";
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

export async function alterarSenha(data: { senhaAtual: string; novaSenha: string }) {
  try {
    const currentHash = await getCurrentHash();
    const inputHash = crypto.createHash("sha256").update(data.senhaAtual).digest("hex");
    if (inputHash !== currentHash) throw new Error("Senha atual incorreta.");
    const newHash = crypto.createHash("sha256").update(data.novaSenha).digest("hex");
    await prisma.configuracao.upsert({
      where: { key: "ADMIN_PASSWORD_HASH" },
      update: { value: newHash },
      create: { key: "ADMIN_PASSWORD_HASH", value: newHash },
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function salvarConfigCarro(data: {
  precoGasolina: number;
  kmPorLitro: number;
  custoPorKm: number;
}) {
  await Promise.all([
    prisma.configuracao.upsert({ where: { key: "preco_gasolina" }, update: { value: String(data.precoGasolina) }, create: { key: "preco_gasolina", value: String(data.precoGasolina) } }),
    prisma.configuracao.upsert({ where: { key: "km_por_litro" }, update: { value: String(data.kmPorLitro) }, create: { key: "km_por_litro", value: String(data.kmPorLitro) } }),
    prisma.configuracao.upsert({ where: { key: "custo_por_km" }, update: { value: String(data.custoPorKm) }, create: { key: "custo_por_km", value: String(data.custoPorKm) } }),
  ]);
  revalidatePath("/configuracoes");
  revalidatePath("/analise");
  revalidatePath("/agenda");
  revalidatePath("/locais");
  revalidatePath("/");
  return { success: true };
}

export async function getConfigCarro() {
  return prisma.configuracao.findMany({
    where: { key: { in: ["preco_gasolina", "km_por_litro", "custo_por_km"] } },
  });
}

export async function getAllConfigs() {
  return prisma.configuracao.findMany();
}

export async function salvarEndereco(data: { endereco: string }) {
  await prisma.configuracao.upsert({
    where: { key: "endereco" },
    update: { value: data.endereco },
    create: { key: "endereco", value: data.endereco },
  });
  revalidatePath("/configuracoes");
  return { success: true };
}

export async function salvarMetaFaturamento(data: { meta: number }) {
  await prisma.configuracao.upsert({
    where: { key: "meta_faturamento" },
    update: { value: String(data.meta) },
    create: { key: "meta_faturamento", value: String(data.meta) },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { success: true };
}

export async function salvarCustosFixos(data: {
  ipvaAnual: number;
  seguroAnual: number;
  dpvatAnual: number;
  manutencaoAnual: number;
  kmPorMes: number;
}) {
  await Promise.all([
    prisma.configuracao.upsert({ where: { key: "ipva_anual" }, update: { value: String(data.ipvaAnual) }, create: { key: "ipva_anual", value: String(data.ipvaAnual) } }),
    prisma.configuracao.upsert({ where: { key: "seguro_anual" }, update: { value: String(data.seguroAnual) }, create: { key: "seguro_anual", value: String(data.seguroAnual) } }),
    prisma.configuracao.upsert({ where: { key: "dpvat_anual" }, update: { value: String(data.dpvatAnual) }, create: { key: "dpvat_anual", value: String(data.dpvatAnual) } }),
    prisma.configuracao.upsert({ where: { key: "manutencao_anual" }, update: { value: String(data.manutencaoAnual) }, create: { key: "manutencao_anual", value: String(data.manutencaoAnual) } }),
    prisma.configuracao.upsert({ where: { key: "km_por_mes" }, update: { value: String(data.kmPorMes) }, create: { key: "km_por_mes", value: String(data.kmPorMes) } }),
  ]);
  revalidatePath("/configuracoes");
  revalidatePath("/analise");
  return { success: true };
}
