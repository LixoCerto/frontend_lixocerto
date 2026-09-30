export type Coordenadas = {
  latitude: number;
  longitude: number;
};

function coordenadasValidas(coordenadas: Coordenadas): boolean {
  return Number.isFinite(coordenadas.latitude)
    && Number.isFinite(coordenadas.longitude)
    && coordenadas.latitude >= -90
    && coordenadas.latitude <= 90
    && coordenadas.longitude >= -180
    && coordenadas.longitude <= 180;
}

/** Distância em linha reta entre duas coordenadas, usando a fórmula de Haversine. */
export function distanciaEmKm(origem: Coordenadas, destino: Coordenadas): number | null {
  if (!coordenadasValidas(origem) || !coordenadasValidas(destino)) return null;

  const radianos = (graus: number) => (graus * Math.PI) / 180;
  const diferencaLatitude = radianos(destino.latitude - origem.latitude);
  const diferencaLongitude = radianos(destino.longitude - origem.longitude);
  const latitudeOrigem = radianos(origem.latitude);
  const latitudeDestino = radianos(destino.latitude);
  const a = Math.sin(diferencaLatitude / 2) ** 2
    + Math.cos(latitudeOrigem) * Math.cos(latitudeDestino) * Math.sin(diferencaLongitude / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
