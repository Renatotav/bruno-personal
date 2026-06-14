"use client";

import { useState, useEffect } from "react";
import { getEscalasBySemana, salvarEscala } from "@/app/actions/escala";

interface ColabGrid {
  colaboradorId: string;
  nome: string;
  cargo: string;
  regimePadrao: string;
  regimeSemana: string;
  escalaId: string | null;
}

type ColabComElegibilidade = ColabGrid;

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstMondayOffset = (8 - firstDayOfMonth.getDay()) % 7;
  const firstMonday = new Date(firstDayOfMonth);
  firstMonday.setDate(1 + (firstMondayOffset === 0 ? 0 : firstMondayOffset));
  if (date < firstMonday) return 1;
  return Math.floor((date.getDate() - firstMonday.getDate()) / 7) + 2;
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

export default function EscalaPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [semana, setSemana] = useState(getWeekOfMonth(now));
  const [grid, setGrid] = useState<ColabComElegibilidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => { fetchGrid(); }, [ano, mes, semana]);

  const fetchGrid = async () => {
    setLoading(true);
    const data = await getEscalasBySemana(ano, mes, semana);
    setGrid(data as ColabComElegibilidade[]);
    setLoading(false);
  };

  const handleToggle = async (colaboradorId: string, currentRegime: string) => {
    const novoRegime = currentRegime === "PRESENCIAL" ? "REMOTO" : "PRESENCIAL";
    setSaving(colaboradorId);
    const result = await salvarEscala({
      colaboradorId,
      ano,
      mes,
      semanaNumero: semana,
      regime: novoRegime as "PRESENCIAL" | "REMOTO",
    });
    if (result.success) {
      setGrid((prev) =>
        prev.map((c) =>
          c.colaboradorId === colaboradorId ? { ...c, regimeSemana: novoRegime } : c
        )
      );
      setSavedMsg("Salvo!");
      setTimeout(() => setSavedMsg(""), 2000);
    }
    setSaving(null);
  };

  const weeks = [1, 2, 3, 4, 5];
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const presencialCount = grid.filter((c) => c.regimeSemana === "PRESENCIAL").length;
  const remotoCount = grid.filter((c) => c.regimeSemana === "REMOTO").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Escala Presencial / Remoto</h1>
          <p className="text-sm text-slate-400">
            Defina o regime de trabalho por semana e acompanhe os indicadores de elegibilidade.
          </p>
        </div>
        {savedMsg && (
          <span className="text-sm font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-800 px-3 py-1.5 rounded-lg">
            ✓ {savedMsg}
          </span>
        )}
      </div>

      {/* Seletores de período */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Ano</label>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Mês</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-white outline-none focus:border-teal-500 text-sm"
          >
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400">Semana</label>
          <div className="flex space-x-1">
            {weeks.map((w) => (
              <button
                key={w}
                onClick={() => setSemana(w)}
                className={`h-9 w-9 rounded-lg text-sm font-bold transition-all border ${
                  semana === w
                    ? "bg-teal-600 border-teal-500 text-white"
                    : "bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Contadores rápidos */}
        <div className="ml-auto flex space-x-3">
          <span className="text-xs font-semibold bg-slate-800/60 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg">
            Presencial: <strong className="text-white">{presencialCount}</strong>
          </span>
          <span className="text-xs font-semibold bg-teal-950/30 border border-teal-800/40 text-teal-300 px-3 py-2 rounded-lg">
            Remoto: <strong className="text-teal-400">{remotoCount}</strong>
          </span>
        </div>
      </div>

      {/* Grid de escala */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          {MONTHS[mes - 1]} {ano} — Semana {semana}
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse py-8 text-center">Carregando...</p>
        ) : grid.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            Nenhum colaborador ativo encontrado.{" "}
            <a href="/colaboradores" className="text-teal-400 hover:underline">Cadastrar →</a>
          </p>
        ) : (
          <div className="space-y-3">
            {grid.map((c) => {
              const isPresencial = c.regimeSemana === "PRESENCIAL";
              const isSaving = saving === c.colaboradorId;

              return (
                <div
                  key={c.colaboradorId}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                    isPresencial
                      ? "border-slate-700 bg-slate-900/40"
                      : "border-teal-800/40 bg-teal-950/10"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${
                      isPresencial
                        ? "bg-slate-800/60 border-slate-700 text-slate-300"
                        : "bg-teal-900/40 border-teal-700 text-teal-400"
                    }`}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{c.nome}</div>
                      <div className="text-xs text-slate-500">{c.cargo}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                      isPresencial
                        ? "bg-slate-800/60 border-slate-700 text-slate-300"
                        : "bg-teal-950/40 border-teal-700 text-teal-400"
                    }`}>
                      {c.regimeSemana}
                    </span>

                    <button
                      onClick={() => handleToggle(c.colaboradorId, c.regimeSemana)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-60 ${
                        isPresencial ? "bg-slate-700" : "bg-teal-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${
                          isPresencial ? "translate-x-1" : "translate-x-6"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legenda de regras */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Regras de Elegibilidade para Remoto</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
            <span className="text-slate-400">1–2 sem. presencial: <strong className="text-slate-200">Neutro</strong></span>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-yellow-800/40 bg-yellow-950/10 p-3">
            <span className="h-3 w-3 rounded-full bg-yellow-400 shrink-0" />
            <span className="text-slate-400">3 sem.: <strong className="text-yellow-400">Atenção</strong></span>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-red-800/30 bg-red-950/10 p-3">
            <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
            <span className="text-slate-400">4–6 sem.: <strong className="text-red-400">Elegível para remoto</strong></span>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border-2 border-red-500 bg-red-950/20 p-3 animate-pulse">
            <span className="h-3 w-3 rounded-full bg-red-400 shrink-0 animate-pulse" />
            <span className="text-slate-400">&gt;6 sem.: <strong className="text-red-300">Crítico!</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
