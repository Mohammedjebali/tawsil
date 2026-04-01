const BASE_FEE = Number(process.env.NEXT_PUBLIC_BASE_FEE) || 2000; // millimes
const PER_KM_FEE = Number(process.env.NEXT_PUBLIC_PER_KM_FEE) || 500; // millimes per km

export function calculateDeliveryFee(distanceKm: number): number {
  return BASE_FEE + Math.ceil(distanceKm) * PER_KM_FEE;
}

export function formatFee(millimes: number): string {
  return `${(millimes / 1000).toFixed(3)} DT`;
}

// Haversine formula — distance between two GPS points in km
export function getDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
