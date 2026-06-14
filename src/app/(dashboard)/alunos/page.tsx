"use client";

import { useState, useEffect } from "react";
import { getAlunos, upsertAluno, deleteAluno } from "@/app/actions/alunos";

interface Aluno {
  id: string;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  aulas: { id: string }[];
}

const EMPTY = { nome: "", telefone: "", ativo: true };

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
    setForm({ nome: a.nome, telefone: a.telefone ?? "", ativo: a.ativo });
    setMsg(null);
  };

  const cancel = () => { setEditId(null); setForm(EMPTY); setMsg(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const r = await upsertAluno({ id: editId ?? undefined, nome: form.nome, telefone: form.telefone || undefined, ativo: form.ativo });
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
                        <p className="font-semibold text-white text-sm">{a.nome}</p>
                        <p className="text-xs text-slate-500">
                          {a.telefone ?? "Sem telefone"} · {a.aulas.length} aula{a.aulas.length !== 1 ? "s" : ""}/semana
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
