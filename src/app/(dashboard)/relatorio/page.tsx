// @ts-nocheck
import { prisma } from "@/lib/db";
import { calcularElegibilidade } from "@/lib/calculations";

export const revalidate = 0;

function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}min`;
}

export default async function RelatorioPage() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: {
      pontos: true,
      folgas: true,
    },
  });

  const rows = await Promise.all(
    colaboradores.map(async (c) => {
      const horasTrabalhadas = c.pontos.reduce((acc, p) => acc + p.horasTrabalhadas, 0);
      const saldoMinutos = c.pontos.reduce((acc, p) => acc + p.saldoMinutos, 0);
      const folgasGeradas = c.folgas.filter((f) => f.tipo === "GERADA").length;
      const folgasGozadas = c.folgas.filter((f) => f.tipo === "GOZADA").length;
      const saldoFolgas = folgasGeradas - folgasGozadas;
      const elegibilidade = await calcularElegibilidade(c.id);
      return {
        id: c.id,
        nome: c.nome,
        cargo: c.cargo,
        horasTrabalhadas,
        saldoMinutos,
        folgasGeradas,
        folgasGozadas,
        saldoFolgas,
        elegibilidade,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Relatório Geral</h1>
        <p className="text-sm text-slate-400">Visão consolidada de ponto, banco de horas, folgas e elegibilidade.</p>
      </div>

      {/* Tabela 1: Ponto e Folgas */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Ponto e Folgas</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Nenhum colaborador ativo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pr-6">Colaborador</th>
                  <th className="pb-3 pr-6">Horas Trabalhadas</th>
                  <th className="pb-3 pr-6">Saldo BH</th>
                  <th className="pb-3 pr-6">Folgas Geradas</th>
                  <th className="pb-3 pr-6">Folgas Gozadas</th>
                  <th className="pb-3">Saldo de Folgas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-4 pr-6">
                      <div className="font-semibold text-white">{r.nome}</div>
                      <div className="text-xs text-slate-500">{r.cargo}</div>
                    </td>
                    <td className="py-4 pr-6 text-slate-300">{r.horasTrabalhadas.toFixed(1)}h</td>
                    <td className={`py-4 pr-6 font-semibold ${r.saldoMinutos >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatMinutes(r.saldoMinutos)}
                    </td>
                    <td className="py-4 pr-6 text-teal-400 font-semibold">{r.folgasGeradas}</td>
                    <td className="py-4 pr-6 text-slate-300">{r.folgasGozadas}</td>
                    <td className={`py-4 font-bold ${r.saldoFolgas > 0 ? "text-emerald-400" : r.saldoFolgas < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {r.saldoFolgas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela 2: Elegibilidade */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Elegibilidade para Trabalho Remoto</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Nenhum colaborador ativo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pr-6">Colaborador</th>
                  <th className="pb-3 pr-6">Sem. Presencial (Mês Ant.)</th>
                  <th className="pb-3 pr-6">Sem. Presencial (Mês Atual)</th>
                  <th className="pb-3 pr-6">Total Acumulado</th>
                  <th className="pb-3">Status Remoto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((r) => {
                  const e = r.elegibilidade;
                  let totalClass = "text-slate-300";
                  if (e.status === "ATENCAO") totalClass = "text-yellow-400 font-bold";
                  if (e.status === "ELEGIVEL") totalClass = "text-red-400 font-bold";
                  if (e.status === "CRITICO") totalClass = "text-red-300 font-bold animate-pulse";

                  return (
                    <tr key={r.id}>
                      <td className="py-4 pr-6">
                        <div className="font-semibold text-white">{r.nome}</div>
                        <div className="text-xs text-slate-500">{r.cargo}</div>
                      </td>
                      <td className="py-4 pr-6 text-slate-300">{e.semanasMesAnterior}</td>
                      <td className="py-4 pr-6 text-slate-300">{e.semanasMesAtual}</td>
                      <td className={`py-4 pr-6 ${totalClass}`}>{e.totalAcumulado}</td>
                      <td className="py-4">
                        {e.status === "NEUTRO" ? (
                          <span className="inline-flex items-center rounded-full bg-slate-800/60 border border-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                            Regular
                          </span>
                        ) : e.status === "ATENCAO" ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-950/40 border border-yellow-800 px-2.5 py-1 text-[10px] font-semibold text-yellow-400">
                            {e.tag}
                          </span>
                        ) : e.status === "ELEGIVEL" ? (
                          <span className="inline-flex items-center rounded-full bg-red-950/40 border border-red-800 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                            {e.tag}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-900 border-2 border-red-500 px-2.5 py-1 text-[10px] font-bold text-red-100 animate-pulse">
                            {e.tag}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
