import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("q");

  if (!input) {
    return NextResponse.json({ success: false, error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API Key não configurada no servidor" }, { status: 500 });
  }

  try {
    const url = "https://places.googleapis.com/v1/places:autocomplete";
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: input,
        languageCode: "pt-BR",
        regionCode: "BR",
        // restringe para retornar lugares em geral (opcional)
      }),
    });
    
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro na Google Places API");
    }

    const predictions = (data.suggestions || []).map((s: any) => {
      const p = s.placePrediction;
      return {
        placeId: p.placeId,
        description: p.text?.text || "",
        mainText: p.structuredFormat?.mainText?.text || p.text?.text,
        secondaryText: p.structuredFormat?.secondaryText?.text || "",
      };
    });

    return NextResponse.json({ success: true, predictions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
