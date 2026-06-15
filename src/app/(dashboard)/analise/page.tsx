import { prisma } from "@/lib/db";
import { calcularCustoAula, parseCfg, formatBRL, statusBadge, statusLabel, statusColor, DIAS_SEMANA } from "@/lib/calculos";
import Link from "next/link";

export const revalidate = 0;

export default async function AnalisePage() {
  const [aulas, alunosAtivos, configs] = await Promise.all([
    prisma.aulaSemanal.findMany({
      where: { ativo: true },
      include: { aluno: true, local: true },
      orderBy: [{ diaDaSemana: "asc" }, { horarioInicio: "asc" }],
    }),
    prisma.aluno.findMany({ where: { ativo: true } }),
    prisma.configuracao.findMany(),
  ]);

  const cfg = parseCfg(configs);

  if (aulas.length === 0 && alunosAtivos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Análise de Custos</h1>
          <p className="text-sm text-slate-400">Rentabilidade real por aluno, bairro e horário.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-16 text-center">
          <p className="text-slate-500 text-sm mb-3">Nenhuma aula ou aluno cadastrado ainda.</p>
          <Link href="/alunos" className="text-teal-400 text-sm hover:underline font-semibold">
            Cadastrar alunos primeiro →
          </Link>
        </div>
      </div>
    );
  }

  // Calcula resultado para cada aula
  const aulasComResultado = aulas.map(a => ({
    ...a,
    resultado: calcularCustoAula(a.local.distanciaKm, a.valorAula, cfg),
  }));

  // Receita Mensal Real
  let receitaBrutaMensal = 0;
  alunosAtivos.forEach(a => {
    if (a.tipoCobranca === "MENSAL") {
      receitaBrutaMensal += a.mensalidade;
    }
  });
  aulasComResultado.forEach(a => {
    if (a.aluno.tipoCobranca === "POR_AULA") {
      receitaBrutaMensal += a.valorAula * 4.33;
    }
  });

  const custoTotalMensal = aulasComResultado.reduce((s, a) => s + a.resultado.custoTotal, 0) * 4.33;
  const lucroMensal = receitaBrutaMensal - custoTotalMensal;
  const percPerdaGeral = receitaBrutaMensal > 0 ? (custoTotalMensal / receitaBrutaMensal) * 100 : 0;

  // Ranking de alunos por lucro mensal
  const porAlunoMap: Record<string, { aluno: any; aulas: typeof aulasComResultado }> = {};
  alunosAtivos.forEach(a => {
    porAlunoMap[a.id] = { aluno: a, aulas: [] };
  });
  aulasComResultado.forEach(a => {
    if (!porAlunoMap[a.alunoId]) {
      porAlunoMap[a.alunoId] = { aluno: a.aluno, aulas: [] };
    }
    porAlunoMap[a.alunoId].aulas.push(a);
  });

  const porAluno = Object.values(porAlunoMap).map(g => {
    let receita = 0;
    if (g.aluno.tipoCobranca === "MENSAL") {
      receita = g.aluno.mensalidade;
    } else {
      receita = g.aulas.reduce((s, a) => s + a.valorAula, 0) * 4.33;
    }
    const custo = g.aulas.reduce((s, a) => s + a.resultado.custoTotal, 0) * 4.33;
    const lucro = receita - custo;
    const perc = receita > 0 ? (custo / receita) * 100 : 0;
    return { nome: g.aluno.nome, receita, custo, lucro, perc, qtdAulas: g.aulas.length };
  }).filter(g => g.receita > 0 || g.custo > 0).sort((a, b) => b.lucro - a.lucro);

  // Ranking de bairros por lucro mensal
  const porBairro = Object.values(
    aulasComResultado.reduce<Record<string, { bairro: string; aulas: typeof aulasComResultado }>>(
      (acc, a) => {
        const b = a.local.bairro;
        if (!acc[b]) acc[b] = { bairro: b, aulas: [] };
        acc[b].aulas.push(a);
        return acc;
      },
      {}
    )
  ).map(g => {
    // Para bairros, temos que ratear a mensalidade fixa do aluno pelas aulas que ele faz no bairro.
    // Como simplificação, pegamos o custo mensal do bairro e comparamos com a proporção da receita daquelas aulas.
    let receita = 0;
    g.aulas.forEach(a => {
      if (a.aluno.tipoCobranca === "MENSAL") {
        // Se a pessoa paga 600 e tem 2 aulas por semana. Cada aula "vale" 300 de mensalidade.
        const totalAulasAluno = aulasComResultado.filter(x => x.alunoId === a.alunoId).length;
        if (totalAulasAluno > 0) receita += a.aluno.mensalidade / totalAulasAluno;
      } else {
        receita += a.valorAula * 4.33;
      }
    });
    
    const custo = g.aulas.reduce((s, a) => s + a.resultado.custoTotal, 0) * 4.33;
    const lucro = receita - custo;
    const perc = receita > 0 ? (custo / receita) * 100 : 0;
    return { bairro: g.bairro, receita, custo, lucro, perc, qtdAulas: g.aulas.length };
  }).sort((a, b) => b.lucro - a.lucro);

  // Aulas em alerta (% perda >= 25%)
  const aulasAlerta = aulasComResultado
    .filter(a => a.resultado.percPerda >= 25)
    .sort((a, b) => b.resultado.percPerda - a.resultado.percPerda);

  // Heatmap por dia: lucro líquido
  const porDia = DIAS_SEMANA.map((dia, i) => {
    const asDia = aulasComResultado.filter(a => a.diaDaSemana === i);
    let rec = 0;
    asDia.forEach(a => {
      if (a.aluno.tipoCobranca === "MENSAL") {
        const totalAulasAluno = aulasComResultado.filter(x => x.alunoId === a.alunoId).length;
        if (totalAulasAluno > 0) rec += (a.aluno.mensalidade / totalAulasAluno) / 4.33; // Quebra a mensalidade para 1 dia
      } else {
        rec += a.valorAula;
      }
    });
    const cst = asDia.reduce((s, a) => s + a.resultado.custoTotal, 0);
    return { dia, qtd: asDia.length, receita: rec, custo: cst, lucro: rec - cst };
  }).filter(d => d.qtd > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Análise de Custos e Rentabilidade</h1>
        <p className="text-sm text-slate-400">
          Baseado em: gasolina {formatBRL(cfg.precoGasolina)}/L · {cfg.kmPorLitro} km/L · desgaste {formatBRL(cfg.custoPorKm)}/km.{" "}
          <Link href="/configuracoes" className="text-teal-400 hover:underline">Alterar configurações →</Link>
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase">Receita Bruta Mensal</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{formatBRL(receitaBrutaMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">Soma das mensalidades</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase">Custo Logístico Mensal</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{formatBRL(custoTotalMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">{percPerdaGeral.toFixed(1)}% da receita mensal</p>
        </div>
        <div className="rounded-xl border border-teal-800/30 bg-teal-950/10 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase">Lucro Líquido Mensal</p>
          <p className="text-3xl font-bold text-teal-400 mt-2">{formatBRL(lucroMensal)}</p>
          <p className="text-xs text-slate-500 mt-1">{(100 - percPerdaGeral).toFixed(1)}% chega no bolso</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase">Aulas com Prejuízo Logístico</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{aulasAlerta.length}</p>
          <p className="text-xs text-slate-500 mt-1">Acima de 25% de perda</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking de Alunos */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Ranking de Alunos — por Lucro Mensal Líquido</h2>
          <div className="space-y-2">
            {porAluno.map((a, i) => (
              <div key={a.nome} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600 text-xs font-bold w-5">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{a.nome}</p>
                    <p className="text-xs text-slate-500">{a.qtdAulas}×/sem · rec. {formatBRL(a.receita)} · cust. {formatBRL(a.custo)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${a.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatBRL(a.lucro)}
                  </p>
                  <p className="text-xs text-slate-500">{a.perc.toFixed(0)}% perda</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de Bairros */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Ranking de Bairros — por Rentabilidade</h2>
          <div className="space-y-2">
            {porBairro.map((b, i) => {
              const barW = Math.max(4, Math.round((b.lucro / (porBairro[0]?.lucro || 1)) * 100));
              return (
                <div key={b.bairro} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">#{i + 1} {b.bairro} <span className="text-slate-600">({b.qtdAulas} aulas)</span></span>
                    <span className={b.lucro >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {formatBRL(b.lucro)} líq.
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.perc < 15 ? "bg-emerald-500" : b.perc < 25 ? "bg-teal-500" : b.perc < 40 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Receita {formatBRL(b.receita)} · Custo {formatBRL(b.custo)} · {b.perc.toFixed(0)}% perda</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Heatmap por dia */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Distribuição por Dia da Semana</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {porDia.map(d => (
            <div key={d.dia} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">{d.dia}</p>
              <p className="text-lg font-bold text-white mt-1">{d.qtd}</p>
              <p className="text-[10px] text-slate-500">aulas</p>
              <p className="text-xs font-semibold text-teal-400 mt-1">{formatBRL(d.lucro)}</p>
              <p className="text-[10px] text-slate-500">lucro</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {aulasAlerta.length > 0 && (
        <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 p-6">
          <h2 className="text-lg font-bold text-white mb-1">⚠️ Aulas com Alta Perda Logística</h2>
          <p className="text-xs text-slate-400 mb-4">
            Aulas onde o deslocamento consome 25% ou mais do valor — candidatas a renegociação de local ou horário.
          </p>
          <div className="space-y-2">
            {aulasAlerta.map(a => (
              <div key={a.id} className={`flex items-center justify-between rounded-lg border p-3 ${statusBadge(a.resultado.status)}`}>
                <div>
                  <p className="text-sm font-bold text-white">
                    {DIAS_SEMANA[a.diaDaSemana]} {a.horarioInicio} — {a.aluno.nome}
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.local.nome} · {a.local.bairro} · {a.local.distanciaKm} km (ida)
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${statusColor(a.resultado.status)}`}>
                    {a.resultado.percPerda.toFixed(0)}% perda
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatBRL(a.valorAula)} → líq. {formatBRL(a.resultado.lucroLiquido)}
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(a.resultado.status)}`}>
                    {statusLabel(a.resultado.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela completa */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Detalhamento Completo por Aula</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Aluno</th>
                <th className="pb-3 pr-4">Local / Bairro</th>
                <th className="pb-3 pr-4">Dia / Horário</th>
                <th className="pb-3 pr-4">Valor</th>
                <th className="pb-3 pr-4">Custo KM</th>
                <th className="pb-3 pr-4">Lucro Líq.</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {aulasComResultado.map(a => (
                <tr key={a.id}>
                  <td className="py-3 pr-4 font-semibold text-white">{a.aluno.nome}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {a.local.nome}<br />
                    <span className="text-slate-600">{a.local.bairro} · {a.local.distanciaKm} km</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs">
                    {DIAS_SEMANA[a.diaDaSemana]}<br />{a.horarioInicio}–{a.horarioFim}
                  </td>
                  <td className="py-3 pr-4 text-emerald-400 font-semibold">{formatBRL(a.valorAula)}</td>
                  <td className="py-3 pr-4 text-red-400 font-semibold">{formatBRL(a.resultado.custoTotal)}</td>
                  <td className={`py-3 pr-4 font-bold ${a.resultado.lucroLiquido >= 0 ? "text-teal-400" : "text-red-400"}`}>
                    {formatBRL(a.resultado.lucroLiquido)}
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${statusBadge(a.resultado.status)}`}>
                      {statusLabel(a.resultado.status)} ({a.resultado.percPerda.toFixed(0)}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
