"use client";
import { useEffect, useRef } from "react";

interface MapViewProps {
  customerLat: number;
  customerLng: number;
  riderLat: number | null;
  riderLng: number | null;
}

export default function MapView({ customerLat, customerLng, riderLat, riderLng }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const riderMarkerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([customerLat, customerLng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const customerIcon = L.divIcon({
        html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: "",
      });
      L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup("📍 موقعك");

      if (riderLat && riderLng) {
        const riderIcon = L.divIcon({
          html: `<div style="background:#ef4444;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px">🛵</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: "",
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
          .addTo(map)
          .bindPopup("🛵 السائق");
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !riderLat || !riderLng) return;
    import("leaflet").then((L) => {
      if (riderMarkerRef.current) {
        (riderMarkerRef.current as { setLatLng: (latlng: [number, number]) => void }).setLatLng([riderLat, riderLng]);
      } else {
        const riderIcon = L.divIcon({
          html: `<div style="background:#ef4444;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px">🛵</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: "",
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
          .addTo(mapInstanceRef.current as ReturnType<typeof L.map>)
          .bindPopup("🛵 السائق");
      }
    });
  }, [riderLat, riderLng]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} style={{ height: "260px", width: "100%", borderRadius: "12px" }} />
    </>
  );
}
