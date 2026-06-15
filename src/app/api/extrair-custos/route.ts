import { NextResponse } from "next/server";

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: base64 } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro na API do Gemini");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Como pedimos responseMimeType: "application/json", o texto já deve ser um JSON válido.
    const result = JSON.parse(text);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error("Erro extração Gemini", e);
    return NextResponse.json({ success: false, error: e.message ?? "Erro ao processar documento." }, { status: 500 });
  }
}
