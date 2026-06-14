// @ts-nocheck
"use server";

import { prisma } from "@/lib/db";
import { checkHoliday } from "@/lib/holidays";
import { revalidatePath } from "next/cache";

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function getPontosByColaborador(colaboradorId: string) {
  try {
    return await prisma.registroPonto.findMany({
      where: { colaboradorId },
      orderBy: { data: "desc" },
    });
  } catch (error) {
    console.error("Erro ao listar pontos:", error);
    return [];
  }
}

export async function salvarPonto(formData: {
  colaboradorId: string;
  dataStr: string; // "YYYY-MM-DD"
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
}) {
  try {
    const { colaboradorId, dataStr, entrada1, saida1, entrada2, saida2 } = formData;

    if (!colaboradorId || !dataStr) {
      throw new Error("Colaborador e Data são obrigatórios.");
    }

    // Converte a data string para objeto Date ajustando o fuso horário para UTC/local consistente
    const [year, month, day] = dataStr.split("-").map(Number);
    const dataPonto = new Date(year, month - 1, day, 12, 0, 0, 0); // Define meio-dia para evitar desvios

    // 1. Calcula as horas trabalhadas
    const mEntrada1 = timeToMinutes(entrada1);
    const mSaida1 = timeToMinutes(saida1);
    const mEntrada2 = timeToMinutes(entrada2);
    const mSaida2 = timeToMinutes(saida2);

    let minutosTrabalhados = 0;
    if (mSaida1 > mEntrada1) minutosTrabalhados += (mSaida1 - mEntrada1);
    if (mSaida2 > mEntrada2) minutosTrabalhados += (mSaida2 - mEntrada2);

    const horasTrabalhadas = minutosTrabalhados / 60;

    // 2. Verifica se o dia é feriado
    const holidayCheck = await checkHoliday(dataPonto);
    const isFeriado = holidayCheck.isHoliday;

    // 3. Determina a carga esperada do dia da semana (0-6: Dom-Sab)
    const diaSemana = dataPonto.getDay();
    let expectedHours = 0;

    if (isFeriado) {
      expectedHours = 0; // Feriado trabalhado é 100% extra
    } else {
      switch (diaSemana) {
        case 0: // Domingo
        case 6: // Sábado
          expectedHours = 8;
          break;
        case 5: // Sexta-feira
          expectedHours = 8;
          break;
        default: // Segunda a Quinta
          expectedHours = 9;
          break;
      }
    }

    const expectedMinutes = expectedHours * 60;
    const saldoMinutos = minutosTrabalhados - expectedMinutes;

    // 4. Salva ou atualiza o ponto no banco
    const registroExistente = await prisma.registroPonto.findUnique({
      where: {
        colaboradorId_data: {
          colaboradorId,
          data: dataPonto,
        },
      },
    });

    let pontoSalvo;
    if (registroExistente) {
      pontoSalvo = await prisma.registroPonto.update({
        where: { id: registroExistente.id },
        data: {
          entrada1,
          saida1,
          entrada2,
          saida2,
          horasTrabalhadas,
          saldoMinutos,
          isFeriado,
        },
      });
    } else {
      pontoSalvo = await prisma.registroPonto.create({
        data: {
          colaboradorId,
          data: dataPonto,
          entrada1,
          saida1,
          entrada2,
          saida2,
          horasTrabalhadas,
          saldoMinutos,
          isFeriado,
        },
      });
    }

    // 5. Gerenciamento automático de folgas decorrentes deste lançamento
    // Apaga folgas geradas anteriormente para este colaborador na mesma data (caso seja uma re-edição)
    await prisma.folga.deleteMany({
      where: {
        colaboradorId,
        data: dataPonto,
        tipo: "GERADA",
      },
    });

    // Se trabalhou no dia, avalia a geração de folgas
    if (minutosTrabalhados > 0) {
      if (isFeriado) {
        // Feriado trabalhado gera +2 folgas
        await prisma.folga.createMany({
          data: [
            { colaboradorId, data: dataPonto, tipo: "GERADA", origem: "FERIADO", justificativa: `Trabalho no Feriado: ${holidayCheck.name}` },
            { colaboradorId, data: dataPonto, tipo: "GERADA", origem: "FERIADO", justificativa: `Trabalho no Feriado: ${holidayCheck.name}` },
          ],
        });
      } else if (diaSemana === 0) {
        // Domingo trabalhado gera +2 folgas
        await prisma.folga.createMany({
          data: [
            { colaboradorId, data: dataPonto, tipo: "GERADA", origem: "DOMINGO", justificativa: "Plantão de Domingo" },
            { colaboradorId, data: dataPonto, tipo: "GERADA", origem: "DOMINGO", justificativa: "Plantão de Domingo" },
          ],
        });
      } else if (diaSemana === 6) {
        // Sábado trabalhado gera +1 folga
        await prisma.folga.create({
          data: {
            colaboradorId,
            data: dataPonto,
            tipo: "GERADA",
            origem: "SABADO",
            justificativa: "Plantão de Sábado",
          },
        });
      }
    }

    revalidatePath("/lancamento");
    revalidatePath("/banco-horas");
    revalidatePath("/folgas");
    revalidatePath("/");

    return { success: true, isFeriado, holidayName: holidayCheck.name };
  } catch (error: any) {
    console.error("Erro ao salvar ponto:", error);
    return { success: false, error: error.message || "Erro ao salvar" };
  }
}

export async function excluirPonto(id: string) {
  try {
    const ponto = await prisma.registroPonto.findUnique({ where: { id } });
    if (ponto) {
      // Exclui folgas geradas no mesmo dia do ponto
      await prisma.folga.deleteMany({
        where: {
          colaboradorId: ponto.colaboradorId,
          data: ponto.data,
          tipo: "GERADA",
        },
      });

      await prisma.registroPonto.delete({ where: { id } });
    }

    revalidatePath("/lancamento");
    revalidatePath("/banco-horas");
    revalidatePath("/folgas");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir ponto:", error);
    return { success: false, error: "Erro ao excluir ponto." };
  }
}

export async function salvarAjusteManual(formData: {
  colaboradorId: string;
  dataStr: string;
  minutos: number;
  justificativa: string;
}) {
  try {
    const { colaboradorId, dataStr, minutos, justificativa } = formData;

    const [year, month, day] = dataStr.split("-").map(Number);
    const dataAjuste = new Date(year, month - 1, day, 12, 0, 0, 0);

    // Ajustes não têm horários de batida, então salvamos nulo para indicar ajuste manual
    // E definimos saldoMinutos diretamente com o valor do ajuste.
    // E horasTrabalhadas como 0 para não interferir nas horas brutas reais trabalhadas.
    await prisma.registroPonto.upsert({
      where: {
        colaboradorId_data: {
          colaboradorId,
          data: dataAjuste,
        },
      },
      update: {
        entrada1: null,
        saida1: null,
        entrada2: null,
        saida2: null,
        horasTrabalhadas: 0,
        saldoMinutos: minutos,
        isFeriado: false,
      },
      create: {
        colaboradorId,
        data: dataAjuste,
        entrada1: null,
        saida1: null,
        entrada2: null,
        saida2: null,
        horasTrabalhadas: 0,
        saldoMinutos: minutos,
        isFeriado: false,
      },
    });

    revalidatePath("/lancamento");
    revalidatePath("/banco-horas");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar ajuste manual:", error);
    return { success: false, error: error.message || "Erro ao salvar ajuste." };
  }
}

