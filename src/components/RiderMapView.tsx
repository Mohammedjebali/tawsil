"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface RiderMapViewProps {
  customerLat: number;
  customerLng: number;
  storeLat?: number | null;
  storeLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
}

async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.code === "Ok" && json.routes?.[0]) {
      const coords = json.routes[0].geometry.coordinates as [number, number][];
      return coords.map(([lng, lat]) => [lat, lng]);
    }
  } catch (_) {}
  return [[fromLat, fromLng], [toLat, toLng]];
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
  const routeLayerRef = useRef<unknown>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then(async (L) => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

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
        iconSize: [18, 18], iconAnchor: [9, 9], className: "",
      });
      L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map).bindPopup("📍 Client");

      // Store pin (green)
      if (storeLat && storeLng) {
        const storeIcon = L.divIcon({
          html: `<div style="background:#16a34a;width:16px;height:16px;border-radius:4px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8], className: "",
        });
        L.marker([storeLat, storeLng], { icon: storeIcon }).addTo(map).bindPopup("🏪 Magasin");
      }

      // Inject ping keyframes
      const styleEl = document.createElement("style");
      styleEl.textContent = `@keyframes ping{0%{transform:scale(1);opacity:0.6}75%,100%{transform:scale(2.2);opacity:0}}`;
      document.head.appendChild(styleEl);

      // Rider pin with pulsing ring
      if (riderLat && riderLng) {
        const riderIcon = L.divIcon({
          html: `<div style="position:relative;width:32px;height:32px;">
  <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(99,102,241,0.3);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
  <div style="width:32px;height:32px;background:#6366f1;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
  </div>
</div>`,
          iconSize: [32, 32], iconAnchor: [16, 16], className: "",
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
          .addTo(map).bindPopup("🛵 Vous");

        // Fetch real road route
        const routeCoords = await fetchRoute(riderLat, riderLng, customerLat, customerLng);
        routeLayerRef.current = L.polyline(routeCoords, {
          color: "#1e40af", weight: 4, opacity: 0.85
        }).addTo(map);

        // Fit map to show both
        map.fitBounds(
          L.latLngBounds([[riderLat, riderLng], [customerLat, customerLng]]),
          { padding: [40, 40] }
        );
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
        riderMarkerRef.current = null;
        routeLayerRef.current = null;
      }
    };
  }, []);

  // Update rider position + re-route
  useEffect(() => {
    if (!mapInstanceRef.current || !riderLat || !riderLng) return;
    import("leaflet").then(async (L) => {
      if (riderMarkerRef.current) {
        (riderMarkerRef.current as { setLatLng: (ll: [number, number]) => void })
          .setLatLng([riderLat, riderLng]);
      }
      // Update route
      if (routeLayerRef.current) {
        const routeCoords = await fetchRoute(riderLat, riderLng, customerLat, customerLng);
        (routeLayerRef.current as { setLatLngs: (lls: [number, number][]) => void })
          .setLatLngs(routeCoords);
      } else {
        const routeCoords = await fetchRoute(riderLat, riderLng, customerLat, customerLng);
        routeLayerRef.current = L.polyline(routeCoords, {
          color: "#1e40af", weight: 4, opacity: 0.85
        }).addTo(mapInstanceRef.current as ReturnType<typeof L.map>);
      }
    });
  }, [riderLat, riderLng]);

  // Invalidate map size when fullscreen changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        (mapInstanceRef.current as { invalidateSize: () => void }).invalidateSize();
      }, 150);
    }
  }, [fullscreen]);

  const mapHeight = fullscreen ? "100vh" : "260px";

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div
        style={{
          position: fullscreen ? "fixed" : "relative",
          top: fullscreen ? 0 : undefined,
          left: fullscreen ? 0 : undefined,
          right: fullscreen ? 0 : undefined,
          bottom: fullscreen ? 0 : undefined,
          zIndex: fullscreen ? 9999 : 1,
          width: "100%",
          height: mapHeight,
          borderRadius: fullscreen ? 0 : "12px",
          overflow: "hidden",
        }}
      >
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen((f) => !f)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            background: "white",
            border: "none",
            borderRadius: "8px",
            padding: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={fullscreen ? "Réduire" : "Agrandir"}
        >
          {fullscreen
            ? <Minimize2 style={{ width: 18, height: 18, color: "#1e40af" }} />
            : <Maximize2 style={{ width: 18, height: 18, color: "#1e40af" }} />
          }
        </button>

        {/* Google Maps deep link */}
        {riderLat && riderLng && (
          <a
            href={`https://www.google.com/maps/dir/${riderLat},${riderLng}/${customerLat},${customerLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "#1e40af",
              color: "white",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            🗺 Google Maps
          </a>
        )}
      </div>
    </>
  );
}
