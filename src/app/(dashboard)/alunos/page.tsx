"use client";

import { useState, useEffect } from "react";
import { getAlunos, upsertAluno, deleteAluno } from "@/app/actions/alunos";

interface Aluno {
  id: string;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  plano: string | null;
  mensalidade: number;
  tipoCobranca: string;
  aulas: { id: string }[];
}

const EMPTY = { nome: "", telefone: "", ativo: true, plano: "", mensalidade: 0, tipoCobranca: "MENSAL" };

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setAlunos(await getAlunos() as Aluno[]);
    setLoading(false);
  };

  const startEdit = (a: Aluno) => {
    setEditId(a.id);
    setForm({ 
      nome: a.nome, 
      telefone: a.telefone ?? "", 
      ativo: a.ativo,
      plano: a.plano ?? "",
      mensalidade: a.mensalidade,
      tipoCobranca: a.tipoCobranca
    });
    setMsg(null);
  };

  const cancel = () => { setEditId(null); setForm(EMPTY); setMsg(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const r = await upsertAluno({ 
      id: editId ?? undefined, 
      nome: form.nome, 
      telefone: form.telefone || undefined, 
      ativo: form.ativo,
      plano: form.plano || undefined,
      mensalidade: form.mensalidade,
      tipoCobranca: form.tipoCobranca
    });
    setSubmitting(false);
    if (r.success) {
      setMsg({ type: "ok", text: editId ? "Aluno atualizado!" : "Aluno cadastrado!" });
      cancel();
      load();
    } else {
      setMsg({ type: "err", text: r.error ?? "Erro ao salvar." });
    }
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Excluir ${nome}? As aulas vinculadas também serão removidas.`)) return;
    const r = await deleteAluno(id);
    if (r.success) load();
    else alert(r.error);
  };

  const ativos = alunos.filter(a => a.ativo);
  const inativos = alunos.filter(a => !a.ativo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Alunos</h1>
        <p className="text-sm text-slate-400">Cadastre seus alunos e visualize quantas aulas cada um tem por semana.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 h-fit space-y-4">
          <h2 className="text-lg font-bold text-white">{editId ? "Editar Aluno" : "Novo Aluno"}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Nome</label>
              <input
                type="text"
                placeholder="Nome do aluno"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">WhatsApp (opcional)</label>
              <input
                type="tel"
                placeholder="(85) 99999-9999"
                value={form.telefone}
                onChange={e => setForm({ ...form, telefone: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>
            {editId && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="rounded" />
                <span className="text-xs font-semibold text-slate-400">Ativo</span>
              </label>
            )}

            <div className="border-t border-slate-800 pt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tipo de Cobrança</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, tipoCobranca: "MENSAL" })} className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${form.tipoCobranca === "MENSAL" ? "bg-teal-900/40 border-teal-500 text-teal-400" : "bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                    Mensalidade Fixa
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, tipoCobranca: "POR_AULA" })} className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${form.tipoCobranca === "POR_AULA" ? "bg-teal-900/40 border-teal-500 text-teal-400" : "bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-300"}`}>
                    Por Aula (Avulso)
                  </button>
                </div>
              </div>

              {form.tipoCobranca === "MENSAL" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Plano (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Evolution 2x"
                      value={form.plano}
                      onChange={e => setForm({ ...form, plano: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Valor da Mensalidade (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="640.00"
                      value={form.mensalidade}
                      onChange={e => setForm({ ...form, mensalidade: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

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

        {/* Lista */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ativos */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Alunos Ativos <span className="ml-2 text-sm font-normal text-teal-400">({ativos.length})</span>
            </h2>
            {loading ? (
              <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
            ) : ativos.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum aluno ativo cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {ativos.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-900/40 border border-teal-800 text-teal-400 text-sm font-bold shrink-0">
                        {a.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {a.nome}
                          {a.plano && <span className="ml-2 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{a.plano}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {a.tipoCobranca === "MENSAL" ? `R$ ${a.mensalidade.toFixed(2)}/mês` : "Por Aula"} · {a.aulas.length} aula{a.aulas.length !== 1 ? "s" : ""}/sem
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => startEdit(a)}
                        className="text-xs text-slate-400 hover:text-teal-400 border border-slate-700 hover:border-teal-700 px-3 py-1.5 rounded-lg transition-all font-semibold">
                        Editar
                      </button>
                      <button onClick={() => del(a.id, a.nome)}
                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-all font-semibold">
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inativos */}
          {inativos.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
              <h2 className="text-base font-semibold text-slate-500 mb-3">Inativos ({inativos.length})</h2>
              <div className="space-y-2">
                {inativos.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950/20 p-3 opacity-60">
                    <span className="text-sm text-slate-400">{a.nome}</span>
                    <button onClick={() => startEdit(a)}
                      className="text-xs text-slate-500 hover:text-teal-400 border border-slate-800 px-3 py-1 rounded-lg transition-all">
                      Reativar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
