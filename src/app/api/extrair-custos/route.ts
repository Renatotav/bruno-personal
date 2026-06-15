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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
    return NextResponse.json({ success: false, error: e.message ?? "Erro ao processar documento." }, { status: 500 });
  }
}
