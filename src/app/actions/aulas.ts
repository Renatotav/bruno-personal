"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAulas() {
  return prisma.aulaSemanal.findMany({
    orderBy: [{ diaDaSemana: "asc" }, { horarioInicio: "asc" }],
    include: { aluno: true, local: true },
  });
}

export async function upsertAula(data: {
  id?: string;
  alunoId: string;
  localId: string;
  diaDaSemana: number;
  horarioInicio: string;
  horarioFim: string;
  valorAula: number;
  ativo?: boolean;
}) {
  try {
    const { id, alunoId, localId, diaDaSemana, horarioInicio, horarioFim, valorAula, ativo = true } = data;
    if (!alunoId || !localId) throw new Error("Aluno e Local são obrigatórios.");
    if (!horarioInicio || !horarioFim) throw new Error("Horários obrigatórios.");
    if (valorAula <= 0) throw new Error("Valor da aula deve ser maior que zero.");

    const payload = { alunoId, localId, diaDaSemana, horarioInicio, horarioFim, valorAula, ativo };

    if (id) {
      await prisma.aulaSemanal.update({ where: { id }, data: payload });
    } else {
      await prisma.aulaSemanal.create({ data: payload });
    }

    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAula(id: string) {
  try {
    await prisma.aulaSemanal.delete({ where: { id } });
    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir aula." };
  }
}

export async function getConfiguracoes() {
  return prisma.configuracao.findMany();
}

export async function salvarConfiguracao(key: string, value: string) {
  await prisma.configuracao.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/analise");
  revalidatePath("/");
}
