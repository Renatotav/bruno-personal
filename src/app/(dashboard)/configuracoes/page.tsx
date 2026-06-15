"use client";

import { useState, useEffect } from "react";
import {
  alterarSenha,
  salvarConfigCarro,
  salvarEndereco,
  salvarCustosFixos,
  getAllConfigs,
} from "@/app/actions/configuracoes";
import {
  parseCfg,
  parseCfgFixos,
  CONFIG_PADRAO,
  CONFIG_FIXOS_PADRAO,
  calcularCustoFixoPorKm,
} from "@/lib/calculos";

type Msg = { type: "ok" | "err"; text: string } | null;

export default function ConfiguracoesPage() {
  // ── Endereço ──────────────────────────────────────────────────
  const [endereco, setEndereco] = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endMsg, setEndMsg] = useState<Msg>(null);

  // ── Custos variáveis ─────────────────────────────────────────
  const [cfgForm, setCfgForm] = useState({
    precoGasolina: String(CONFIG_PADRAO.precoGasolina),
    kmPorLitro: String(CONFIG_PADRAO.kmPorLitro),
    custoPorKm: String(CONFIG_PADRAO.custoPorKm),
  });
  const [cfgSubmitting, setCfgSubmitting] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<Msg>(null);

  // ── Custos fixos ─────────────────────────────────────────────
  const [fixosForm, setFixosForm] = useState({
    ipvaAnual: String(CONFIG_FIXOS_PADRAO.ipvaAnual),
    seguroAnual: String(CONFIG_FIXOS_PADRAO.seguroAnual),
    dpvatAnual: String(CONFIG_FIXOS_PADRAO.dpvatAnual),
    manutencaoMensal: String(CONFIG_FIXOS_PADRAO.manutencaoMensal),
    kmPorMes: String(CONFIG_FIXOS_PADRAO.kmPorMes),
  });
  const [fixosSubmitting, setFixosSubmitting] = useState(false);
  const [fixosMsg, setFixosMsg] = useState<Msg>(null);

  // ── Senha ─────────────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaSubmitting, setSenhaSubmitting] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState<Msg>(null);

  useEffect(() => {
    getAllConfigs().then((configs) => {
      setEndereco(configs.find((c) => c.key === "endereco")?.value ?? "");

      const parsed = parseCfg(configs);
      setCfgForm({
        precoGasolina: String(parsed.precoGasolina),
        kmPorLitro: String(parsed.kmPorLitro),
        custoPorKm: String(parsed.custoPorKm),
      });

      const pf = parseCfgFixos(configs);
      setFixosForm({
        ipvaAnual: String(pf.ipvaAnual),
        seguroAnual: String(pf.seguroAnual),
        dpvatAnual: String(pf.dpvatAnual),
        manutencaoMensal: String(pf.manutencaoMensal),
        kmPorMes: String(pf.kmPorMes),
      });
    });
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleEndereco = async (e: React.FormEvent) => {
    e.preventDefault();
    setEndSubmitting(true);
    setEndMsg(null);
    const r = await salvarEndereco({ endereco });
    setEndSubmitting(false);
    setEndMsg(r.success ? { type: "ok", text: "Endereço salvo!" } : { type: "err", text: "Erro ao salvar." });
  };

  const handleCarro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfgSubmitting(true);
    setCfgMsg(null);
    const r = await salvarConfigCarro({
      precoGasolina: parseFloat(cfgForm.precoGasolina),
      kmPorLitro: parseFloat(cfgForm.kmPorLitro),
      custoPorKm: parseFloat(cfgForm.custoPorKm),
    });
    setCfgSubmitting(false);
    setCfgMsg(r.success ? { type: "ok", text: "Configurações salvas!" } : { type: "err", text: "Erro ao salvar." });
  };

  const handleFixos = async (e: React.FormEvent) => {
    e.preventDefault();
    setFixosSubmitting(true);
    setFixosMsg(null);
    const r = await salvarCustosFixos({
      ipvaAnual: parseFloat(fixosForm.ipvaAnual) || 0,
      seguroAnual: parseFloat(fixosForm.seguroAnual) || 0,
      dpvatAnual: parseFloat(fixosForm.dpvatAnual) || 0,
      manutencaoMensal: parseFloat(fixosForm.manutencaoMensal) || 0,
      kmPorMes: parseFloat(fixosForm.kmPorMes) || 1000,
    });
    setFixosSubmitting(false);
    setFixosMsg(r.success ? { type: "ok", text: "Custos fixos salvos!" } : { type: "err", text: "Erro ao salvar." });
  };

  const handleSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaMsg(null);
    if (novaSenha !== confirmarSenha) {
      setSenhaMsg({ type: "err", text: "As senhas não conferem." });
      return;
    }
    setSenhaSubmitting(true);
    const r = await alterarSenha({ senhaAtual, novaSenha });
    setSenhaSubmitting(false);
    if (r.success) {
      setSenhaMsg({ type: "ok", text: "Senha alterada com sucesso!" });
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } else {
      setSenhaMsg({ type: "err", text: r.error ?? "Erro ao alterar senha." });
    }
  };

  // ── Preview helpers ───────────────────────────────────────────
  const varPreco = parseFloat(cfgForm.precoGasolina) || 0;
  const varKml = parseFloat(cfgForm.kmPorLitro) || 1;
  const varDesgaste = parseFloat(cfgForm.custoPorKm) || 0;
  const varCombPorKm = varPreco / varKml;
  const varTotalPorKm = varCombPorKm + varDesgaste;

  const fixPreview = calcularCustoFixoPorKm({
    ipvaAnual: parseFloat(fixosForm.ipvaAnual) || 0,
    seguroAnual: parseFloat(fixosForm.seguroAnual) || 0,
    dpvatAnual: parseFloat(fixosForm.dpvatAnual) || 0,
    manutencaoMensal: parseFloat(fixosForm.manutencaoMensal) || 0,
    kmPorMes: parseFloat(fixosForm.kmPorMes) || 1000,
  });

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm";

  const msgBlock = (m: Msg) =>
    m ? (
      <p
        className={`text-xs p-2.5 rounded-lg border font-semibold ${
          m.type === "ok"
            ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30"
            : "text-red-400 bg-red-950/20 border-red-900/30"
        }`}
      >
        {m.text}
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
        <p className="text-sm text-slate-400">
          Endereço de partida, custos do carro e senha de acesso.
        </p>
      </div>

      {/* ── Endereço ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Endereço de Partida</h2>
          <p className="text-xs text-slate-400 mt-1">
            Seu endereço ou bairro — ponto de partida para todos os deslocamentos.
          </p>
        </div>
        <form onSubmit={handleEndereco} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex: Rua das Flores, 123 — Jardim Europa, São Paulo"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm placeholder-slate-600"
          />
          <div className="flex items-center gap-3 shrink-0">
            {endMsg && (
              <p
                className={`text-xs font-semibold ${
                  endMsg.type === "ok" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {endMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={endSubmitting}
              className="rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 px-5 text-sm font-semibold text-white transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {endSubmitting ? "Salvando..." : "Salvar Endereço"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Custo Variável + Senha ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Custos Variáveis */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Custos Variáveis do Carro</h2>
            <p className="text-xs text-slate-400 mt-1">
              Combustível e desgaste — variam conforme os km rodados.
            </p>
          </div>

          <form onSubmit={handleCarro} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Preço da Gasolina (R$/litro)</label>
              <input
                type="number" step="0.01" min="0" value={cfgForm.precoGasolina}
                onChange={(e) => setCfgForm({ ...cfgForm, precoGasolina: e.target.value })}
                required className={inputClass}
              />
              <p className="text-[10px] text-slate-500">Atualize sempre que abastecer.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Rendimento do Carro (km/litro)</label>
              <input
                type="number" step="0.1" min="1" value={cfgForm.kmPorLitro}
                onChange={(e) => setCfgForm({ ...cfgForm, kmPorLitro: e.target.value })}
                required className={inputClass}
              />
              <p className="text-[10px] text-slate-500">Média urbana do seu veículo.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Custo de Desgaste (R$/km)</label>
              <input
                type="number" step="0.01" min="0" value={cfgForm.custoPorKm}
                onChange={(e) => setCfgForm({ ...cfgForm, custoPorKm: e.target.value })}
                required className={inputClass}
              />
              <p className="text-[10px] text-slate-500">
                Pneus, depreciação e pequenos reparos. Sugerido: R$ 0,15/km.
              </p>
            </div>

            {/* Preview variáveis */}
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs space-y-1">
              <p className="text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Custo variável por km
              </p>
              <div className="flex justify-between text-slate-300">
                <span>Combustível</span>
                <span>R$ {varCombPorKm.toFixed(3)}/km</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Desgaste</span>
                <span>R$ {varDesgaste.toFixed(3)}/km</span>
              </div>
              <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1 mt-1">
                <span>Total variável</span>
                <span className="text-orange-400">R$ {varTotalPorKm.toFixed(3)}/km</span>
              </div>
            </div>

            {msgBlock(cfgMsg)}

            <button
              type="submit" disabled={cfgSubmitting}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {cfgSubmitting ? "Salvando..." : "Salvar Custos Variáveis"}
            </button>
          </form>
        </div>

        {/* Senha */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4 h-fit">
          <div>
            <h2 className="text-lg font-bold text-white">Segurança</h2>
            <p className="text-xs text-slate-400 mt-1">Altere a senha de acesso ao painel.</p>
          </div>
          <form onSubmit={handleSenha} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Senha Atual</label>
              <input type="password" value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)} required className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Nova Senha</label>
              <input type="password" value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)} required className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Confirmar Nova Senha</label>
              <input type="password" value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)} required className={inputClass} />
            </div>
            {msgBlock(senhaMsg)}
            <button
              type="submit" disabled={senhaSubmitting}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {senhaSubmitting ? "Alterando..." : "Alterar Senha"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Custos Fixos ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Custos Fixos do Carro</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gastos anuais e mensais que existem independente de quantos km você roda.
          </p>
        </div>

        <form onSubmit={handleFixos} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">IPVA (R$/ano)</label>
              <input
                type="number" step="0.01" min="0" value={fixosForm.ipvaAnual}
                onChange={(e) => setFixosForm({ ...fixosForm, ipvaAnual: e.target.value })}
                placeholder="0,00" className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Seguro do Carro (R$/ano)</label>
              <input
                type="number" step="0.01" min="0" value={fixosForm.seguroAnual}
                onChange={(e) => setFixosForm({ ...fixosForm, seguroAnual: e.target.value })}
                placeholder="0,00" className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">DPVAT (R$/ano)</label>
              <input
                type="number" step="0.01" min="0" value={fixosForm.dpvatAnual}
                onChange={(e) => setFixosForm({ ...fixosForm, dpvatAnual: e.target.value })}
                placeholder="0,00" className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Manutenção Média (R$/mês)</label>
              <input
                type="number" step="0.01" min="0" value={fixosForm.manutencaoMensal}
                onChange={(e) => setFixosForm({ ...fixosForm, manutencaoMensal: e.target.value })}
                placeholder="0,00" className={inputClass}
              />
              <p className="text-[10px] text-slate-500">Revisões, óleo, filtros, etc.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Km Rodados por Mês (estimativa)</label>
              <input
                type="number" step="1" min="1" value={fixosForm.kmPorMes}
                onChange={(e) => setFixosForm({ ...fixosForm, kmPorMes: e.target.value })}
                placeholder="1000" className={inputClass}
              />
              <p className="text-[10px] text-slate-500">Usado para calcular o custo fixo por km.</p>
            </div>
          </div>

          {/* Preview custos fixos */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs space-y-1.5">
            <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Resumo mensal dos custos fixos
            </p>
            <div className="flex justify-between text-slate-300">
              <span>IPVA + Seguro + DPVAT ÷ 12</span>
              <span>
                R${" "}
                {(
                  ((parseFloat(fixosForm.ipvaAnual) || 0) +
                    (parseFloat(fixosForm.seguroAnual) || 0) +
                    (parseFloat(fixosForm.dpvatAnual) || 0)) /
                  12
                ).toFixed(2)}
                /mês
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Manutenção</span>
              <span>R$ {(parseFloat(fixosForm.manutencaoMensal) || 0).toFixed(2)}/mês</span>
            </div>
            <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1.5 mt-1">
              <span>Total fixo mensal</span>
              <span className="text-purple-400">R$ {fixPreview.mensalTotal.toFixed(2)}/mês</span>
            </div>
            <div className="flex justify-between text-white font-bold">
              <span>Custo fixo por km</span>
              <span className="text-purple-400">R$ {fixPreview.porKm.toFixed(3)}/km</span>
            </div>
            <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1.5 mt-1">
              <span>Custo total real por km (fixo + variável)</span>
              <span className="text-red-400">R$ {(varTotalPorKm + fixPreview.porKm).toFixed(3)}/km</span>
            </div>
          </div>

          {msgBlock(fixosMsg)}

          <button
            type="submit" disabled={fixosSubmitting}
            className="rounded-lg bg-purple-700 hover:bg-purple-600 py-2.5 px-8 text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            {fixosSubmitting ? "Salvando..." : "Salvar Custos Fixos"}
          </button>
        </form>
      </div>
    </div>
  );
}
