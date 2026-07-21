/** Utilidades de geolocalização (tudo opt-in; nada roda sem o usuário pedir). */

export interface Coord {
  lat: number
  lng: number
}

export function temGeolocalizacao(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

/** Pede a posição atual do usuário (dispara o prompt de permissão do navegador). */
export function obterPosicao(): Promise<Coord> {
  return new Promise((resolve, reject) => {
    if (!temGeolocalizacao()) {
      reject(new Error('sem-geolocalizacao'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaKm(a: Coord, b: Coord): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function distanciaLegivel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}
