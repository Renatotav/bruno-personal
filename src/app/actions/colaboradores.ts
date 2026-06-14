// @ts-nocheck
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getColaboradores() {
  try {
    return await prisma.colaborador.findMany({
      orderBy: { nome: "asc" },
    });
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    return [];
  }
}

export async function upsertColaborador(formData: {
  id?: string;
  nome: string;
  cargo: string;
  regimePadrao: string;
  ativo?: boolean;
}) {
  try {
    const { id, nome, cargo, regimePadrao, ativo = true } = formData;

    if (!nome || !cargo || !regimePadrao) {
      throw new Error("Campos obrigatórios ausentes.");
    }

    if (id) {
      // Atualização
      await prisma.colaborador.update({
        where: { id },
        data: { nome, cargo, regimePadrao, ativo },
      });
    } else {
      // Criação
      await prisma.colaborador.create({
        data: { nome, cargo, regimePadrao, ativo },
      });
    }

    revalidatePath("/colaboradores");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar colaborador:", error);
    return { success: false, error: error.message || "Erro ao salvar" };
  }
}

export async function deleteColaborador(id: string) {
  try {
    await prisma.colaborador.delete({
      where: { id },
    });

    revalidatePath("/colaboradores");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir colaborador:", error);
    return { success: false, error: "Erro ao excluir. O colaborador pode possuir lançamentos vinculados." };
  }
}
