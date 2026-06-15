import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: "GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
  }

  try {
    const { base64, mediaType } = await request.json() as { base64: string; mediaType: string };

    const prompt = `Você é um assistente que analisa documentos de custos de veículos brasileiros.
Analise este documento (boleto de IPVA, apólice de seguro, nota fiscal de manutenção, fatura DPVAT, etc.)
e extraia os valores monetários relevantes.

Retorne SOMENTE um objeto JSON válido. Use 0 para os valores não encontrados.

Estrutura JSON obrigatória:
{
  "ipvaAnual": número (valor total anual do IPVA),
  "seguroAnual": número (valor total anual do seguro),
  "dpvatAnual": número (valor total do DPVAT),
  "manutencaoMensal": número (se for nota de revisão/óleo, divida o total por 6 para estimar o valor mensal),
  "descricao": string (máximo 60 caracteres descrevendo o documento lido)
}`;

    // Descobre dinamicamente qual modelo a chave do usuário suporta
    let modelName = "gemini-1.5-flash"; // fallback padrão
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const models = listData.models || [];
        // Pega o primeiro que contenha "flash" e suporte generateContent, ou "pro"
        const flashModel = models.find((m: any) => m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent"));
        const proModel = models.find((m: any) => m.name.includes("pro") && m.supportedGenerationMethods?.includes("generateContent"));
        
        if (flashModel) {
          modelName = flashModel.name.replace("models/", "");
        } else if (proModel) {
          modelName = proModel.name.replace("models/", "");
        }
      }
    } catch (e) {
      console.error("Erro ao listar modelos", e);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: mediaType
        }
      }
    ]);

    const text = result.response.text();
    const data = JSON.parse(text);

    return NextResponse.json({ success: true, ...data });
  } catch (e: any) {
    console.error("Erro extração Gemini", e);
    
    let errorMsg = e.message ?? "Erro ao processar documento.";
    if (errorMsg.includes("404 Not Found") || errorMsg.includes("is not found")) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const listData = await listRes.json();
        const available = listData.models?.map((m: any) => m.name.replace("models/", "")).join(", ") || "Nenhum";
        errorMsg = `Modelo não liberado. A sua chave tem acesso aos modelos: [${available}]. Gere uma nova chave no AI Studio.`;
      } catch (err) {}
    }
    
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
