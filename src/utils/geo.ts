/* 地理计算：Haversine 直线距离（Demo 估算口径，非真实导航路径） */

interface Point {
  lng: number
  lat: number
}

/** 两点球面直线距离（km） */
export function distKm(a: Point, b: Point): number {
  const R = 6371
  const toRad = (x: number): number => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
