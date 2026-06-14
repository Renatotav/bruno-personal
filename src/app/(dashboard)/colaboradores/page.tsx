"use client";

import { useState, useEffect } from "react";
import { getColaboradores, upsertColaborador, deleteColaborador } from "@/app/actions/colaboradores";

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  regimePadrao: string;
  ativo: boolean;
}

const EMPTY_FORM = { id: "", nome: "", cargo: "", regimePadrao: "PRESENCIAL", ativo: true };

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { fetchColaboradores(); }, []);

  const fetchColaboradores = async () => {
    setLoading(true);
    const data = await getColaboradores();
    setColaboradores(data as Colaborador[]);
    setLoading(false);
  };

  const handleEdit = (c: Colaborador) => {
    setEditingId(c.id);
    setForm({ id: c.id, nome: c.nome, cargo: c.cargo, regimePadrao: c.regimePadrao, ativo: c.ativo });
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const result = await upsertColaborador({
      id: editingId || undefined,
      nome: form.nome,
      cargo: form.cargo,
      regimePadrao: form.regimePadrao,
      ativo: form.ativo,
    });

    setSubmitting(false);

    if (result.success) {
      setSuccess(editingId ? "Colaborador atualizado com sucesso!" : "Colaborador cadastrado com sucesso!");
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchColaboradores();
    } else {
      setError(result.error || "Erro ao salvar.");
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir ${nome}? Todos os lançamentos vinculados serão removidos.`)) return;
    const result = await deleteColaborador(id);
    if (result.success) {
      await fetchColaboradores();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Colaboradores</h1>
        <p className="text-sm text-slate-400">Cadastre e gerencie os membros da equipe.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">
            {editingId ? "Editar Colaborador" : "Novo Colaborador"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Nome Completo</label>
              <input
                type="text"
                placeholder="Nome do colaborador"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Cargo / Função</label>
              <input
                type="text"
                placeholder="ex: Analista, Desenvolvedor"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Regime Padrão</label>
              <select
                value={form.regimePadrao}
                onChange={(e) => setForm({ ...form, regimePadrao: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="REMOTO">Remoto</option>
              </select>
            </div>
            {editingId && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="ativo" className="text-xs font-semibold text-slate-400">Ativo</label>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">{error}</p>
            )}
            {success && (
              <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">{success}</p>
            )}

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              >
                {submitting ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Equipe ({colaboradores.length} cadastrado{colaboradores.length !== 1 ? "s" : ""})
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
          ) : colaboradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-500 text-sm">Nenhum colaborador cadastrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {colaboradores.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-900/40 border border-teal-800 text-teal-400 text-sm font-bold">
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-sm">{c.nome}</span>
                        {!c.ativo && (
                          <span className="text-[10px] bg-red-950/40 border border-red-800 text-red-400 px-1.5 py-0.5 rounded font-semibold">
                            INATIVO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xs text-slate-400">{c.cargo}</span>
                        <span className="text-slate-700">•</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          c.regimePadrao === "REMOTO"
                            ? "bg-teal-950/40 border-teal-800 text-teal-400"
                            : "bg-slate-800/60 border-slate-700 text-slate-400"
                        }`}>
                          {c.regimePadrao}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-xs text-slate-400 hover:text-teal-400 border border-slate-700 hover:border-teal-700 px-3 py-1.5 rounded-lg transition-all font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.nome)}
                      className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-all font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
