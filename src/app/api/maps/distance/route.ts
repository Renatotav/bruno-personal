import { NextResponse } from "next/server";
import { getAllConfigs } from "@/app/actions/configuracoes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const customOrigin = searchParams.get("originAddress"); // Origem opcional

  if (!placeId) {
    return NextResponse.json({ success: false, error: "Missing placeId" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API Key não configurada no servidor" }, { status: 500 });
  }

  try {
    // 1. Obter detalhes do lugar (bairro, endereço e tipo) usando Places API (New)
    const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
    const detailsRes = await fetch(detailsUrl, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,addressComponents,types,primaryType",
      },
    });
    const detailsData = await detailsRes.json();

    if (!detailsRes.ok) {
      throw new Error(detailsData.error?.message || "Erro ao obter detalhes do local");
    }

    let bairro = "";
    if (detailsData.addressComponents) {
      const sublocality = detailsData.addressComponents.find((c: any) => 
        c.types.includes("sublocality_level_1") || c.types.includes("sublocality")
      );
      if (sublocality) {
        bairro = sublocality.longText;
      } else {
        const neighborhood = detailsData.addressComponents.find((c: any) => 
          c.types.includes("neighborhood")
        );
        if (neighborhood) bairro = neighborhood.longText;
      }
    }

    const destinationAddress = detailsData.formattedAddress;
    const nomeLocal = detailsData.displayName?.text || "";

    // 1.5 Inferir tipo
    const isGym = (detailsData.types || []).includes("gym") || detailsData.primaryType === "gym" || detailsData.primaryType === "fitness_center" || (detailsData.types || []).includes("fitness_center");
    const inferredType = isGym ? "ACADEMIA" : "CONDOMINIO";

    // 2. Determinar endereço de origem
    let originAddress = customOrigin;
    if (!originAddress) {
      const configs = await getAllConfigs();
      originAddress = configs.find((c) => c.key === "endereco")?.value || null;
    }

    if (!originAddress) {
      return NextResponse.json({
        success: true,
        bairro,
        tipo: inferredType,
        distanciaKm: null,
        tempoMinutos: null,
        nome: nomeLocal,
        error: "Endereço de partida não configurado.",
      });
    }

    // 3. Calcular a distância usando Routes API
    const distUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const distRes = await fetch(distUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { placeId: placeId },
        travelMode: "DRIVE",
        languageCode: "pt-BR",
      }),
    });
    
    const distData = await distRes.json();

    if (!distRes.ok) {
      throw new Error(distData.error?.message || "Erro ao calcular rota");
    }

    const route = distData.routes?.[0];
    if (!route) {
      return NextResponse.json({
        success: true,
        bairro,
        tipo: inferredType,
        distanciaKm: null,
        tempoMinutos: null,
        nome: nomeLocal,
        error: "Não foi possível calcular a rota até este local.",
      });
    }

    const distanciaKm = parseFloat((route.distanceMeters / 1000).toFixed(1)); // em metros
    const durationSeconds = parseInt(route.duration.replace("s", ""), 10);
    const tempoMinutos = Math.round(durationSeconds / 60); // em segundos para minutos

    return NextResponse.json({
      success: true,
      bairro,
      tipo: inferredType,
      distanciaKm,
      tempoMinutos,
      nome: nomeLocal,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
