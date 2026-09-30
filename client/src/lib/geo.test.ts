import { describe, expect, it } from "vitest";
import { distanciaEmKm } from "./geo";

describe("distanciaEmKm", () => {
  it("calcula a distância aproximada em linha reta", () => {
    expect(distanciaEmKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    )).toBeCloseTo(111.2, 0);
  });

  it("retorna zero para coordenadas iguais", () => {
    expect(distanciaEmKm(
      { latitude: -23.55, longitude: -46.63 },
      { latitude: -23.55, longitude: -46.63 },
    )).toBe(0);
  });

  it("aceita coordenadas zero e limites geográficos", () => {
    expect(distanciaEmKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    )).toBe(0);
    expect(distanciaEmKm(
      { latitude: 90, longitude: 180 },
      { latitude: 90, longitude: 180 },
    )).toBe(0);
  });

  it("retorna null para coordenadas ausentes, fora do intervalo ou não finitas", () => {
    expect(distanciaEmKm(
      { latitude: 91, longitude: 0 },
      { latitude: 0, longitude: 0 },
    )).toBeNull();
    expect(distanciaEmKm(
      { latitude: 0, longitude: Number.NaN },
      { latitude: 0, longitude: 0 },
    )).toBeNull();
  });
});
