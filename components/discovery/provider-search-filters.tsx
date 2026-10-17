'use client';

import React from 'react';
import {
  Compass,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  FacilityType,
  ServiceCategory,
  VerificationStatus,
} from '@/lib/types/provider';

interface SearchFiltersState {
  searchTerm: string;
  city: string;
  radiusKm: number;
  services: ServiceCategory[];
  facilityType: FacilityType[];
  verificationStatus?: VerificationStatus;
  emergencyOnly: boolean;
}

interface ProviderSearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  onReset: () => void;
  totalResultsCount: number;
}

const AVAILABLE_SERVICES: { id: ServiceCategory; label: string }[] = [
  { id: 'WOUND_CARE', label: 'Wound Care & Dressing' },
  { id: 'SUTURE_REMOVAL', label: 'Suture / Staple Removal' },
  { id: 'DRAIN_MANAGEMENT', label: 'Drain Monitoring' },
  { id: 'POST_OP_LABS', label: 'Post-Op Labs (Infection)' },
  { id: 'PHYSIOTHERAPY', label: 'Post-Op Physical Therapy' },
  { id: 'IMAGING_XRAY', label: 'X-Ray & DVT Doppler' },
  { id: 'GENERAL_POST_OP_EVAL', label: 'Surgeon Evaluation' },
];

const QUICK_CITIES = ['All Cities', 'Bengaluru', 'Mumbai', 'New Delhi', 'Chennai'];

export default function ProviderSearchFilters({
  filters,
  onChange,
  onReset,
  totalResultsCount,
}: ProviderSearchFiltersProps) {
  const toggleService = (srv: ServiceCategory) => {
    const next = filters.services.includes(srv)
      ? filters.services.filter((s) => s !== srv)
      : [...filters.services, srv];
    onChange({ ...filters, services: next });
  };

  const setCity = (cityName: string) => {
    onChange({
      ...filters,
      city: cityName === 'All Cities' ? '' : cityName,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <Filter className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Discovery & Search Filters</h3>
            <p className="text-xs text-slate-500">
              Filter accredited local resources by clinical capability and geography
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Free text search */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Search Facility Name or Specialty
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
              placeholder="e.g. St. Jude, wound dressing, Indiranagar, rehabilitation..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* 2. Radius Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Proximity Radius: <span className="text-teal-700 font-bold">{filters.radiusKm} km</span>
            </label>
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={filters.radiusKm}
            onChange={(e) => onChange({ ...filters, radiusKm: parseInt(e.target.value, 10) })}
            className="w-full accent-teal-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>5 km</span>
            <span>25 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>
      </div>

      {/* 3. Quick City Chips */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          Select Region / City
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_CITIES.map((cityName) => {
            const isSelected =
              cityName === 'All Cities' ? !filters.city : filters.city.toLowerCase() === cityName.toLowerCase();
            return (
              <button
                key={cityName}
                type="button"
                onClick={() => setCity(cityName)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cityName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Service Category Filter Chips */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
          Post-Surgical Services Required
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SERVICES.map((srv) => {
            const isChecked = filters.services.includes(srv.id);
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => toggleService(srv.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                  isChecked
                    ? 'bg-teal-50 border-teal-500 text-teal-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isChecked ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                />
                {srv.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Additional Status Toggles */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Verification Status Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Verification:
            </span>
            <select
              value={filters.verificationStatus || ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  verificationStatus: (e.target.value as VerificationStatus) || undefined,
                })
              }
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="SEEDED_DEMO">Seeded Demo Records</option>
              <option value="UNVERIFIED">Unverified Listings</option>
            </select>
          </div>

          {/* 24/7 Emergency Toggle */}
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.emergencyOnly}
              onChange={(e) => onChange({ ...filters, emergencyOnly: e.target.checked })}
              className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600 w-4 h-4"
            />
            <span>24/7 Emergency Capable Only</span>
          </label>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Showing <span className="font-bold text-slate-900">{totalResultsCount}</span> matched facilities
        </div>
      </div>
    </div>
  );
}
