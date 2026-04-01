"use client";
import { useEffect, useRef } from "react";

interface RiderMapViewProps {
  customerLat: number;
  customerLng: number;
  storeLat?: number | null;
  storeLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
}

export default function RiderMapView({
  customerLat,
  customerLng,
  storeLat,
  storeLng,
  riderLat,
  riderLng,
}: RiderMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const riderMarkerRef = useRef<unknown>(null);
  const polylineRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Center on rider if available, else customer
      const center: [number, number] = riderLat && riderLng
        ? [riderLat, riderLng]
        : [customerLat, customerLng];

      const map = L.map(mapRef.current!).setView(center, 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Customer pin (blue)
      const customerIcon = L.divIcon({
        html: `<div style="background:#1e40af;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: "",
      });
      L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup("📍 Client");

      // Store pin (green) if available
      if (storeLat && storeLng) {
        const storeIcon = L.divIcon({
          html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:4px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: "",
        });
        L.marker([storeLat, storeLng], { icon: storeIcon })
          .addTo(map)
          .bindPopup("🏪 Magasin");
      }

      // Rider pin (red moto)
      if (riderLat && riderLng) {
        const riderIcon = L.divIcon({
          html: `<div style="background:#dc2626;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:12px;display:flex;align-items:center;justify-content:center">🛵</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: "",
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
          .addTo(map)
          .bindPopup("🛵 Vous");

        // Draw line from rider to customer
        polylineRef.current = L.polyline(
          [[riderLat, riderLng], [customerLat, customerLng]],
          { color: "#1e40af", weight: 3, dashArray: "6,8", opacity: 0.7 }
        ).addTo(map);

        // Fit map to show both rider and customer
        map.fitBounds(L.latLngBounds(
          [[riderLat, riderLng], [customerLat, customerLng]]
        ), { padding: [40, 40] });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
        riderMarkerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, []);

  // Update rider position live
  useEffect(() => {
    if (!mapInstanceRef.current || !riderLat || !riderLng) return;
    import("leaflet").then((L) => {
      if (riderMarkerRef.current) {
        (riderMarkerRef.current as { setLatLng: (ll: [number, number]) => void })
          .setLatLng([riderLat, riderLng]);
      }
      if (polylineRef.current) {
        (polylineRef.current as { setLatLngs: (lls: [number, number][]) => void })
          .setLatLngs([[riderLat, riderLng], [customerLat, customerLng]]);
      }
    });
  }, [riderLat, riderLng]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} style={{ height: "240px", width: "100%", borderRadius: "12px", overflow: "hidden" }} />
    </>
  );
}
