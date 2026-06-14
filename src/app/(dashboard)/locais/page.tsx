"use client";

import { useState, useEffect } from "react";
import { getLocais, upsertLocal, deleteLocal } from "@/app/actions/locais";
import { getConfiguracoes } from "@/app/actions/aulas";
import { calcularCustoAula, parseCfg, formatBRL, CONFIG_PADRAO } from "@/lib/calculos";

interface Local {
  id: string;
  nome: string;
  tipo: string;
  bairro: string;
  distanciaKm: number;
  tempoMinutos: number;
  aulas: { id: string }[];
}

const EMPTY = { nome: "", tipo: "ACADEMIA", bairro: "", distanciaKm: "", tempoMinutos: "" };

export default function LocaisPage() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cfg, setCfg] = useState(CONFIG_PADRAO);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [ls, configs] = await Promise.all([getLocais(), getConfiguracoes()]);
    setLocais(ls as Local[]);
    setCfg(parseCfg(configs));
    setLoading(false);
  };

  const startEdit = (l: Local) => {
    setEditId(l.id);
    setForm({ nome: l.nome, tipo: l.tipo, bairro: l.bairro, distanciaKm: String(l.distanciaKm), tempoMinutos: String(l.tempoMinutos) });
    setMsg(null);
  };

  const cancel = () => { setEditId(null); setForm(EMPTY); setMsg(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const r = await upsertLocal({
      id: editId ?? undefined,
      nome: form.nome,
      tipo: form.tipo,
      bairro: form.bairro,
      distanciaKm: parseFloat(form.distanciaKm) || 0,
      tempoMinutos: parseInt(form.tempoMinutos) || 0,
    });
    setSubmitting(false);
    if (r.success) { setMsg({ type: "ok", text: editId ? "Local atualizado!" : "Local cadastrado!" }); cancel(); load(); }
    else setMsg({ type: "err", text: r.error ?? "Erro ao salvar." });
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"? As aulas neste local também serão removidas.`)) return;
    const r = await deleteLocal(id);
    if (r.success) load();
    else alert(r.error);
  };

  const byBairro = locais.reduce<Record<string, Local[]>>((acc, l) => {
    (acc[l.bairro] = acc[l.bairro] ?? []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Locais de Atendimento</h1>
        <p className="text-sm text-slate-400">
          Cadastre academias e condomínios com a distância da sua base. O custo de deslocamento é calculado automaticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 h-fit space-y-4">
          <h2 className="text-lg font-bold text-white">{editId ? "Editar Local" : "Novo Local"}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Nome</label>
              <input type="text" placeholder='ex: "Academia FitLife"' value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm">
                  <option value="ACADEMIA">Academia</option>
                  <option value="CONDOMINIO">Condomínio</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Bairro</label>
                <input type="text" placeholder="Meireles" value={form.bairro}
                  onChange={e => setForm({ ...form, bairro: e.target.value })} required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Distância (km ida)</label>
                <input type="number" step="0.1" min="0" placeholder="8.5" value={form.distanciaKm}
                  onChange={e => setForm({ ...form, distanciaKm: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tempo (min ida)</label>
                <input type="number" min="0" placeholder="20" value={form.tempoMinutos}
                  onChange={e => setForm({ ...form, tempoMinutos: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
            </div>

            {/* Preview do custo */}
            {form.distanciaKm && parseFloat(form.distanciaKm) > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs space-y-1">
                <p className="text-slate-500 font-semibold uppercase tracking-wider">Custo estimado por aula</p>
                {(() => {
                  const c = calcularCustoAula(parseFloat(form.distanciaKm), 0, cfg);
                  return (
                    <>
                      <div className="flex justify-between text-slate-300">
                        <span>Combustível (ida+volta {(parseFloat(form.distanciaKm)*2).toFixed(1)} km)</span>
                        <span>{formatBRL(c.combustivel)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Desgaste do carro</span>
                        <span>{formatBRL(c.desgaste)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1 mt-1">
                        <span>Total por deslocamento</span>
                        <span className="text-red-400">{formatBRL(c.custoTotal)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {msg && (
              <p className={`text-xs p-2.5 rounded-lg border font-semibold ${msg.type === "ok" ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30" : "text-red-400 bg-red-950/20 border-red-900/30"}`}>
                {msg.text}
              </p>
            )}

            <div className="flex space-x-2">
              <button type="submit" disabled={submitting}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50">
                {submitting ? "Salvando..." : editId ? "Atualizar" : "Cadastrar"}
              </button>
              {editId && (
                <button type="button" onClick={cancel}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista agrupada por bairro */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
          ) : locais.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-12 text-center">
              <p className="text-slate-500 text-sm">Nenhum local cadastrado ainda.</p>
            </div>
          ) : (
            Object.entries(byBairro).sort(([a], [b]) => a.localeCompare(b)).map(([bairro, ls]) => (
              <div key={bairro} className="rounded-xl border border-slate-800 bg-slate-900/10 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  📍 {bairro}
                </h3>
                <div className="space-y-2">
                  {ls.map(l => {
                    const custo = calcularCustoAula(l.distanciaKm, 0, cfg);
                    return (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex items-center space-x-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            l.tipo === "ACADEMIA"
                              ? "bg-blue-950/40 border-blue-800 text-blue-400"
                              : "bg-purple-950/40 border-purple-800 text-purple-400"
                          }`}>
                            {l.tipo === "ACADEMIA" ? "ACADEMIA" : "COND."}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{l.nome}</p>
                            <p className="text-xs text-slate-500">
                              {l.distanciaKm > 0
                                ? `${l.distanciaKm} km · ${l.tempoMinutos} min · custo: ${formatBRL(custo.custoTotal)}/aula`
                                : "Distância não configurada"}
                              {l.aulas.length > 0 && ` · ${l.aulas.length} aula${l.aulas.length > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => startEdit(l)}
                            className="text-xs text-slate-400 hover:text-teal-400 border border-slate-700 hover:border-teal-700 px-3 py-1.5 rounded-lg transition-all font-semibold">
                            Editar
                          </button>
                          <button onClick={() => del(l.id, l.nome)}
                            className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-all font-semibold">
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
