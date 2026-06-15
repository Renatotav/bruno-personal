import { prisma } from "@/lib/db";
import { calcularCustoAula, parseCfg, parseCfgFixos, formatBRL, statusBadge, statusLabel, DIAS_SEMANA } from "@/lib/calculos";
import Link from "next/link";

export const revalidate = 0;

export default async function DashboardPage() {
  const [aulas, alunosAtivos, locais, configs] = await Promise.all([
    prisma.aulaSemanal.findMany({
      where: { ativo: true },
      include: { aluno: true, local: true },
      orderBy: [{ diaDaSemana: "asc" }, { horarioInicio: "asc" }],
    }),
    prisma.aluno.findMany({ where: { ativo: true } }),
    prisma.local.count(),
    prisma.configuracao.findMany(),
  ]);

  const cfg = parseCfg(configs);
  const cfgFixos = parseCfgFixos(configs);
  const metaFaturamento = cfgFixos.metaFaturamento;

  const aulasComResultado = aulas.map(a => ({
    ...a,
    resultado: calcularCustoAula(a.local.distanciaKm, a.valorAula, cfg),
  }));

  // Receita Faturamento Mensal Garantido
  let receitaBrutaMensal = 0;
  // 1. Mensalidades fixas
  alunosAtivos.forEach(a => {
    if (a.tipoCobranca === "MENSAL") {
      receitaBrutaMensal += a.mensalidade;
    }
  });
  // 2. Aulas avulsas (estimativa mensal = 4.33 semanas)
  aulasComResultado.forEach(a => {
    if (a.aluno.tipoCobranca === "POR_AULA") {
      receitaBrutaMensal += a.valorAula * 4.33;
    }
  });

  const custoTotalMensal = aulasComResultado.reduce((s, a) => s + a.resultado.custoTotal, 0) * 4.33;
  const lucroMensal = receitaBrutaMensal - custoTotalMensal;
  const progressoMeta = metaFaturamento > 0 ? Math.min((receitaBrutaMensal / metaFaturamento) * 100, 100) : 0;
  const alunosPagantes = alunosAtivos.filter(a => (a.tipoCobranca === "MENSAL" && a.mensalidade > 0) || a.tipoCobranca === "POR_AULA").length;

  const aulasAlerta = aulasComResultado
    .filter(a => a.resultado.percPerda >= 25)
    .sort((a, b) => b.resultado.percPerda - a.resultado.percPerda);

  // Próximas aulas do dia de hoje
  const hoje = new Date().getDay(); // 0=Dom, 6=Sáb
  const aulaHoje = aulasComResultado
    .filter(a => a.diaDaSemana === hoje)
    .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));

  const empty = aulas.length === 0 && alunosAtivos.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Visão geral da semana — receita, custos e alertas logísticos.</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/agenda"
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-white">
            Ver Agenda
          </Link>
          <Link href="/analise"
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-500">
            Análise Completa
          </Link>
        </div>
      </div>

      {/* Setup inicial */}
      {empty && (
        <div className="rounded-xl border border-teal-800/40 bg-teal-950/10 p-8 text-center space-y-3">
          <p className="text-lg font-bold text-white">Bem-vindo ao Bruno Personal! 👋</p>
          <p className="text-sm text-slate-400">Comece cadastrando seus alunos, locais e a agenda semanal.</p>
          <div className="flex justify-center space-x-3 pt-2">
            <Link href="/alunos" className="rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-all">1. Cadastrar Alunos</Link>
            <Link href="/locais" className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-all">2. Cadastrar Locais</Link>
            <Link href="/agenda" className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-all">3. Montar Agenda</Link>
          </div>
        </div>
      )}

      {/* Meta de Faturamento */}
      <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 z-10 relative">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Meta de Faturamento Mensal
            </h2>
            <p className="text-xs text-slate-400 mt-1">Acompanhe seu objetivo mensal (Baseado nas mensalidades fixas + avulsos).</p>
          </div>
          <div className="text-right mt-3 sm:mt-0">
            <p className="text-2xl font-bold text-white">{formatBRL(receitaBrutaMensal)}</p>
            <p className="text-xs font-semibold text-emerald-500">de {formatBRL(metaFaturamento)}</p>
          </div>
        </div>

        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden relative z-10 border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${progressoMeta >= 100 ? "bg-emerald-500" : "bg-emerald-400"}`}
            style={{ width: `${progressoMeta}%` }}
          />
        </div>
        <div className="mt-2 text-right z-10 relative">
          <span className="text-xs font-bold text-emerald-400">{progressoMeta.toFixed(1)}% atingido</span>
        </div>
        
        {/* Background Blur Effect */}
        <div 
          className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"
          style={{ transform: "translate(20%, -50%)" }}
        />
      </div>

      {/* Cards financeiros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">Receita Bruta (Mês)</p>
            <span className="rounded-lg bg-emerald-950/40 p-2 text-emerald-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-400 mt-3">{formatBRL(receitaBrutaMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">Soma das mensalidades garantidas</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total de Alunos</p>
            <span className="rounded-lg bg-blue-950/40 p-2 text-blue-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-400 mt-3">{alunosAtivos.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {alunosPagantes} alunos pagantes ativos
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">Custo Desloc. (Mês)</p>
            <span className="rounded-lg bg-red-950/40 p-2 text-red-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-red-400 mt-3">{formatBRL(custoTotalMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {receitaBrutaMensal > 0 ? `${((custoTotalMensal / receitaBrutaMensal) * 100).toFixed(1)}% da receita` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-teal-800/30 bg-teal-950/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">Lucro Líquido (Mês)</p>
            <span className="rounded-lg bg-teal-950/60 p-2 text-teal-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-teal-400 mt-3">{formatBRL(lucroMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">Após custos com veículo</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aulas de hoje */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Aulas de Hoje
            <span className="ml-2 text-sm font-normal text-slate-400">({DIAS_SEMANA[hoje]})</span>
          </h2>
          {aulaHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-slate-500 text-sm">Nenhuma aula hoje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {aulaHoje.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-center w-14">
                      <p className="text-xs font-bold text-white">{a.horarioInicio}</p>
                      <p className="text-[10px] text-slate-500">{a.horarioFim}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{a.aluno.nome}</p>
                      <p className="text-xs text-slate-500">{a.local.nome} · {a.local.bairro}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{formatBRL(a.valorAula)}</p>
                    <p className="text-xs text-slate-500">líq. {formatBRL(a.resultado.lucroLiquido)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas logísticos */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-1">Alertas Logísticos</h2>
          <p className="text-xs text-slate-500 mb-4">Aulas com perda de deslocamento acima de 25% do valor.</p>
          {aulasAlerta.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <svg className="h-8 w-8 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-emerald-400">Agenda eficiente!</p>
              <p className="text-xs text-slate-500 mt-1">Nenhum aluno com prejuízo logístico acima de 25%.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {aulasAlerta.map(a => (
                <div key={a.id} className={`flex items-center justify-between rounded-lg border p-3 ${statusBadge(a.resultado.status)}`}>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {a.aluno.nome} — {DIAS_SEMANA[a.diaDaSemana]} {a.horarioInicio}
                    </p>
                    <p className="text-xs text-slate-400">{a.local.nome} · {a.local.bairro} · {a.local.distanciaKm} km</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-bold text-white">{a.resultado.percPerda.toFixed(0)}% perda</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(a.resultado.status)}`}>
                      {statusLabel(a.resultado.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {aulasAlerta.length > 0 && (
            <Link href="/analise" className="mt-4 block text-center text-xs text-teal-400 hover:underline font-semibold">
              Ver análise completa →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
