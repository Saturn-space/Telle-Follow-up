'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HealthcareFacilityItem } from '@/lib/types/provider';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProviderMapInnerProps {
  facilities: HealthcareFacilityItem[];
  selectedFacilityId?: string;
  onSelectFacility: (facility: HealthcareFacilityItem) => void;
  center?: { lat: number; lng: number };
  onSwitchToList?: () => void;
}

export default function ProviderMapInner({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  center,
  onSwitchToList,
}: ProviderMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      // Default center: India center (or Bengaluru default)
      const initialLat = center?.lat ?? 12.9716;
      const initialLng = center?.lng ?? 77.5946;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 12,
          scrollWheelZoom: true,
        });

        // Standard OSM Tile Layer with mandatory attribution & error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });

        tileLayer.on('tileerror', () => {
          // Log tile warning without crashing map canvas
          console.warn('[Map Engine] Notice: Some map tiles could not be fetched from OSM mirror.');
        });

        tileLayer.addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};

      const validFacilities = facilities.filter(
        (f) =>
          f.latitude !== undefined &&
          f.longitude !== undefined &&
          Number.isFinite(f.latitude) &&
          Number.isFinite(f.longitude) &&
          f.latitude >= -90 &&
          f.latitude <= 90 &&
          f.longitude >= -180 &&
          f.longitude <= 180
      );

      if (validFacilities.length === 0) {
        if (center) {
          map.setView([center.lat, center.lng], 12);
        }
        return;
      }

      const bounds = L.latLngBounds([]);

      // Coordinate jitter tracking to avoid exact overlap
      const coordOffsets = new Map<string, number>();

      validFacilities.forEach((fac) => {
        const isSelected = fac.id === selectedFacilityId;
        const isVerified = fac.verificationStatus === 'VERIFIED';
        const isDemo = fac.verificationStatus === 'SEEDED_DEMO';
        const isEmergency = fac.emergencyCapable;

        // Color coding for markers
        let markerColor = '#64748b'; // slate for unverified
        let badgeLabel = 'Unverified';

        if (isEmergency) {
          markerColor = '#e11d48'; // rose/red for 24/7 ER
          badgeLabel = '24/7 ER';
        } else if (isVerified) {
          markerColor = '#059669'; // emerald
          badgeLabel = 'Verified';
        } else if (isDemo) {
          markerColor = '#d97706'; // amber
          badgeLabel = 'Demo Seed';
        }

        const iconHtml = `
          <div style="
            background-color: ${markerColor};
            color: white;
            width: ${isSelected ? '38px' : '30px'};
            height: ${isSelected ? '38px' : '30px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
            font-weight: bold;
            font-size: ${isSelected ? '14px' : '11px'};
            transform: translate(-50%, -50%);
            transition: all 0.2s ease-in-out;
          ">
            ${isEmergency ? '✚' : isVerified ? '✓' : isDemo ? '★' : '•'}
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-facility-marker',
          html: iconHtml,
          iconSize: [isSelected ? 38 : 30, isSelected ? 38 : 30],
          iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15],
        });

        // Compute minor coordinate offset if multiple facilities share identical rounded coordinates
        const coordKey = `${fac.latitude!.toFixed(4)},${fac.longitude!.toFixed(4)}`;
        const count = coordOffsets.get(coordKey) || 0;
        coordOffsets.set(coordKey, count + 1);

        const latOffset = count > 0 ? (count % 2 === 0 ? 0.0003 * count : -0.0003 * count) : 0;
        const lngOffset = count > 0 ? (count % 2 === 0 ? -0.0003 * count : 0.0003 * count) : 0;

        const latLng: [number, number] = [fac.latitude! + latOffset, fac.longitude! + lngOffset];
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

        // Popup Content
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; font-size: 13px; max-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${markerColor}20; color: ${markerColor};">
                ${badgeLabel}
              </span>
              ${fac.distanceKm !== undefined ? `<span style="font-size: 11px; color: #64748b; font-weight: 600;">${fac.distanceKm} km</span>` : ''}
            </div>
            <strong style="font-size: 14px; color: #0f172a; display: block; margin-bottom: 4px;">${fac.name}</strong>
            <div style="color: #475569; font-size: 11px; margin-bottom: 6px;">${fac.addressLine1}, ${fac.city}</div>
            <div style="font-size: 11px; color: #0f766e; font-weight: 600; margin-bottom: 8px;">
              Services: ${fac.services.map((s) => s.serviceCategory.replace('_', ' ')).slice(0, 2).join(', ')}${fac.services.length > 2 ? ` +${fac.services.length - 2} more` : ''}
            </div>
            <button id="btn-popup-${fac.id}" style="
              width: 100%;
              background-color: #0f766e;
              color: white;
              border: none;
              padding: 6px 10px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
              font-weight: 600;
            ">
              View Details & Coordinate
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-${fac.id}`);
          if (btn) {
            btn.onclick = () => onSelectFacility(fac);
          }
        });

        marker.on('click', () => {
          onSelectFacility(fac);
        });

        markersRef.current[fac.id] = marker;
        bounds.extend(latLng);
      });

      if (validFacilities.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } catch (err) {
      console.error('[Map Engine Failure]', err);
      const errMsg = err instanceof Error ? err.message : 'Map canvas initialization failure.';
      setTimeout(() => {
        setMapError(errMsg);
      }, 0);
    }
  }, [facilities, selectedFacilityId, center, onSelectFacility]);

  // Center on selected facility if changed
  useEffect(() => {
    if (selectedFacilityId && mapInstanceRef.current && markersRef.current[selectedFacilityId]) {
      const marker = markersRef.current[selectedFacilityId];
      const latLng = marker.getLatLng();
      mapInstanceRef.current.setView(latLng, 14, { animate: true });
      marker.openPopup();
    }
  }, [selectedFacilityId]);

  if (mapError) {
    return (
      <div className="relative w-full h-full min-h-[380px] rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center p-6 text-center text-amber-900 shadow-inner">
        <AlertCircle className="w-10 h-10 text-amber-600 mb-2" />
        <h4 className="font-bold text-sm">Interactive Map Engine Notice</h4>
        <p className="text-xs text-amber-700 max-w-sm mt-1">
          {mapError}. Spatial facilities remain accessible via the synchronized directory list.
        </p>
        {onSwitchToList && (
          <button
            type="button"
            onClick={onSwitchToList}
            className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition-colors"
          >
            Switch to List-Only View
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[380px]" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-md text-[11px] text-slate-700 space-y-1">
        <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1">
          Map Legend
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-flex items-center justify-center text-white text-[9px] font-bold">✓</span>
          <span>Verified Healthcare Facility</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-600 inline-flex items-center justify-center text-white text-[9px] font-bold">★</span>
          <span>Seeded Demo Record</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-flex items-center justify-center text-white text-[9px] font-bold">✚</span>
          <span>24/7 Emergency Center</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-500 inline-flex items-center justify-center text-white text-[9px] font-bold">•</span>
          <span>Unverified Listing</span>
        </div>
      </div>
    </div>
  );
}
