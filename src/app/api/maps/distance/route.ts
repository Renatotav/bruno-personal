import { NextResponse } from "next/server";
import { getAllConfigs } from "@/app/actions/configuracoes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ success: false, error: "Missing placeId" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API Key não configurada no servidor" }, { status: 500 });
  }

  try {
    // 1. Obter detalhes do lugar (bairro e endereço exato)
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component,geometry,name,formatted_address&language=pt-BR&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (detailsData.status !== "OK") {
      throw new Error(detailsData.error_message || detailsData.status);
    }

    const result = detailsData.result;
    let bairro = "";
    if (result.address_components) {
      const sublocality = result.address_components.find((c: any) => c.types.includes("sublocality_level_1") || c.types.includes("sublocality"));
      if (sublocality) {
        bairro = sublocality.long_name;
      } else {
        const neighborhood = result.address_components.find((c: any) => c.types.includes("neighborhood"));
        if (neighborhood) bairro = neighborhood.long_name;
      }
    }

    const destinationAddress = result.formatted_address;

    // 2. Buscar endereço base nas configurações
    const configs = await getAllConfigs();
    const originAddress = configs.find((c) => c.key === "endereco")?.value;

    if (!originAddress) {
      return NextResponse.json({
        success: true,
        bairro,
        distanciaKm: null,
        tempoMinutos: null,
        nome: result.name,
        error: "Endereço base não configurado. Adicione-o em Configurações.",
      });
    }

    // 3. Calcular a distância
    const distUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      originAddress
    )}&destinations=${encodeURIComponent(destinationAddress)}&language=pt-BR&key=${apiKey}`;
    
    const distRes = await fetch(distUrl);
    const distData = await distRes.json();

    if (distData.status !== "OK") {
      throw new Error(distData.error_message || distData.status);
    }

    const element = distData.rows[0]?.elements[0];
    if (!element || element.status !== "OK") {
      return NextResponse.json({
        success: true,
        bairro,
        distanciaKm: null,
        tempoMinutos: null,
        nome: result.name,
        error: "Não foi possível calcular a rota até este local.",
      });
    }

    const distanciaKm = parseFloat((element.distance.value / 1000).toFixed(1)); // em metros
    const tempoMinutos = Math.round(element.duration.value / 60); // em segundos

    return NextResponse.json({
      success: true,
      bairro,
      distanciaKm,
      tempoMinutos,
      nome: result.name,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
