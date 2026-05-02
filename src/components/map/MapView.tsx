import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Navigation, ZoomIn, ZoomOut } from "lucide-react";
import { MapContainer, TileLayer, useMap, useMapEvents, Circle, CircleMarker } from "react-leaflet";
import L, { type Map as LeafletMap, type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Event } from "../../data/events";
import MapPin from "./MapPin";

// Build the icon Leaflet renders for an aggregated cluster of markers. Sized
// and colored to match the theme of our individual MapPin pins so the map
// reads as one coherent UI rather than mixing default Leaflet visuals.
const createClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const size = count >= 100 ? 56 : count >= 25 ? 48 : 40;

  return L.divIcon({
    html: `<div class="stuart-cluster-bubble" style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
    className: "stuart-cluster-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface MapViewProps {
  events: Event[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onEventSelect: (event: Event) => void;
  onEventHover: (id: string | null) => void;
  onBackgroundClick?: () => void;
  /** Browser geolocation / fallback coords — drives optional "you are here" marker. */
  userLocation?: { lat: number; lon: number } | null;
  /** When true and userLocation is set, render a dot at the user's position (skip during NYC fallback). */
  showUserLocationPin?: boolean;
  /** When set with userLocation, draws a faint radius circle for the active distance filter. Ignored when null ("Any distance"). */
  distanceLimitMiles?: number | null;
}

const NYC_CENTER: LatLngTuple = [40.7128, -74.006];
const DEFAULT_ZOOM = 12;

// Lets the parent component capture the underlying Leaflet map instance so the
// custom zoom / re-center buttons can drive it imperatively. Also keeps the
// map's internal canvas in sync with the container size - DevTools docking,
// window resizes, or sidebar toggles otherwise leave the canvas at its old
// dimensions and the panel renders blank.
const MapInstanceCapture = ({
  onReady,
}: {
  onReady: (map: LeafletMap) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    onReady(map);

    const safeInvalidate = () => {
      try {
        map.invalidateSize();
      } catch {
        /* defensive: invalidateSize can race during HMR; ignore. */
      }
    };

    requestAnimationFrame(safeInvalidate);

    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => safeInvalidate());
      observer.observe(container);
    }

    window.addEventListener("resize", safeInvalidate);
    window.addEventListener("orientationchange", safeInvalidate);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", safeInvalidate);
      window.removeEventListener("orientationchange", safeInvalidate);
    };
  }, [map, onReady]);

  return null;
};

// Forwards background-click events on the map (i.e. clicks that don't hit a
// marker) to the parent so it can clear any selected event state.
const MapBackgroundClickHandler = ({
  onBackgroundClick,
}: {
  onBackgroundClick: () => void;
}) => {
  useMapEvents({
    click: () => onBackgroundClick(),
  });
  return null;
};

// Clear React hover state when the user pans or zooms so a pin that was only
// "virtually" hovered during cluster spiderfy doesn't keep the sidebar + pin
// chrome stuck in a hover/selected mismatch.
const MapLeafletHoverClear = ({ onClear }: { onClear: () => void }) => {
  useMapEvents({
    zoomstart: onClear,
    dragstart: onClear,
  });
  return null;
};

const isFiniteLatLng = (target: LatLngTuple): boolean =>
  Number.isFinite(target[0]) && Number.isFinite(target[1]);

const safeSetView = (map: LeafletMap, target: LatLngTuple, zoom: number) => {
  if (!isFiniteLatLng(target)) return;
  try {
    map.invalidateSize();
    const { x, y } = map.getSize();
    if (x === 0 || y === 0) {
      // Container hasn't been measured yet; setView with no animation is safe.
      map.setView(target, zoom);
      return;
    }
    map.setView(target, zoom, { animate: true, duration: 0.6 });
  } catch (err) {
    console.warn("Map setView failed; ignoring:", err);
  }
};

export default function MapView({
  events,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
  onBackgroundClick,
  userLocation = null,
  showUserLocationPin = false,
  distanceLimitMiles = null,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  /** MarkerClusterGroup instance from leaflet.markercluster (runtime plugin; not on core Leaflet typings). */
  const clusterRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;
    const clearHoverFromCluster = () => onEventHover(null);
    group.on("spiderfied", clearHoverFromCluster);
    group.on("unspiderfied", clearHoverFromCluster);
    return () => {
      group.off("spiderfied", clearHoverFromCluster);
      group.off("unspiderfied", clearHoverFromCluster);
    };
  }, [events, onEventHover]);

  const center = useMemo<LatLngTuple>(() => {
    const first = events.find(
      (event) =>
        typeof event.latitude === "number"
        && Number.isFinite(event.latitude)
        && typeof event.longitude === "number"
        && Number.isFinite(event.longitude),
    );
    if (first && first.latitude != null && first.longitude != null) {
      return [first.latitude, first.longitude];
    }
    return NYC_CENTER;
  }, [events]);

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setZoom(map.getZoom() + 1);
    } catch (err) {
      console.warn("Map zoomIn failed:", err);
    }
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setZoom(map.getZoom() - 1);
    } catch (err) {
      console.warn("Map zoomOut failed:", err);
    }
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      safeSetView(map, center, DEFAULT_ZOOM);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        safeSetView(map, [pos.coords.latitude, pos.coords.longitude], 13);
      },
      () => {
        safeSetView(map, center, DEFAULT_ZOOM);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      // `isolate` (= isolation: isolate) traps both the Leaflet container's
      // internal panes (tiles z-200, popups z-700) AND our custom z-[1000]
      // map controls inside this stacking context, so app-level modals (z-50)
      // are guaranteed to render above the entire map region.
      className="relative w-full h-full overflow-hidden isolate"
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        attributionControl
        className="w-full h-full"
        style={{ background: "transparent" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapInstanceCapture
          onReady={(map) => {
            mapRef.current = map;
          }}
        />

        <MapLeafletHoverClear onClear={() => onEventHover(null)} />

        {onBackgroundClick && (
          <MapBackgroundClickHandler onBackgroundClick={onBackgroundClick} />
        )}

        {showUserLocationPin && userLocation && distanceLimitMiles != null && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={distanceLimitMiles * 1609.344}
            pathOptions={{
              color: "hsl(var(--primary))",
              fillColor: "hsl(var(--primary))",
              fillOpacity: 0.07,
              weight: 1,
              opacity: 0.45,
            }}
          />
        )}

        {/* Cluster densely-packed markers into a single bubble that splits
            into individual pins on zoom-in. With 300+ events concentrated in
            Manhattan, this dramatically reduces visual clutter and DOM/marker
            overhead. The cluster group is fully reactive: applying filters
            removes children and the clusters re-render automatically. */}
        <MarkerClusterGroup
          ref={clusterRef}
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={60}
          iconCreateFunction={createClusterIcon}
        >
          {events.map((event) => (
            <MapPin
              key={event.id}
              event={event}
              isActive={selectedEventId === event.id}
              isHovered={hoveredEventId === event.id}
              onSelect={onEventSelect}
              onHover={onEventHover}
            />
          ))}
        </MarkerClusterGroup>

        {showUserLocationPin && userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              fillColor: "hsl(var(--primary))",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}
      </MapContainer>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <button
          aria-label="Zoom in"
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={handleZoomIn}
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>
        <button
          aria-label="Zoom out"
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={handleZoomOut}
        >
          <ZoomOut className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Recenter button */}
      <button
        aria-label="Recenter on my location"
        className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all z-[1000]"
        onClick={handleRecenter}
      >
        <Navigation className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
