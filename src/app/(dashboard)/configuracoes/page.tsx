"use client";

import { useState, useEffect } from "react";
import { alterarSenha, salvarConfigCarro, getConfigCarro } from "@/app/actions/configuracoes";
import { parseCfg, CONFIG_PADRAO } from "@/lib/calculos";

export default function ConfiguracoesPage() {
  const [cfg, setCfg] = useState(CONFIG_PADRAO);
  const [cfgForm, setCfgForm] = useState({
    precoGasolina: String(CONFIG_PADRAO.precoGasolina),
    kmPorLitro: String(CONFIG_PADRAO.kmPorLitro),
    custoPorKm: String(CONFIG_PADRAO.custoPorKm),
  });
  const [cfgSubmitting, setCfgSubmitting] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaSubmitting, setSenhaSubmitting] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    getConfigCarro().then(configs => {
      const parsed = parseCfg(configs);
      setCfg(parsed);
      setCfgForm({
        precoGasolina: String(parsed.precoGasolina),
        kmPorLitro: String(parsed.kmPorLitro),
        custoPorKm: String(parsed.custoPorKm),
      });
    });
  }, []);

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
    if (r.success) setCfgMsg({ type: "ok", text: "Configurações salvas! Os cálculos serão atualizados." });
    else setCfgMsg({ type: "err", text: "Erro ao salvar." });
  };

  const handleSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaMsg(null);
    if (novaSenha !== confirmarSenha) { setSenhaMsg({ type: "err", text: "As senhas não conferem." }); return; }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
        <p className="text-sm text-slate-400">Ajuste os parâmetros do carro e a senha de acesso ao painel.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações do Carro */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Custo do Carro</h2>
            <p className="text-xs text-slate-400 mt-1">
              Esses valores são usados para calcular o custo de deslocamento em toda a plataforma.
            </p>
          </div>

          <form onSubmit={handleCarro} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Preço da Gasolina (R$/litro)</label>
              <input type="number" step="0.01" min="0" value={cfgForm.precoGasolina}
                onChange={e => setCfgForm({ ...cfgForm, precoGasolina: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              <p className="text-[10px] text-slate-500">Atualize sempre que abastecer.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Rendimento do Carro (km por litro)</label>
              <input type="number" step="0.1" min="1" value={cfgForm.kmPorLitro}
                onChange={e => setCfgForm({ ...cfgForm, kmPorLitro: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              <p className="text-[10px] text-slate-500">Média urbana do seu veículo.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Custo de Desgaste (R$ por km)</label>
              <input type="number" step="0.01" min="0" value={cfgForm.custoPorKm}
                onChange={e => setCfgForm({ ...cfgForm, custoPorKm: e.target.value })} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
              <p className="text-[10px] text-slate-500">
                Inclui manutenção, pneus e depreciação. Padrão sugerido: R$ 0,15/km.
              </p>
            </div>

            {/* Preview cálculo */}
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs space-y-1">
              <p className="text-slate-500 font-semibold uppercase tracking-wider mb-1">Custo por km rodado (ida+volta)</p>
              {(() => {
                const preco = parseFloat(cfgForm.precoGasolina) || 0;
                const kml = parseFloat(cfgForm.kmPorLitro) || 1;
                const desgaste = parseFloat(cfgForm.custoPorKm) || 0;
                const custoComb = preco / kml;
                const total = custoComb + desgaste;
                return (
                  <>
                    <div className="flex justify-between text-slate-300">
                      <span>Combustível</span><span>R$ {custoComb.toFixed(3)}/km</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Desgaste</span><span>R$ {desgaste.toFixed(3)}/km</span>
                    </div>
                    <div className="flex justify-between text-white font-bold border-t border-slate-700 pt-1 mt-1">
                      <span>Total</span><span className="text-red-400">R$ {total.toFixed(3)}/km</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {cfgMsg && (
              <p className={`text-xs p-2.5 rounded-lg border font-semibold ${cfgMsg.type === "ok" ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30" : "text-red-400 bg-red-950/20 border-red-900/30"}`}>
                {cfgMsg.text}
              </p>
            )}

            <button type="submit" disabled={cfgSubmitting}
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50">
              {cfgSubmitting ? "Salvando..." : "Salvar Configurações do Carro"}
            </button>
          </form>
        </div>

        {/* Senha */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4 h-fit">
          <div>
            <h2 className="text-lg font-bold text-white">Segurança</h2>
            <p className="text-xs text-slate-400 mt-1">Altere a senha de acesso ao painel administrativo.</p>
          </div>
          <form onSubmit={handleSenha} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Senha Atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Nova Senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Confirmar Nova Senha</label>
              <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            {senhaMsg && (
              <p className={`text-xs p-2.5 rounded-lg border font-semibold ${senhaMsg.type === "ok" ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30" : "text-red-400 bg-red-950/20 border-red-900/30"}`}>
                {senhaMsg.text}
              </p>
            )}
            <button type="submit" disabled={senhaSubmitting}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50">
              {senhaSubmitting ? "Alterando..." : "Alterar Senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
