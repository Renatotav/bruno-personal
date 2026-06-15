import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  try {
    const { base64, mediaType } = await request.json() as { base64: string; mediaType: string };

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

    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

    const content: ContentBlock[] = [{ type: "text", text: prompt }];

    if (mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      const validImage = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
        ? (mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
        : "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: validImage, data: base64 },
      });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inesperada da IA.");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message ?? "Erro ao processar documento." }, { status: 500 });
  }
}
