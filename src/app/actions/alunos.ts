"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAlunos() {
  return prisma.aluno.findMany({
    orderBy: { nome: "asc" },
    include: { aulas: { where: { ativo: true } } },
  });
}

export async function upsertAluno(data: {
  id?: string;
  nome: string;
  telefone?: string;
  ativo?: boolean;
}) {
  try {
    const { id, nome, telefone, ativo = true } = data;
    if (!nome.trim()) throw new Error("Nome obrigatório.");

    if (id) {
      await prisma.aluno.update({ where: { id }, data: { nome, telefone: telefone || null, ativo } });
    } else {
      await prisma.aluno.create({ data: { nome, telefone: telefone || null, ativo } });
    }

    revalidatePath("/alunos");
    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAluno(id: string) {
  try {
    await prisma.aluno.delete({ where: { id } });
    revalidatePath("/alunos");
    revalidatePath("/agenda");
    revalidatePath("/analise");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir. O aluno pode ter aulas cadastradas." };
  }
}
