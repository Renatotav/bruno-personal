// @ts-nocheck
import { prisma } from "./db";

// Feriados fixos (formato: "MM-DD")
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Confraternização Universal (Ano Novo)",
  "03-19": "Dia de São José (Feriado Municipal - Fortaleza)",
  "03-25": "Data Magna do Ceará (Feriado Estadual)",
  "04-21": "Tiradentes (Feriado Nacional)",
  "05-01": "Dia do Trabalho (Feriado Nacional)",
  "08-15": "Nossa Senhora da Assunção (Feriado Municipal - Fortaleza)",
  "09-07": "Independência do Brasil (Feriado Nacional)",
  "10-12": "Nossa Senhora Aparecida (Feriado Nacional)",
  "11-02": "Finados (Feriado Nacional)",
  "11-15": "Proclamação da República (Feriado Nacional)",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra (Feriado Nacional)",
  "12-25": "Natal (Feriado Nacional)",
};

// Feriados móveis para 2025, 2026 e 2027 (formato: "YYYY-MM-DD")
const MOVABLE_HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-03-03": "Carnaval (Segunda-feira)",
  "2025-03-04": "Carnaval (Terça-feira)",
  "2025-03-05": "Quarta-feira de Cinzas (Ponto Facultativo)",
  "2025-04-18": "Sexta-feira Santa (Feriado Nacional)",
  "2025-06-19": "Corpus Christi (Ponto Facultativo)",
  // 2026
  "2026-02-16": "Carnaval (Segunda-feira)",
  "2026-02-17": "Carnaval (Terça-feira)",
  "2026-02-18": "Quarta-feira de Cinzas (Ponto Facultativo)",
  "2026-04-03": "Sexta-feira Santa (Feriado Nacional)",
  "2026-06-04": "Corpus Christi (Ponto Facultativo)",
  // 2027
  "2027-02-08": "Carnaval (Segunda-feira)",
  "2027-02-09": "Carnaval (Terça-feira)",
  "2027-02-10": "Quarta-feira de Cinzas (Ponto Facultativo)",
  "2027-03-26": "Sexta-feira Santa (Feriado Nacional)",
  "2027-05-27": "Corpus Christi (Ponto Facultativo)",
};

export async function checkHoliday(date: Date): Promise<{ isHoliday: boolean; name: string }> {
  // Ajusta a data para evitar problemas de fuso horário local e extrai YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  const keyFixed = `${month}-${day}`;
  const keyFull = `${year}-${month}-${day}`;

  // 1. Verifica feriados fixos
  if (FIXED_HOLIDAYS[keyFixed]) {
    return { isHoliday: true, name: FIXED_HOLIDAYS[keyFixed] };
  }

  // 2. Verifica feriados móveis calculados/pré-definidos
  if (MOVABLE_HOLIDAYS[keyFull]) {
    return { isHoliday: true, name: MOVABLE_HOLIDAYS[keyFull] };
  }

  // 3. Verifica no banco de dados por feriados customizados ou pontos facultativos
  try {
    // Definimos o início e o fim do dia pesquisado para fazer a busca no banco
    const startOfDay = new Date(year, date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(year, date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const customHoliday = await prisma.feriadoCustomizado.findFirst({
      where: {
        data: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (customHoliday) {
      return { isHoliday: true, name: customHoliday.descricao };
    }
  } catch (error) {
    console.error("Erro ao buscar feriado customizado:", error);
  }

  return { isHoliday: false, name: "" };
}
