'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { HealthcareFacilityItem } from '@/lib/types/provider';
import { MapPin, AlertCircle } from 'lucide-react';

interface ProviderMapProps {
  facilities: HealthcareFacilityItem[];
  selectedFacilityId?: string;
  onSelectFacility: (facility: HealthcareFacilityItem) => void;
  center?: { lat: number; lng: number };
  isMapUnavailable?: boolean;
  onSwitchToList?: () => void;
}

// Dynamically import the Leaflet component with SSR disabled
const ProviderMapInner = dynamic(
  () => import('./provider-map-inner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[380px] bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
        <MapPin className="w-8 h-8 animate-bounce text-teal-600 mb-2" />
        <span className="text-sm font-medium">Loading OpenStreetMap Canvas...</span>
      </div>
    ),
  }
);

export default function ProviderMap(props: ProviderMapProps) {
  if (props.isMapUnavailable) {
    return (
      <div className="w-full h-full min-h-[380px] bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-amber-800">
        <AlertCircle className="w-10 h-10 text-amber-600 mb-2" />
        <h4 className="font-semibold text-base">Map Service Unavailable</h4>
        <p className="text-xs text-amber-700 max-w-sm mt-1">
          Tile rendering or geocoding services could not be reached. All provider details and addresses remain accessible in the list view below.
        </p>
        {props.onSwitchToList && (
          <button
            type="button"
            onClick={props.onSwitchToList}
            className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition-colors"
          >
            Switch to List-Only View
          </button>
        )}
      </div>
    );
  }

  return <ProviderMapInner {...props} />;
}
