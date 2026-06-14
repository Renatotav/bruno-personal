"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getLocais() {
  return prisma.local.findMany({
    orderBy: [{ bairro: "asc" }, { nome: "asc" }],
    include: { aulas: { where: { ativo: true } } },
  });
}

export async function upsertLocal(data: {
  id?: string;
  nome: string;
  tipo: string;
  bairro: string;
  distanciaKm: number;
  tempoMinutos: number;
}) {
  try {
    const { id, nome, tipo, bairro, distanciaKm, tempoMinutos } = data;
    if (!nome.trim() || !bairro.trim()) throw new Error("Nome e Bairro são obrigatórios.");

    const payload = { nome, tipo, bairro, distanciaKm, tempoMinutos };

    if (id) {
      await prisma.local.update({ where: { id }, data: payload });
    } else {
      await prisma.local.create({ data: payload });
    }

    revalidatePath("/locais");
    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteLocal(id: string) {
  try {
    await prisma.local.delete({ where: { id } });
    revalidatePath("/locais");
    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir. O local pode ter aulas cadastradas." };
  }
}
