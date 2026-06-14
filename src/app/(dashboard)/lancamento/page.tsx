"use client";

import { useState, useEffect } from "react";
import { getColaboradores } from "@/app/actions/colaboradores";
import { salvarPonto, excluirPonto, getPontosByColaborador } from "@/app/actions/pontos";

interface Colaborador { id: string; nome: string; cargo: string; }
interface Ponto {
  id: string;
  data: Date;
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  horasTrabalhadas: number;
  saldoMinutos: number;
  isFeriado: boolean;
}

const today = () => new Date().toISOString().split("T")[0];

export default function LancamentoPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedColab, setSelectedColab] = useState("");
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loadingPontos, setLoadingPontos] = useState(false);

  const [form, setForm] = useState({
    dataStr: today(),
    entrada1: "",
    saida1: "",
    entrada2: "",
    saida2: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getColaboradores().then((data) => setColaboradores(data as Colaborador[]));
  }, []);

  useEffect(() => {
    if (!selectedColab) { setPontos([]); return; }
    fetchPontos(selectedColab);
  }, [selectedColab]);

  const fetchPontos = async (id: string) => {
    setLoadingPontos(true);
    const data = await getPontosByColaborador(id);
    setPontos(data.map((p: any) => ({ ...p, data: new Date(p.data) })));
    setLoadingPontos(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedColab) { setError("Selecione um colaborador."); return; }

    setSubmitting(true);
    const result = await salvarPonto({
      colaboradorId: selectedColab,
      dataStr: form.dataStr,
      entrada1: form.entrada1,
      saida1: form.saida1,
      entrada2: form.entrada2,
      saida2: form.saida2,
    });
    setSubmitting(false);

    if (result.success) {
      const feriadoMsg = result.isFeriado ? ` (Feriado: ${result.holidayName} — +2 folgas geradas)` : "";
      setSuccess(`Ponto salvo com sucesso!${feriadoMsg}`);
      setForm({ dataStr: today(), entrada1: "", saida1: "", entrada2: "", saida2: "" });
      await fetchPontos(selectedColab);
    } else {
      setError(result.error || "Erro ao salvar ponto.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro de ponto? As folgas geradas por ele também serão removidas.")) return;
    const result = await excluirPonto(id);
    if (result.success) {
      await fetchPontos(selectedColab);
    } else {
      alert(result.error);
    }
  };

  const formatMinutes = (min: number) => {
    const sign = min < 0 ? "-" : "+";
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}h${m.toString().padStart(2, "0")}min`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Lançamento de Ponto</h1>
        <p className="text-sm text-slate-400">Registre os horários de entrada e saída por colaborador.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário de lançamento */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Registrar Ponto</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seleção de colaborador */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Colaborador</label>
              <select
                value={selectedColab}
                onChange={(e) => setSelectedColab(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm"
              >
                <option value="">Selecione...</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} — {c.cargo}</option>
                ))}
              </select>
            </div>

            {/* Data */}
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

            {/* Período 1 */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">1º Período (Manhã)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Entrada</label>
                  <input
                    type="time"
                    value={form.entrada1}
                    onChange={(e) => setForm({ ...form, entrada1: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Saída</label>
                  <input
                    type="time"
                    value={form.saida1}
                    onChange={(e) => setForm({ ...form, saida1: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Período 2 */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">2º Período (Tarde)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Entrada</label>
                  <input
                    type="time"
                    value={form.entrada2}
                    onChange={(e) => setForm({ ...form, entrada2: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500">Saída</label>
                  <input
                    type="time"
                    value={form.saida2}
                    onChange={(e) => setForm({ ...form, saida2: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">{error}</p>
            )}
            {success && (
              <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">{success}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar Ponto"}
            </button>
          </form>

          {/* Legenda de jornada */}
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Jornada Esperada</p>
            <div className="space-y-1 text-[10px] text-slate-400">
              <div className="flex justify-between"><span>Seg–Qui</span><span className="text-slate-300">9h/dia</span></div>
              <div className="flex justify-between"><span>Sexta Presencial</span><span className="text-slate-300">8h/dia</span></div>
              <div className="flex justify-between"><span>Sexta Remoto</span><span className="text-slate-300">8h/dia</span></div>
              <div className="flex justify-between"><span>Sábado (plantão)</span><span className="text-teal-400">8h → +1 folga</span></div>
              <div className="flex justify-between"><span>Domingo (plantão)</span><span className="text-teal-400">8h → +2 folgas</span></div>
              <div className="flex justify-between"><span>Feriado trabalhado</span><span className="text-teal-400">→ +2 folgas</span></div>
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Histórico de Ponto
            {selectedColab && colaboradores.find(c => c.id === selectedColab) && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                — {colaboradores.find(c => c.id === selectedColab)?.nome}
              </span>
            )}
          </h2>

          {!selectedColab ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-500 text-sm">Selecione um colaborador para ver o histórico.</p>
            </div>
          ) : loadingPontos ? (
            <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
          ) : pontos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-500 text-sm">Nenhum lançamento registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Manhã</th>
                    <th className="pb-3 pr-4">Tarde</th>
                    <th className="pb-3 pr-4">Trabalhado</th>
                    <th className="pb-3 pr-4">Saldo</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pontos.map((p) => (
                    <tr key={p.id} className="group">
                      <td className="py-3 pr-4 text-white font-medium">
                        <div>
                          {p.data.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </div>
                        {p.isFeriado && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/30 border border-amber-800/40 px-1.5 py-0.5 rounded">
                            FERIADO
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-300 text-xs">
                        {p.entrada1 && p.saida1 ? `${p.entrada1} – ${p.saida1}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-300 text-xs">
                        {p.entrada2 && p.saida2 ? `${p.entrada2} – ${p.saida2}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-300 text-xs">
                        {p.horasTrabalhadas > 0 ? `${p.horasTrabalhadas.toFixed(1)}h` : "—"}
                      </td>
                      <td className={`py-3 pr-4 text-xs font-semibold ${p.saldoMinutos >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatMinutes(p.saldoMinutos)}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-slate-600 hover:text-red-400 transition-colors font-semibold"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
