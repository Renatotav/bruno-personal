export interface ConfigCarro {
  precoGasolina: number;   // R$/litro
  kmPorLitro: number;      // rendimento do carro
  custoPorKm: number;      // desgaste + pneus + manutenção (R$/km)
}

export const CONFIG_PADRAO: ConfigCarro = {
  precoGasolina: 5.80,
  kmPorLitro: 11.0,
  custoPorKm: 0.15,
};

export interface ResultadoAula {
  combustivel: number;
  desgaste: number;
  custoTotal: number;
  lucroLiquido: number;
  percPerda: number;      // % do valor da aula consumida pelo deslocamento
  status: "OTIMO" | "BOM" | "ATENCAO" | "PREJUIZO";
}

export function calcularCustoAula(
  distanciaKm: number,
  valorAula: number,
  config: ConfigCarro
): ResultadoAula {
  const kmTotal = distanciaKm * 2;
  const combustivel = (kmTotal / config.kmPorLitro) * config.precoGasolina;
  const desgaste = kmTotal * config.custoPorKm;
  const custoTotal = combustivel + desgaste;
  const lucroLiquido = valorAula - custoTotal;
  const percPerda = valorAula > 0 ? (custoTotal / valorAula) * 100 : 100;

  let status: ResultadoAula["status"] = "OTIMO";
  if (percPerda >= 40) status = "PREJUIZO";
  else if (percPerda >= 25) status = "ATENCAO";
  else if (percPerda >= 15) status = "BOM";

  return { combustivel, desgaste, custoTotal, lucroLiquido, percPerda, status };
}

export function statusColor(status: ResultadoAula["status"]): string {
  switch (status) {
    case "OTIMO":   return "text-emerald-400";
    case "BOM":     return "text-teal-400";
    case "ATENCAO": return "text-yellow-400";
    case "PREJUIZO":return "text-red-400";
  }
}

export function statusBadge(status: ResultadoAula["status"]): string {
  switch (status) {
    case "OTIMO":    return "bg-emerald-950/40 border-emerald-800 text-emerald-400";
    case "BOM":      return "bg-teal-950/40 border-teal-800 text-teal-400";
    case "ATENCAO":  return "bg-yellow-950/40 border-yellow-800 text-yellow-400";
    case "PREJUIZO": return "bg-red-950/40 border-red-800 text-red-400";
  }
}

export function statusLabel(status: ResultadoAula["status"]): string {
  switch (status) {
    case "OTIMO":    return "Ótimo";
    case "BOM":      return "Bom";
    case "ATENCAO":  return "Atenção";
    case "PREJUIZO": return "Prejuízo";
  }
}

export function parseCfg(configs: { key: string; value: string }[]): ConfigCarro {
  const get = (k: string, def: number) => {
    const v = configs.find((c) => c.key === k)?.value;
    return v ? parseFloat(v) : def;
  };
  return {
    precoGasolina: get("preco_gasolina", CONFIG_PADRAO.precoGasolina),
    kmPorLitro:    get("km_por_litro",   CONFIG_PADRAO.kmPorLitro),
    custoPorKm:    get("custo_por_km",   CONFIG_PADRAO.custoPorKm),
  };
}

export interface ConfigFixos {
  ipvaAnual: number;
  seguroAnual: number;
  dpvatAnual: number;
  manutencaoAnual: number;
  kmPorMes: number;
}

export const CONFIG_FIXOS_PADRAO: ConfigFixos = {
  ipvaAnual: 0,
  seguroAnual: 0,
  dpvatAnual: 0,
  manutencaoAnual: 0,
  kmPorMes: 1000,
};

export function parseCfgFixos(configs: { key: string; value: string }[]): ConfigFixos {
  const get = (k: string, def: number) => {
    const v = configs.find((c) => c.key === k)?.value;
    return v ? parseFloat(v) : def;
  };
  return {
    ipvaAnual:        get("ipva_anual",        CONFIG_FIXOS_PADRAO.ipvaAnual),
    seguroAnual:      get("seguro_anual",       CONFIG_FIXOS_PADRAO.seguroAnual),
    dpvatAnual:       get("dpvat_anual",        CONFIG_FIXOS_PADRAO.dpvatAnual),
    manutencaoAnual:  get("manutencao_anual",   CONFIG_FIXOS_PADRAO.manutencaoAnual),
    kmPorMes:         get("km_por_mes",         CONFIG_FIXOS_PADRAO.kmPorMes),
  };
}

export function calcularCustoFixoPorKm(fixos: ConfigFixos): { mensalTotal: number; porKm: number } {
  const mensalTotal = (fixos.ipvaAnual + fixos.seguroAnual + fixos.dpvatAnual + fixos.manutencaoAnual) / 12;
  const porKm = fixos.kmPorMes > 0 ? mensalTotal / fixos.kmPorMes : 0;
  return { mensalTotal, porKm };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_SEMANA_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
