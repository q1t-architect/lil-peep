"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl";
import type { FeatureCollection } from "geojson";
import Link from "next/link";
import type { Listing } from "@/lib/data";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BRAND = "#2596BE";

function toLngLat(listing: Listing) {
  return {
    longitude: -3.7 + (listing.mapX - 0.5) * 0.06,
    latitude: 40.41 + (listing.mapY - 0.45) * 0.05,
  };
}

type Props = {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

export function InteractiveMap({ listings, selectedId, onSelect, className }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  const [popupCoords, setPopupCoords] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);

  // Sync dark/light map style with document theme
  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.classList.contains("dark");
      setMapStyle(
        dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      );
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Build GeoJSON from listings
  const geojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: listings.map((listing) => {
        const { longitude, latitude } = toLngLat(listing);
        return {
          type: "Feature",
          properties: {
            id: listing.id,
            title: listing.title,
            neighborhood: listing.neighborhood,
            distanceKm: listing.distanceKm,
            priceType: listing.priceType,
            priceEuro: listing.priceEuro ?? null,
            status: listing.status,
            description: listing.description,
            ownerName: listing.owner.name,
          },
          geometry: { type: "Point", coordinates: [longitude, latitude] },
        };
      }),
    }),
    [listings],
  );

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  );

  // Keep popup coords synced to selected listing
  useEffect(() => {
    setPopupCoords(selectedListing ? toLngLat(selectedListing) : null);
  }, [selectedListing]);

  const onMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        onSelect(null);
        return;
      }

      if (feature.properties?.cluster) {
        // Zoom into cluster
        const clusterId = feature.properties.cluster_id as number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const source = mapRef.current?.getMap().getSource("listings") as any;
        source?.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
          if (err) return;
          mapRef.current?.flyTo({
            center: (feature.geometry as { coordinates: [number, number] }).coordinates,
            zoom: zoom + 0.5,
            duration: 700,
          });
        });
      } else {
        const id = feature.properties?.id as string;
        onSelect(selectedId === id ? null : id);
      }
    },
    [selectedId, onSelect],
  );

  // Paint expressions react to selectedId directly — no extra state needed
  const pinColor = [
    "case",
    ["==", ["get", "id"], selectedId ?? "__none__"],
    "#ffffff",
    BRAND,
  ] as const;

  const pinBackground = [
    "case",
    ["==", ["get", "id"], selectedId ?? "__none__"],
    BRAND,
    "#ffffff",
  ] as const;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] ring-1 ring-brand/20 dark:ring-brand/30",
        className,
      )}
    >
      {/* Strip default mapboxgl popup chrome */}
      <style>{`
        .kinetic-popup .mapboxgl-popup-content {
          padding: 0;
          background: transparent;
          box-shadow: none;
          border-radius: 1rem;
          overflow: visible;
        }
        .kinetic-popup .mapboxgl-popup-tip { display: none; }
        .kinetic-popup .mapboxgl-popup-close-button { display: none; }
      `}</style>

      <Map
        ref={mapRef}
        initialViewState={{ latitude: 40.4168, longitude: -3.7038, zoom: 13 }}
        mapStyle={mapStyle}
        mapboxAccessToken={TOKEN}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["clusters", "unclustered-point"]}
        onClick={onMapClick}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source
          id="listings"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {/* Cluster circles */}
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": BRAND,
              "circle-radius": [
                "step",
                ["get", "point_count"],
                22,
                5,
                28,
                15,
                34,
              ],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.95,
            }}
          />
          {/* Cluster count labels */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": "{point_count_abbreviated}",
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 13,
            }}
            paint={{ "text-color": "#ffffff" }}
          />
          {/* Individual pin — outer ring */}
          <Layer
            id="unclustered-point"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": pinBackground,
              "circle-radius": 16,
              "circle-stroke-width": 3,
              "circle-stroke-color": BRAND,
            }}
          />
          {/* Individual pin — inner dot */}
          <Layer
            id="unclustered-point-dot"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": pinColor,
              "circle-radius": 6,
            }}
          />
        </Source>

        {selectedListing && popupCoords && (
          <Popup
            longitude={popupCoords.longitude}
            latitude={popupCoords.latitude}
            anchor="bottom"
            offset={24}
            closeOnClick={false}
            onClose={() => onSelect(null)}
            className="kinetic-popup"
            maxWidth="260px"
          >
            <div className="glass glass-border rounded-2xl p-3 text-left shadow-glass-lg w-[240px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                {selectedListing.distanceKm.toFixed(1)} km · {selectedListing.neighborhood}
              </p>
              <p className="mt-1 line-clamp-2 font-display text-sm font-semibold text-ink">
                {selectedListing.title}
              </p>
              <p className="mt-1 text-xs text-ink-muted line-clamp-2">
                {selectedListing.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">
                  {selectedListing.owner.name}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    selectedListing.priceType === "free"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-brand/15 text-brand-dim dark:text-brand-glow",
                  )}
                >
                  {selectedListing.priceType === "free"
                    ? "Free"
                    : `€${selectedListing.priceEuro?.toFixed(2)}`}
                </span>
              </div>
              <Link
                href={`/listing/${selectedListing.id}`}
                className="mt-3 flex w-full items-center justify-center rounded-xl bg-brand py-2 text-xs font-semibold text-white shadow-brand-soft-sm"
                onClick={(e) => e.stopPropagation()}
              >
                Open listing
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
