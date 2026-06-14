"use client";

import { useState, useEffect } from "react";
import { getAulas, upsertAula, deleteAula, getConfiguracoes } from "@/app/actions/aulas";
import { getAlunos } from "@/app/actions/alunos";
import { getLocais } from "@/app/actions/locais";
import { calcularCustoAula, parseCfg, formatBRL, statusBadge, statusLabel, DIAS_SEMANA, DIAS_SEMANA_FULL, CONFIG_PADRAO } from "@/lib/calculos";

interface Aula {
  id: string;
  diaDaSemana: number;
  horarioInicio: string;
  horarioFim: string;
  valorAula: number;
  ativo: boolean;
  aluno: { id: string; nome: string };
  local: { id: string; nome: string; bairro: string; distanciaKm: number; tipo: string };
}
interface Aluno { id: string; nome: string; }
interface Local { id: string; nome: string; bairro: string; tipo: string; distanciaKm: number; }

const EMPTY_FORM = { alunoId: "", localId: "", diaDaSemana: 1, horarioInicio: "", horarioFim: "", valorAula: "" };

export default function AgendaPage() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cfg, setCfg] = useState(CONFIG_PADRAO);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [aulasList, alunosList, locaisList, configs] = await Promise.all([
      getAulas(), getAlunos(), getLocais(), getConfiguracoes(),
    ]);
    setAulas(aulasList as Aula[]);
    setAlunos(alunosList as Aluno[]);
    setLocais(locaisList as Local[]);
    setCfg(parseCfg(configs));
    setLoading(false);
  };

  const openNew = () => { setEditId(null); setForm(EMPTY_FORM); setMsg(null); setShowForm(true); };

  const openEdit = (a: Aula) => {
    setEditId(a.id);
    setForm({
      alunoId: a.aluno.id, localId: a.local.id,
      diaDaSemana: a.diaDaSemana,
      horarioInicio: a.horarioInicio, horarioFim: a.horarioFim,
      valorAula: String(a.valorAula),
    });
    setMsg(null);
    setShowForm(true);
  };

  const cancel = () => { setEditId(null); setForm(EMPTY_FORM); setMsg(null); setShowForm(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const r = await upsertAula({
      id: editId ?? undefined,
      alunoId: form.alunoId, localId: form.localId,
      diaDaSemana: form.diaDaSemana,
      horarioInicio: form.horarioInicio, horarioFim: form.horarioFim,
      valorAula: parseFloat(form.valorAula) || 0,
    });
    setSubmitting(false);
    if (r.success) { cancel(); load(); }
    else setMsg({ type: "err", text: r.error ?? "Erro ao salvar." });
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Remover aula de ${nome}?`)) return;
    await deleteAula(id);
    load();
  };

  // Agrupa aulas por dia
  const byDay = DIAS_SEMANA.map((_, i) =>
    aulas.filter(a => a.diaDaSemana === i && a.ativo)
         .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio))
  );

  // Preview custo no form
  const localSelecionado = locais.find(l => l.id === form.localId);
  const previewCusto = localSelecionado && form.valorAula
    ? calcularCustoAula(localSelecionado.distanciaKm, parseFloat(form.valorAula) || 0, cfg)
    : null;

  const totalSemana = aulas.filter(a => a.ativo).reduce((acc, a) => acc + a.valorAula, 0);
  const totalCusto = aulas.filter(a => a.ativo).reduce((acc, a) => {
    return acc + calcularCustoAula(a.local.distanciaKm, a.valorAula, cfg).custoTotal;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Agenda Semanal</h1>
          <p className="text-sm text-slate-400">Grade horária completa com indicador de rentabilidade por aula.</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-all">
          + Nova Aula
        </button>
      </div>

      {/* Resumo semanal */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Receita Bruta/Semana</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatBRL(totalSemana)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Custo Logístico/Semana</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatBRL(totalCusto)}</p>
        </div>
        <div className="rounded-xl border border-teal-800/30 bg-teal-950/10 p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase">Lucro Líquido/Semana</p>
          <p className="text-2xl font-bold text-teal-400 mt-1">{formatBRL(totalSemana - totalCusto)}</p>
        </div>
      </div>

      {/* Formulário Modal */}
      {showForm && (
        <div className="rounded-xl border border-teal-800/40 bg-slate-900/80 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">{editId ? "Editar Aula" : "Nova Aula"}</h2>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Aluno</label>
              <select value={form.alunoId} onChange={e => setForm({ ...form, alunoId: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm">
                <option value="">Selecione...</option>
                {alunos.filter(a => (a as any).ativo !== false).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Local</label>
              <select value={form.localId} onChange={e => setForm({ ...form, localId: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm">
                <option value="">Selecione...</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.bairro}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Dia da Semana</label>
              <select value={form.diaDaSemana} onChange={e => setForm({ ...form, diaDaSemana: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm">
                {DIAS_SEMANA_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Início</label>
              <input type="time" value={form.horarioInicio} onChange={e => setForm({ ...form, horarioInicio: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Fim</label>
              <input type="time" value={form.horarioFim} onChange={e => setForm({ ...form, horarioFim: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Valor da Aula (R$)</label>
              <input type="number" step="0.01" min="1" placeholder="80.00" value={form.valorAula}
                onChange={e => setForm({ ...form, valorAula: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>

            {/* Preview rentabilidade */}
            {previewCusto && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Custo deslocamento: <strong className="text-red-400">{formatBRL(previewCusto.custoTotal)}</strong>
                  &nbsp;·&nbsp; Lucro líquido: <strong className="text-emerald-400">{formatBRL(previewCusto.lucroLiquido)}</strong>
                  &nbsp;·&nbsp; Perda: <strong className="text-yellow-400">{previewCusto.percPerda.toFixed(1)}%</strong>
                </span>
                <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${statusBadge(previewCusto.status)}`}>
                  {statusLabel(previewCusto.status)}
                </span>
              </div>
            )}

            {msg && (
              <p className={`sm:col-span-2 lg:col-span-3 text-xs p-2.5 rounded-lg border font-semibold ${msg.type === "ok" ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30" : "text-red-400 bg-red-950/20 border-red-900/30"}`}>
                {msg.text}
              </p>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex space-x-2">
              <button type="submit" disabled={submitting}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50">
                {submitting ? "Salvando..." : editId ? "Atualizar" : "Adicionar Aula"}
              </button>
              <button type="button" onClick={cancel}
                className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grade semanal */}
      {loading ? (
        <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {DIAS_SEMANA_FULL.map((dia, idx) => {
            const aulasDia = byDay[idx];
            if (idx === 0 && aulasDia.length === 0) return null; // Domingo vazio = oculta
            const receitaDia = aulasDia.reduce((a, b) => a + b.valorAula, 0);
            const custoDia = aulasDia.reduce((a, b) => a + calcularCustoAula(b.local.distanciaKm, b.valorAula, cfg).custoTotal, 0);

            return (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/10 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white">{dia}</h3>
                  {aulasDia.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-semibold">{formatBRL(receitaDia)}</p>
                      <p className="text-[10px] text-slate-500">-{formatBRL(custoDia)} custo</p>
                    </div>
                  )}
                </div>

                {aulasDia.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-xs text-slate-600">Livre</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {aulasDia.map(a => {
                      const c = calcularCustoAula(a.local.distanciaKm, a.valorAula, cfg);
                      return (
                        <div key={a.id} className={`rounded-lg border p-3 ${statusBadge(c.status).replace("text-", "border-").split(" ")[1]} bg-slate-950/50`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{a.aluno.nome}</p>
                              <p className="text-xs text-slate-400 truncate">{a.local.nome}</p>
                              <p className="text-xs text-slate-500">{a.horarioInicio} – {a.horarioFim}</p>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                              <p className="text-xs font-bold text-white">{formatBRL(a.valorAula)}</p>
                              <p className="text-[10px] text-red-400">-{formatBRL(c.custoTotal)}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(c.status)}`}>
                                {statusLabel(c.status)}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-2 pt-2 border-t border-slate-800">
                            <button onClick={() => openEdit(a)}
                              className="text-[10px] text-slate-500 hover:text-teal-400 transition-colors font-semibold">
                              Editar
                            </button>
                            <button onClick={() => del(a.id, a.aluno.nome)}
                              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors font-semibold">
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
