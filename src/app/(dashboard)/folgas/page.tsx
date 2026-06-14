"use client";

import { useState, useEffect } from "react";
import { getColaboradores } from "@/app/actions/colaboradores";
import { getFolgasByColaborador, salvarFolga, excluirFolga } from "@/app/actions/folgas";

interface Colaborador { id: string; nome: string; cargo: string; }
interface Folga {
  id: string;
  data: Date;
  tipo: string;
  origem: string;
  justificativa: string;
}

const today = () => new Date().toISOString().split("T")[0];

export default function FolgasPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedColab, setSelectedColab] = useState("");
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    dataStr: today(),
    tipo: "GOZADA" as "GERADA" | "GOZADA",
    origem: "MANUAL" as "SABADO" | "DOMINGO" | "FERIADO" | "MANUAL",
    justificativa: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getColaboradores().then((data) => setColaboradores(data as Colaborador[]));
  }, []);

  useEffect(() => {
    if (!selectedColab) { setFolgas([]); return; }
    fetchFolgas(selectedColab);
  }, [selectedColab]);

  const fetchFolgas = async (id: string) => {
    setLoading(true);
    const data = await getFolgasByColaborador(id);
    setFolgas(data.map((f: any) => ({ ...f, data: new Date(f.data) })));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedColab) { setError("Selecione um colaborador."); return; }
    setSubmitting(true);
    const result = await salvarFolga({
      colaboradorId: selectedColab,
      dataStr: form.dataStr,
      tipo: form.tipo,
      origem: form.origem,
      justificativa: form.justificativa,
    });
    setSubmitting(false);
    if (result.success) {
      setSuccess("Folga registrada com sucesso!");
      setForm({ dataStr: today(), tipo: "GOZADA", origem: "MANUAL", justificativa: "" });
      await fetchFolgas(selectedColab);
    } else {
      setError(result.error || "Erro ao salvar folga.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro de folga?")) return;
    const result = await excluirFolga(id);
    if (result.success) await fetchFolgas(selectedColab);
    else alert(result.error);
  };

  const folgasGeradas = folgas.filter((f) => f.tipo === "GERADA").length;
  const folgasGozadas = folgas.filter((f) => f.tipo === "GOZADA").length;
  const saldo = folgasGeradas - folgasGozadas;

  const origemLabel: Record<string, string> = {
    SABADO: "Plantão Sábado",
    DOMINGO: "Plantão Domingo",
    FERIADO: "Feriado Trabalhado",
    MANUAL: "Manual",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Folgas</h1>
        <p className="text-sm text-slate-400">Gerencie folgas geradas e gozadas por colaborador.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 h-fit space-y-4">
          <h2 className="text-lg font-bold text-white">Registrar Folga</h2>

          {/* Seleção colaborador */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Colaborador</label>
            <select
              value={selectedColab}
              onChange={(e) => setSelectedColab(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
            >
              <option value="">Selecione...</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Data</label>
              <input
                type="date"
                value={form.dataStr}
                onChange={(e) => setForm({ ...form, dataStr: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as "GERADA" | "GOZADA" })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              >
                <option value="GOZADA">Gozada (usada)</option>
                <option value="GERADA">Gerada (conquistada)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Origem</label>
              <select
                value={form.origem}
                onChange={(e) => setForm({ ...form, origem: e.target.value as typeof form.origem })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              >
                <option value="MANUAL">Manual</option>
                <option value="SABADO">Plantão Sábado</option>
                <option value="DOMINGO">Plantão Domingo</option>
                <option value="FERIADO">Feriado Trabalhado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Justificativa (opcional)</label>
              <input
                type="text"
                placeholder="ex: Folga compensatória aprovada"
                value={form.justificativa}
                onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">{error}</p>}
            {success && <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">{success}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Registrar Folga"}
            </button>
          </form>
        </div>

        {/* Histórico */}
        <div className="lg:col-span-2 space-y-4">
          {/* Saldo */}
          {selectedColab && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-center">
                <p className="text-xs text-slate-500 font-semibold uppercase">Geradas</p>
                <p className="text-2xl font-bold text-teal-400 mt-1">{folgasGeradas}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-center">
                <p className="text-xs text-slate-500 font-semibold uppercase">Gozadas</p>
                <p className="text-2xl font-bold text-slate-300 mt-1">{folgasGozadas}</p>
              </div>
              <div className={`rounded-xl border p-4 text-center ${saldo > 0 ? "border-emerald-800 bg-emerald-950/20" : saldo < 0 ? "border-red-800 bg-red-950/20" : "border-slate-800 bg-slate-900/20"}`}>
                <p className="text-xs text-slate-500 font-semibold uppercase">Saldo</p>
                <p className={`text-2xl font-bold mt-1 ${saldo > 0 ? "text-emerald-400" : saldo < 0 ? "text-red-400" : "text-white"}`}>
                  {saldo}
                </p>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Histórico
              {selectedColab && colaboradores.find(c => c.id === selectedColab) && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  — {colaboradores.find(c => c.id === selectedColab)?.nome}
                </span>
              )}
            </h2>
            {!selectedColab ? (
              <p className="text-sm text-slate-500 text-center py-10">Selecione um colaborador para ver as folgas.</p>
            ) : loading ? (
              <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
            ) : folgas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Nenhuma folga registrada.</p>
            ) : (
              <div className="space-y-2">
                {folgas.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                        f.tipo === "GERADA"
                          ? "bg-teal-950/40 border-teal-800 text-teal-400"
                          : "bg-slate-800/60 border-slate-700 text-slate-400"
                      }`}>
                        {f.tipo}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {f.data.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {origemLabel[f.origem] || f.origem}
                          {f.justificativa && ` — ${f.justificativa}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors font-semibold px-2 py-1"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
