import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: "GROQ_API_KEY não configurada no servidor." }, { status: 500 });
  }

  try {
    const { base64, mediaType } = await request.json() as { base64: string; mediaType: string };

    if (mediaType === "application/pdf") {
      return NextResponse.json({ success: false, error: "PDFs não são suportados. Envie apenas imagens (JPG, PNG)." }, { status: 400 });
    }

    const prompt = `Você é um assistente que analisa documentos de custos de veículos brasileiros.
Analise este documento (boleto de IPVA, apólice de seguro, nota fiscal de manutenção, fatura DPVAT, etc.)
e extraia os valores monetários relevantes.

Retorne SOMENTE um objeto JSON válido, sem markdown, sem explicações, sem texto extra:
{
  "ipvaAnual": 0,
  "seguroAnual": 0,
  "dpvatAnual": 0,
  "manutencaoMensal": 0,
  "descricao": "o que foi identificado no documento"
}

Regras:
- Valores em reais sem símbolo, apenas número (ex: 1250.50)
- IPVA: valor total anual do imposto
- Seguro: prêmio anual do seguro do veículo
- DPVAT: valor do DPVAT/SPVAT
- Manutenção: se for nota de revisão/troca de óleo/peças, divida o total por 6 para estimar mensal
- Use 0 nos campos não presentes no documento
- descricao: máximo 60 caracteres descrevendo o tipo de documento`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro na API da Groq");
    }

    const text = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inesperada da IA. Não retornou JSON.");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error("Erro extração Groq", e);
    return NextResponse.json({ success: false, error: e.message ?? "Erro ao processar documento." }, { status: 500 });
  }
}
