"use client";

import { useState, useEffect, useRef } from "react";
import {
  alterarSenha,
  salvarConfigCarro,
  salvarEndereco,
  salvarCustosFixos,
  salvarMetaFaturamento,
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
  
  // ── Metas ──────────────────────────────────────────────────
  const [metaForm, setMetaForm] = useState(String(CONFIG_FIXOS_PADRAO.metaFaturamento));
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaMsg, setMetaMsg] = useState<Msg>(null);
  
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressSearch = (val: string) => {
    setEndereco(val);
    if (!val.trim()) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingAddress(true);
        const res = await fetch(`/api/maps/autocomplete?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.success) {
          setPredictions(data.predictions);
          setShowPredictions(true);
        }
      } catch (e) {
        console.error("Erro", e);
      } finally {
        setSearchingAddress(false);
      }
    }, 500);
  };

  const handleSelectPrediction = (description: string) => {
    setEndereco(description);
    setShowPredictions(false);
    setPredictions([]);
  };

  // ── Custos variáveis ─────────────────────────────────────────
  const [cfgForm, setCfgForm] = useState({
    precoGasolina: String(CONFIG_PADRAO.precoGasolina),
    kmPorLitro: String(CONFIG_PADRAO.kmPorLitro),
    custoPorKm: String(CONFIG_PADRAO.custoPorKm),
  });
  const [cfgSubmitting, setCfgSubmitting] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<Msg>(null);

  // ── Extração por IA ──────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<Msg>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Custos fixos ─────────────────────────────────────────────
  const [fixosForm, setFixosForm] = useState({
    ipvaAnual: String(CONFIG_FIXOS_PADRAO.ipvaAnual),
    seguroAnual: String(CONFIG_FIXOS_PADRAO.seguroAnual),
    dpvatAnual: String(CONFIG_FIXOS_PADRAO.dpvatAnual),
    manutencaoAnual: String(CONFIG_FIXOS_PADRAO.manutencaoAnual),
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
        manutencaoAnual: String(pf.manutencaoAnual),
        kmPorMes: String(pf.kmPorMes),
      });
      setMetaForm(String(pf.metaFaturamento));
    });
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleEndereco = async (e: React.FormEvent) => {
    e.preventDefault();
    setEndSubmitting(true);
    setEndMsg(null);
    setShowPredictions(false);
    const r = await salvarEndereco({ endereco });
    setEndSubmitting(false);
    setEndMsg(r.success ? { type: "ok", text: "Endereço salvo!" } : { type: "err", text: "Erro ao salvar." });
  };

  const handleMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetaSubmitting(true);
    setMetaMsg(null);
    const r = await salvarMetaFaturamento({ meta: parseFloat(metaForm) || 0 });
    setMetaSubmitting(false);
    setMetaMsg(r.success ? { type: "ok", text: "Meta salva com sucesso!" } : { type: "err", text: "Erro ao salvar meta." });
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
      manutencaoAnual: parseFloat(fixosForm.manutencaoAnual) || 0,
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

  // ── Extração por IA ──────────────────────────────────────────
  const handleExtract = async (file: File) => {
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setExtractMsg({ type: "err", text: `Arquivo muito grande. Máximo ${MAX_MB} MB.` });
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setExtractMsg({ type: "err", text: "Formato não suportado. Use JPG, PNG, WebP ou PDF." });
      return;
    }

    setExtracting(true);
    setExtractMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const res = await fetch("/api/extrair-custos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mediaType: file.type }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setFixosForm((prev) => ({
          ...prev,
          ...(data.ipvaAnual        > 0 ? { ipvaAnual:        String(data.ipvaAnual) }        : {}),
          ...(data.seguroAnual      > 0 ? { seguroAnual:      String(data.seguroAnual) }      : {}),
          ...(data.dpvatAnual       > 0 ? { dpvatAnual:       String(data.dpvatAnual) }       : {}),
          ...(data.manutencaoAnual > 0 ? { manutencaoAnual: String(data.manutencaoAnual) } : {}),
        }));
        setExtractMsg({ type: "ok", text: data.descricao ? `Preenchido: ${data.descricao}` : "Dados extraídos com sucesso!" });
      } catch (e: any) {
        setExtractMsg({ type: "err", text: e.message ?? "Erro ao extrair dados." });
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
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
    manutencaoAnual: parseFloat(fixosForm.manutencaoAnual) || 0,
    kmPorMes: parseFloat(fixosForm.kmPorMes) || 1000,
    metaFaturamento: parseFloat(metaForm) || 0,
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Endereço de Partida
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Seu endereço ou bairro — ponto de partida para todos os deslocamentos.
          </p>
        </div>
        <form onSubmit={handleEndereco} className="flex flex-col gap-3">
          <div className="relative z-20 flex-1">
            <input
              type="text"
              value={endereco}
              onChange={(e) => handleAddressSearch(e.target.value)}
              placeholder="Pesquisar no Google Maps..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-teal-500 text-sm placeholder-slate-600"
            />
            {searchingAddress && (
              <div className="absolute right-3 top-2.5">
                <svg className="w-4 h-4 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </div>
            )}
            {showPredictions && predictions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden z-30">
                {predictions.map((p) => (
                  <button
                    key={p.placeId}
                    type="button"
                    onClick={() => handleSelectPrediction(p.description)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 focus:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
                  >
                    <div className="font-medium text-white">{p.mainText}</div>
                    <div className="text-xs text-slate-400 truncate">{p.secondaryText}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
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

      {/* ── Faturamento e Metas ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Faturamento e Metas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Defina sua meta mensal de faturamento para acompanhar o progresso no Dashboard.
          </p>
        </div>
        <form onSubmit={handleMeta} className="flex flex-col gap-3">
          <div className="relative z-10 flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={metaForm}
              onChange={(e) => setMetaForm(e.target.value)}
              placeholder="Ex: 10000.00"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-3 text-white outline-none focus:border-emerald-500 text-sm placeholder-slate-600"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {metaMsg && (
              <p
                className={`text-xs font-semibold ${
                  metaMsg.type === "ok" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {metaMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={metaSubmitting}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 px-5 text-sm font-semibold text-white transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {metaSubmitting ? "Salvando..." : "Salvar Meta"}
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

        {/* ── Dropzone IA ──────────────────────────────────── */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleExtract(file);
          }}
          onClick={() => !extracting && fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all select-none ${
            isDragging
              ? "border-purple-500 bg-purple-950/20"
              : extracting
              ? "border-slate-700 bg-slate-900/20 cursor-wait"
              : "border-slate-700 hover:border-purple-600 hover:bg-purple-950/10"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { handleExtract(file); e.target.value = ""; }
            }}
          />

          {extracting ? (
            <>
              <svg className="h-8 w-8 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-purple-300">Analisando documento com IA...</p>
              <p className="text-xs text-slate-500">Aguarde alguns segundos</p>
            </>
          ) : (
            <>
              <svg className={`h-8 w-8 transition-colors ${isDragging ? "text-purple-400" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className={`text-sm font-medium transition-colors ${isDragging ? "text-purple-300" : "text-slate-300"}`}>
                  {isDragging ? "Solte o arquivo aqui" : "Arraste um documento ou clique para selecionar"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Boleto IPVA, apólice de seguro, nota de manutenção · JPG, PNG e PDF · máx. 5 MB
                </p>
              </div>
              <span className="rounded-md border border-purple-700/60 bg-purple-900/20 px-3 py-1 text-xs font-medium text-purple-400">
                Gemini 1.5 Flash (Google)
              </span>
            </>
          )}
        </div>

        {extractMsg && (
          <p className={`text-xs p-2.5 rounded-lg border font-semibold ${
            extractMsg.type === "ok"
              ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30"
              : "text-red-400 bg-red-950/20 border-red-900/30"
          }`}>
            {extractMsg.text}
          </p>
        )}

        <form onSubmit={handleFixos} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <label className="text-xs font-semibold text-slate-400">Manutenção (R$/ano)</label>
              <input
                type="number" step="0.01" min="0" value={fixosForm.manutencaoAnual}
                onChange={(e) => setFixosForm({ ...fixosForm, manutencaoAnual: e.target.value })}
                placeholder="0,00" className={inputClass}
              />
              <p className="text-[10px] text-slate-500">Revisões, suspensão, óleo, etc.</p>
            </div>
          </div>
          
          <div className="space-y-1 w-full lg:w-1/4">
            <label className="text-xs font-semibold text-slate-400">Km Rodados por Mês (estimativa)</label>
            <input
              type="number" step="1" min="1" value={fixosForm.kmPorMes}
              onChange={(e) => setFixosForm({ ...fixosForm, kmPorMes: e.target.value })}
              placeholder="1000" className={inputClass}
            />
            <p className="text-[10px] text-slate-500">Usado para calcular o custo fixo por km.</p>
          </div>

          {/* Preview custos fixos */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs space-y-1.5">
            <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Resumo mensal dos custos fixos
            </p>
            <div className="flex justify-between text-slate-300">
              <span>IPVA + Seguro + DPVAT + Manutenção ÷ 12</span>
              <span>
                R${" "}
                {(
                  ((parseFloat(fixosForm.ipvaAnual) || 0) +
                    (parseFloat(fixosForm.seguroAnual) || 0) +
                    (parseFloat(fixosForm.dpvatAnual) || 0) +
                    (parseFloat(fixosForm.manutencaoAnual) || 0)) /
                  12
                ).toFixed(2)}
                /mês
              </span>
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
