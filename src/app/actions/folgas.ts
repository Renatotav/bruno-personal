// @ts-nocheck
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getFolgasByColaborador(colaboradorId: string) {
  try {
    return await prisma.folga.findMany({
      where: { colaboradorId },
      orderBy: { data: "desc" },
    });
  } catch (error) {
    console.error("Erro ao listar folgas:", error);
    return [];
  }
}

export async function salvarFolga(formData: {
  colaboradorId: string;
  dataStr: string;
  tipo: "GERADA" | "GOZADA";
  origem: "SABADO" | "DOMINGO" | "FERIADO" | "MANUAL";
  justificativa: string;
}) {
  try {
    const { colaboradorId, dataStr, tipo, origem, justificativa } = formData;

    if (!colaboradorId || !dataStr || !tipo || !origem) {
      throw new Error("Colaborador, Data, Tipo e Origem são obrigatórios.");
    }

    const [year, month, day] = dataStr.split("-").map(Number);
    const dataFolga = new Date(year, month - 1, day, 12, 0, 0, 0);

    const folga = await prisma.folga.create({
      data: {
        colaboradorId,
        data: dataFolga,
        tipo,
        origem,
        justificativa,
      },
    });

    revalidatePath("/folgas");
    revalidatePath("/relatorio");
    revalidatePath("/");

    return { success: true, folga };
  } catch (error: any) {
    console.error("Erro ao registrar folga:", error);
    return { success: false, error: error.message || "Erro ao salvar" };
  }
}

export async function excluirFolga(id: string) {
  try {
    await prisma.folga.delete({
      where: { id },
    });

    revalidatePath("/folgas");
    revalidatePath("/relatorio");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir folga:", error);
    return { success: false, error: "Erro ao excluir folga." };
  }
}
