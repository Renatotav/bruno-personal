// @ts-nocheck
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEscalasBySemana(ano: number, mes: number, semanaNumero: number) {
  try {
    // 1. Busca todos os colaboradores ativos
    const colaboradores = await prisma.colaborador.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });

    // 2. Busca os registros de escala existentes para a semana selecionada
    const escalasExistentes = await prisma.escalaSemana.findMany({
      where: { ano, mes, semanaNumero },
    });

    // 3. Mescla e monta o grid, definindo o regime padrão caso não exista registro
    const grid = colaboradores.map((colab) => {
      const escala = escalasExistentes.find((esc) => esc.colaboradorId === colab.id);
      
      // Regime inicial: se já tiver escala salva usa ela, caso contrário usa o regime padrão
      // Ajustado para se adequar ao escopo da escala ("PRESENCIAL" ou "REMOTO")
      let regimeSemana = "PRESENCIAL";
      if (escala) {
        regimeSemana = escala.regime;
      } else if (colab.regimePadrao === "REMOTO") {
        regimeSemana = "REMOTO";
      }

      return {
        colaboradorId: colab.id,
        nome: colab.nome,
        cargo: colab.cargo,
        regimePadrao: colab.regimePadrao,
        regimeSemana,
        escalaId: escala?.id || null,
      };
    });

    return grid;
  } catch (error) {
    console.error("Erro ao carregar grid de escalas:", error);
    return [];
  }
}

export async function salvarEscala(formData: {
  colaboradorId: string;
  ano: number;
  mes: number;
  semanaNumero: number;
  regime: "PRESENCIAL" | "REMOTO";
}) {
  try {
    const { colaboradorId, ano, mes, semanaNumero, regime } = formData;

    if (!colaboradorId || !ano || !mes || !semanaNumero || !regime) {
      throw new Error("Dados de escala incompletos.");
    }

    const escalaExistente = await prisma.escalaSemana.findUnique({
      where: {
        colaboradorId_ano_mes_semanaNumero: {
          colaboradorId,
          ano,
          mes,
          semanaNumero,
        },
      },
    });

    if (escalaExistente) {
      await prisma.escalaSemana.update({
        where: { id: escalaExistente.id },
        data: { regime },
      });
    } else {
      await prisma.escalaSemana.create({
        data: {
          colaboradorId,
          ano,
          mes,
          semanaNumero,
          regime,
        },
      });
    }

    revalidatePath("/escala");
    revalidatePath("/relatorio");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar escala:", error);
    return { success: false, error: error.message || "Erro ao salvar" };
  }
}
