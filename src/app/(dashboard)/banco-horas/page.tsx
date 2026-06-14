// @ts-nocheck
import { prisma } from "@/lib/db";
import Link from "next/link";

export const revalidate = 0;

interface ColaboradorComSaldo {
  id: string;
  nome: string;
  cargo: string;
  saldoMinutos: number;
  totalDias: number;
  horasTrabalhadas: number;
}

function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}min`;
}

export default async function BancoHorasPage() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: { pontos: true },
  });

  const colabsComSaldo: ColaboradorComSaldo[] = colaboradores.map((c) => {
    const saldoMinutos = c.pontos.reduce((acc, p) => acc + p.saldoMinutos, 0);
    const horasTrabalhadas = c.pontos.reduce((acc, p) => acc + p.horasTrabalhadas, 0);
    return {
      id: c.id,
      nome: c.nome,
      cargo: c.cargo,
      saldoMinutos,
      totalDias: c.pontos.length,
      horasTrabalhadas,
    };
  });

  const saldoGeralMinutos = colabsComSaldo.reduce((acc, c) => acc + c.saldoMinutos, 0);
  const devedores = colabsComSaldo.filter((c) => c.saldoMinutos < 0).length;
  const credores = colabsComSaldo.filter((c) => c.saldoMinutos > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Banco de Horas</h1>
          <p className="text-sm text-slate-400">Saldo individual acumulado de horas extras e débitos.</p>
        </div>
        <Link
          href="/lancamento"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-500"
        >
          Lançar Ponto
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Líquido Geral</p>
          <p className={`text-2xl font-bold mt-2 ${saldoGeralMinutos >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatMinutes(saldoGeralMinutos)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Soma de todos os colaboradores</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Com Crédito</p>
          <p className="text-2xl font-bold mt-2 text-emerald-400">{credores}</p>
          <p className="text-xs text-slate-500 mt-1">Colaboradores com saldo positivo</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Com Débito</p>
          <p className="text-2xl font-bold mt-2 text-red-400">{devedores}</p>
          <p className="text-xs text-slate-500 mt-1">Colaboradores com saldo negativo</p>
        </div>
      </div>

      {/* Tabela de saldos */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Saldo por Colaborador</h2>
        {colabsComSaldo.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500 text-sm">Nenhum colaborador ativo encontrado.</p>
            <Link href="/colaboradores" className="mt-2 text-xs text-teal-400 hover:underline">
              Cadastrar Colaborador →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pr-6">Colaborador</th>
                  <th className="pb-3 pr-6">Dias Registrados</th>
                  <th className="pb-3 pr-6">Horas Trabalhadas</th>
                  <th className="pb-3 pr-6">Saldo</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {colabsComSaldo.map((c) => (
                  <tr key={c.id} className="group">
                    <td className="py-4 pr-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-900/40 border border-teal-800 text-teal-400 text-xs font-bold">
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{c.nome}</div>
                          <div className="text-xs text-slate-500">{c.cargo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-6 text-slate-300">{c.totalDias} dias</td>
                    <td className="py-4 pr-6 text-slate-300">{c.horasTrabalhadas.toFixed(1)}h</td>
                    <td className={`py-4 pr-6 font-bold text-base ${c.saldoMinutos >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatMinutes(c.saldoMinutos)}
                    </td>
                    <td className="py-4">
                      {c.totalDias === 0 ? (
                        <span className="text-xs text-slate-500 italic">Sem lançamentos</span>
                      ) : c.saldoMinutos > 60 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                          CRÉDITO
                        </span>
                      ) : c.saldoMinutos < -60 ? (
                        <span className="inline-flex items-center rounded-full bg-red-950/40 border border-red-800 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                          DÉBITO
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-800/60 border border-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                          EQUILIBRADO
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
