'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DestinationComparisonOption, GeoLocation } from '@/lib/travel/types';
import { MapPin, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface LeafletMapProps {
  origin: GeoLocation;
  candidates: DestinationComparisonOption[];
  selectedCandidateId?: string;
  onSelectCandidate?: (candidateId: string) => void;
  isEscalated?: boolean;
}

export default function LeafletMapContainer({
  origin,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  isEscalated = false,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylinesGroupRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (typeof window === 'undefined') return;

      try {
        const L = (await import('leaflet')).default;

        if (!isSubscribed) return;

        // If map already initialized, clear it
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize map centered between origin and first candidate
        const map = L.map(mapContainerRef.current, {
          center: [origin.latitude, origin.longitude],
          zoom: 7,
          scrollWheelZoom: false,
        });

        // Add standard OpenStreetMap tiles
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        polylinesGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        setIsMapReady(true);
      } catch (err: any) {
        if (isSubscribed) {
          setMapError(err?.message || 'Could not load interactive mapping library.');
        }
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [origin.latitude, origin.longitude]);

  // Update markers and polylines when candidates or selection change
  useEffect(() => {
    async function updateLayers() {
      if (!isMapReady || !mapInstanceRef.current || !markersGroupRef.current || !polylinesGroupRef.current) {
        return;
      }

      try {
        const L = (await import('leaflet')).default;
        const markersGroup = markersGroupRef.current;
        const polylinesGroup = polylinesGroupRef.current;

        markersGroup.clearLayers();
        polylinesGroup.clearLayers();

        const bounds = L.latLngBounds([[origin.latitude, origin.longitude]]);

        // 1. Patient Origin Marker (Blue)
        const originIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `<div style="background-color: #2563eb; color: white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const originMarker = L.marker([origin.latitude, origin.longitude], { icon: originIcon });
        originMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px;">
            <strong style="color: #1e3a8a;">Patient Origin</strong><br/>
            <span>${origin.label}</span><br/>
            <small style="color: #64748b;">(${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)})</small>
          </div>
        `);
        markersGroup.addLayer(originMarker);

        // 2. Candidate Provider Markers
        candidates.forEach((candidate) => {
          bounds.extend([candidate.location.latitude, candidate.location.longitude]);

          let bgColor = '#059669'; // Default green for recommended
          let label = '★';

          if (isEscalated) {
            bgColor = '#dc2626'; // Red for emergency
            label = '🚨';
          } else if (candidate.isOriginalHospital) {
            bgColor = '#7c3aed'; // Purple for original hospital
            label = 'H';
          } else if (!candidate.isEligible) {
            bgColor = '#94a3b8'; // Slate for missing service
            label = '✕';
          } else if (!candidate.isRecommended) {
            bgColor = '#0284c7'; // Blue for alternate local clinic
            label = 'C';
          }

          const providerIcon = L.divIcon({
            className: 'custom-map-icon',
            html: `<div style="background-color: ${bgColor}; color: white; border-radius: 9999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); cursor: pointer;">
              ${label}
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([candidate.location.latitude, candidate.location.longitude], {
            icon: providerIcon,
          });

          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; max-width: 220px;">
              <strong style="color: #0f172a; font-size: 14px;">${candidate.providerName}</strong><br/>
              <span style="display: inline-block; padding: 2px 6px; font-size: 11px; border-radius: 4px; background: #f1f5f9; color: #475569; margin: 4px 0;">
                ${candidate.isOriginalHospital ? 'Primary Surgical Center' : 'Local Healthcare Facility'}
              </span><br/>
              <span><strong>Distance:</strong> ${candidate.route.distanceKm} km</span><br/>
              <span><strong>Est. Duration:</strong> ${Math.floor(candidate.route.durationMins / 60)}h ${candidate.route.durationMins % 60}m</span><br/>
              ${candidate.costEstimate ? `<span><strong>Est. Expense:</strong> ${candidate.costEstimate.currency} ${candidate.costEstimate.estimatedCost}</span><br/>` : ''}
              ${!candidate.isEligible ? `<span style="color: #dc2626;"><strong>Unavailable:</strong> ${candidate.ineligibilityReason}</span>` : ''}
            </div>
          `);

          marker.on('click', () => {
            if (onSelectCandidate) {
              onSelectCandidate(candidate.providerId);
            }
          });

          markersGroup.addLayer(marker);

          // Draw route polyline for the selected candidate or recommended candidate
          const isSelected = selectedCandidateId ? candidate.providerId === selectedCandidateId : candidate.isRecommended;

          if (isSelected && candidate.route.geometryPolyline && candidate.route.geometryPolyline.length > 0) {
            const polylineColor = isEscalated ? '#dc2626' : candidate.isOriginalHospital ? '#7c3aed' : '#059669';
            const polyline = L.polyline(candidate.route.geometryPolyline, {
              color: polylineColor,
              weight: 4,
              opacity: 0.8,
              dashArray: candidate.route.routeSource === 'ESTIMATED_HAVERSINE_ROAD_FACTOR' ? '8, 8' : undefined,
            });
            polylinesGroup.addLayer(polyline);
          }
        });

        // Fit map bounds smoothly
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } catch (err) {
        console.error('Error updating map markers:', err);
      }
    }

    updateLayers();
  }, [candidates, selectedCandidateId, isMapReady, origin, isEscalated, onSelectCandidate]);

  if (mapError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h4 className="font-semibold text-sm">Interactive Map Fallback Mode</h4>
        <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
          Map tiles could not be rendered in this environment ({mapError}).
          Route distances and cost models remain active in the comparison matrix below.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100">
      {/* Map Header / Legend Bar */}
      <div className="bg-white/90 backdrop-blur px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Layers className="w-4 h-4 text-teal-600" />
          <span>Interactive Follow-Up Route Map</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
            <span>Patient Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            <span>Recommended Local</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span>
            <span>Original Tertiary Hospital</span>
          </div>
          {isEscalated && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse inline-block"></span>
              <span className="text-red-700 font-bold">Emergency Triage Facility</span>
            </div>
          )}
        </div>
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-[380px] sm:h-[440px] z-10" />

      {/* Attribution & Notice Overlay */}
      <div className="absolute bottom-1 left-2 z-20 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-slate-600 border border-slate-200 pointer-events-none">
        OpenStreetMap • Leaflet GIS • Routing calculations are for decision support only
      </div>
    </div>
  );
}
