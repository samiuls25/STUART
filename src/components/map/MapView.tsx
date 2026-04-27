import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, ZoomIn, ZoomOut } from "lucide-react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import type { Event } from "../../data/events";
import MapPin from "./MapPin";

type Coordinates = {
  lat: number;
  lng: number;
};

interface MapViewProps {
  events: Event[];
  userLocation: Coordinates | null;
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onEventSelect: (event: Event) => void;
  onEventHover: (id: string | null) => void;
  onUserLocationChange: (
    location: Coordinates,
    source?: "auto" | "manual"
  ) => void;
}

const containerStyle = { width: "100%", height: "100%" };
const NYC_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 12;

export default function MapView({
  events,
  userLocation,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
  onUserLocationChange,
}: MapViewProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(NYC_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const validEvents = useMemo(() => {
    return events.filter(
      (event) =>
        typeof event.latitude === "number" &&
        typeof event.longitude === "number" &&
        !Number.isNaN(event.latitude) &&
        !Number.isNaN(event.longitude)
    );
  }, [events]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        onUserLocationChange(location, "manual");
        setMapCenter(location);
        setMapZoom(15);
        mapRef.current?.panTo(location);
        mapRef.current?.setZoom(15);
      },
      (error) => {
        console.error("Location error:", error);
      }
    );
  };

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const refreshMap = () => {
      google.maps.event.trigger(map, "resize");
    };

    if (validEvents.length === 0) {
      if (userLocation) {
        setMapCenter(userLocation);
        setMapZoom(13);
        map.panTo(userLocation);
        map.setZoom(13);
      } else {
        setMapCenter(NYC_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        map.panTo(NYC_CENTER);
        map.setZoom(DEFAULT_ZOOM);
      }
      window.setTimeout(refreshMap, 50);
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    validEvents.forEach((event) => {
      bounds.extend({
        lat: event.latitude,
        lng: event.longitude,
      });
    });

    if (userLocation) {
      bounds.extend(userLocation);
    }

    const nextCenter = bounds.getCenter();
    if (nextCenter) {
      setMapCenter({
        lat: nextCenter.lat(),
        lng: nextCenter.lng(),
      });
    }

    map.fitBounds(bounds);

    if (validEvents.length === 1 && !userLocation) {
      setMapZoom(13);
      map.setZoom(13);
    }

    window.setTimeout(refreshMap, 50);
  }, [validEvents, userLocation]);

  if (loadError) return <div className="p-4">Google Map failed to load.</div>;
  if (!isLoaded) return <div className="p-4">Loading map…</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full overflow-hidden"
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={(map) => {
          mapRef.current = map;
          window.setTimeout(() => {
            google.maps.event.trigger(map, "resize");
            map.panTo(mapCenter);
            map.setZoom(mapZoom);
          }, 0);
        }}
        onZoomChanged={() => {
          const nextZoom = mapRef.current?.getZoom();
          if (typeof nextZoom === "number") {
            setMapZoom(nextZoom);
          }
        }}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            }}
          />
        )}

        {validEvents.map((event) => (
          <MapPin
            key={event.id}
            event={event}
            isActive={selectedEventId === event.id}
            isHovered={hoveredEventId === event.id}
            onSelect={onEventSelect}
            onHover={onEventHover}
          />
        ))}
      </GoogleMap>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={() =>
            mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)
          }
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>

        <button
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={() =>
            mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)
          }
        >
          <ZoomOut className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <button
        onClick={handleCurrentLocation}
        className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all"
      >
        <Navigation className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
