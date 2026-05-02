import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import type { Event } from "../../data/events";

interface MapPinProps {
  event: Event;
  isActive: boolean;
  isHovered: boolean;
  onSelect: (event: Event) => void;
  onHover: (id: string | null) => void;
}

// Inline SVG paths for the four lucide-react icons we use on map pins. Building
// the marker HTML as a plain string (instead of via react-dom/server's
// renderToStaticMarkup) keeps Leaflet's DivIcon out of React's render path and
// avoids loading react-dom/server in the dev/prod bundle.
const ICON_SVGS: Record<string, string> = {
  Music:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  Sports:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  Arts:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  Default:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
};

const buildPinIcon = (event: Event, isActive: boolean, isHovered: boolean) => {
  const stateClass = isActive
    ? "active"
    : isHovered
      ? "border-primary bg-primary/20 scale-110"
      : "";

  const iconColorClass = isActive
    ? "text-primary-foreground"
    : "text-muted-foreground";

  const svg = ICON_SVGS[event.segment ?? ""] ?? ICON_SVGS.Default;

  const html = `<div class="map-pin ${stateClass}"><span class="${iconColorClass}">${svg}</span></div>`;

  return L.divIcon({
    html,
    className: "stuart-map-pin-wrapper",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const MapPin = ({ event, isActive, isHovered, onSelect, onHover }: MapPinProps) => {
  const position = useMemo<LatLngTuple>(
    () => [event.latitude ?? 40.7128, event.longitude ?? -74.006],
    [event.latitude, event.longitude],
  );

  const icon = useMemo(
    () => buildPinIcon(event, isActive, isHovered),
    [event, isActive, isHovered],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={isActive ? 1000 : isHovered ? 500 : 0}
      eventHandlers={{
        click: () => onSelect(event),
        mouseover: () => onHover(event.id),
        mouseout: () => onHover(null),
      }}
    >
      {(isHovered || isActive) && (
        <Tooltip
          permanent
          interactive={false}
          direction="top"
          offset={[0, -16]}
          opacity={1}
          className="stuart-map-tooltip"
        >
          <div className="min-w-[180px]">
            <p className="font-heading font-semibold text-sm text-foreground truncate max-w-[220px]">
              {event.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{event.venue}</p>
            <p className="text-xs text-primary font-medium mt-1">
              {event.date} • {event.time}
            </p>
          </div>
        </Tooltip>
      )}
    </Marker>
  );
};

export default MapPin;
