// @ts-nocheck
import { prisma } from "./db";

export interface ElegibilidadeInfo {
  semanasMesAnterior: number;
  semanasMesAtual: number;
  totalAcumulado: number;
  status: "NEUTRO" | "ATENCAO" | "ELEGIVEL" | "CRITICO";
  tag: string;
  corClass: string;
  badgeClass: string;
}

export async function calcularElegibilidade(colaboradorId: string): Promise<ElegibilidadeInfo> {
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1; // 1-12
  const anoAtual = agora.getFullYear();

  // Calcula o mês anterior
  let mesAnterior = mesAtual - 1;
  let anoAnterior = anoAtual;
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = anoAtual - 1;
  }

  // Busca todas as escalas do colaborador para o mês anterior e o atual
  const escalas = await prisma.escalaSemana.findMany({
    where: {
      colaboradorId,
      OR: [
        { ano: anoAnterior, mes: mesAnterior },
        { ano: anoAtual, mes: mesAtual },
      ],
    },
    orderBy: [
      { ano: "asc" },
      { semanaNumero: "asc" },
    ],
  });

  // Calcula o total acumulado consecutivamente terminando na última semana cadastrada
  // Ou simplesmente o total consecutivo das últimas escalas
  let totalConsecutivo = 0;
  let semanasMesAnterior = 0;
  let semanasMesAtual = 0;

  // Conta escalas presenciais nos meses
  escalas.forEach((esc) => {
    if (esc.regime === "PRESENCIAL") {
      if (esc.ano === anoAtual && esc.mes === mesAtual) {
        semanasMesAtual++;
      } else if (esc.ano === anoAnterior && esc.mes === mesAnterior) {
        semanasMesAnterior++;
      }
    }
  });

  // Calcula sequência consecutiva de semanas presenciais (da mais antiga para a mais recente)
  // Para ser "consecutiva", percorremos de trás para frente a partir do último registro
  const escalasReversas = [...escalas].reverse();
  for (const esc of escalasReversas) {
    if (esc.regime === "PRESENCIAL") {
      totalConsecutivo++;
    } else {
      break; // Quebrou a sequência consecutiva presencial
    }
  }

  // Se não houver escalas cadastradas, o total é 0
  const total = totalConsecutivo;

  let status: "NEUTRO" | "ATENCAO" | "ELEGIVEL" | "CRITICO" = "NEUTRO";
  let tag = "";
  let corClass = "text-slate-300 bg-slate-800/40 border-slate-700";
  let badgeClass = "bg-slate-900 border-slate-800 text-slate-400";

  if (total >= 1 && total <= 2) {
    status = "NEUTRO";
    tag = "Regular";
    corClass = "bg-slate-900/60 text-slate-300 border-slate-800";
    badgeClass = "bg-slate-800/80 border-slate-700 text-slate-300";
  } else if (total === 3) {
    status = "ATENCAO";
    tag = "ATENÇÃO - 3 SEMANAS PRESENCIAL";
    corClass = "bg-yellow-950/20 text-yellow-400 border-yellow-800/40";
    badgeClass = "bg-yellow-950/40 border-yellow-800 text-yellow-400";
  } else if (total >= 4 && total <= 6) {
    status = "ELEGIVEL";
    tag = "ELEGÍVEL PARA REMOTO - AGENDAR TRANSIÇÃO";
    corClass = "bg-red-950/20 text-red-400 border-red-800/30";
    badgeClass = "bg-red-950/50 border-red-800 text-red-400";
  } else if (total > 6) {
    status = "CRITICO";
    tag = "ALERTA CRÍTICO - MAIS DE 6 SEMANAS PRESENCIAL";
    corClass = "bg-red-950/30 text-red-400 border-red-500 animate-pulse border-2 shadow-lg shadow-red-950/50";
    badgeClass = "bg-red-900 border-red-500 text-red-100 animate-pulse font-bold";
  }

  return {
    semanasMesAnterior,
    semanasMesAtual,
    totalAcumulado: total,
    status,
    tag,
    corClass,
    badgeClass,
  };
}
