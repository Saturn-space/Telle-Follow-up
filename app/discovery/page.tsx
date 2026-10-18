'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  FileCode,
  FileText,
  HeartPulse,
  Hospital,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  HealthcareFacilityItem,
  FacilityType,
  ServiceCategory,
  VerificationStatus,
  FacilityLocationDTO,
} from '@/lib/types/provider';
import ProviderSearchFilters from '@/components/discovery/provider-search-filters';
import ProviderCard from '@/components/discovery/provider-card';
import ProviderMap from '@/components/map/provider-map';
import ProviderDetailModal from '@/components/discovery/provider-detail-modal';
import ReferralModal from '@/components/discovery/referral-modal';
import VerificationModal from '@/components/discovery/verification-modal';

interface SearchFiltersState {
  searchTerm: string;
  city: string;
  radiusKm: number;
  services: ServiceCategory[];
  facilityType: FacilityType[];
  verificationStatus?: VerificationStatus;
  emergencyOnly: boolean;
}

const DEFAULT_FILTERS: SearchFiltersState = {
  searchTerm: '',
  city: 'Bengaluru',
  radiusKm: 25,
  services: [],
  facilityType: [],
  verificationStatus: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    ? 'SEEDED_DEMO'
    : undefined,
  emergencyOnly: false,
};

const isLocalDemo = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Bengaluru Indiranagar default center coordinates for demo
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.6412 };

export default function HealthcareDiscoveryPage() {
  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);
  const [facilities, setFacilities] = useState<HealthcareFacilityItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<HealthcareFacilityItem | null>(null);
  const [detailFacility, setDetailFacility] = useState<HealthcareFacilityItem | null>(null);
  const [referralFacility, setReferralFacility] = useState<HealthcareFacilityItem | null>(null);
  const [verificationFacility, setVerificationFacility] = useState<HealthcareFacilityItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list_only' | 'map_only'>('split');

  // Cross-member simulation toggles
  const [simulatedPatient, setSimulatedPatient] = useState<{
    active: boolean;
    name: string;
    city: string;
    coords: { lat: number; lng: number };
    surgery: string;
  }>({
    active: false,
    name: 'Anita Verma',
    city: 'Bengaluru',
    coords: { lat: 12.9716, lng: 77.6412 },
    surgery: 'Laparoscopic Cholecystectomy (Day 8 Post-Op)',
  });

  const [simulatedRiskTier, setSimulatedRiskTier] = useState<'NONE' | 'LOW' | 'CRITICAL'>('NONE');
  const [travelHandoffPayload, setTravelHandoffPayload] = useState<FacilityLocationDTO | null>(null);

  // Fetch facilities based on current filters
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const params = new URLSearchParams();

        if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
        if (filters.city) params.set('city', filters.city);
        if (filters.services.length > 0) params.set('services', filters.services.join(','));
        if (filters.facilityType.length > 0) params.set('facilityType', filters.facilityType.join(','));
        if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus);
        if (filters.emergencyOnly) params.set('emergencyOnly', 'true');

        const center = simulatedPatient.active ? simulatedPatient.coords : DEFAULT_CENTER;
        params.set('latitude', center.lat.toString());
        params.set('longitude', center.lng.toString());
        params.set('radiusKm', filters.radiusKm.toString());
        params.set('limit', '30');

        const response = await fetch(`/api/providers?${params.toString()}`);
        const json = await response.json();

        if (!ignore && json.success) {
          setFacilities(json.data);
          setTotalCount(json.meta?.totalCount || json.data.length);
          if (json.data.length > 0) {
            setSelectedFacility((curr) => curr || json.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch providers', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [filters, simulatedPatient]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
      if (filters.city) params.set('city', filters.city);
      const center = simulatedPatient.active ? simulatedPatient.coords : DEFAULT_CENTER;
      params.set('latitude', center.lat.toString());
      params.set('longitude', center.lng.toString());
      const response = await fetch(`/api/providers?${params.toString()}`);
      const json = await response.json();
      if (json.success) {
        setFacilities(json.data);
        setTotalCount(json.meta?.totalCount || json.data.length);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, simulatedPatient]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleApplySimulatedPatient = () => {
    setSimulatedPatient((prev) => ({
      ...prev,
      active: !prev.active,
    }));
    setFilters((prev) => ({
      ...prev,
      city: 'Bengaluru',
      radiusKm: 20,
    }));
    showToast(
      simulatedPatient.active
        ? 'Cleared simulated patient context.'
        : 'Loaded Patient Context: Anita Verma (Indiranagar, Bengaluru, Post-Cholecystectomy).'
    );
  };

  const handleForwardToTravelOptimizer = (fac: HealthcareFacilityItem) => {
    const hasValidCoords =
      fac.latitude !== undefined &&
      fac.longitude !== undefined &&
      Number.isFinite(fac.latitude) &&
      Number.isFinite(fac.longitude);

    const payload: FacilityLocationDTO = {
      facilityId: fac.id,
      facilityName: fac.name,
      facilityType: fac.facilityType,
      coordinates: hasValidCoords
        ? {
            latitude: fac.latitude!,
            longitude: fac.longitude!,
          }
        : null,
      hasValidCoordinates: hasValidCoords,
      address: `${fac.addressLine1}, ${fac.city}`,
      city: fac.city,
      state: fac.state,
      postalCode: fac.postalCode,
      emergencyCapable: fac.emergencyCapable,
      servicesAvailable: fac.services.map((s) => s.serviceCategory),
    };

    setTravelHandoffPayload(payload);
    if (hasValidCoords) {
      showToast(`Transit routing data generated: ${fac.name} coordinates prepared.`);
    } else {
      showToast(`Notice: ${fac.name} has no verified coordinates. Transit routing suspended until geocoded.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FF] text-[#0E1C30] pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[2000] bg-[#0E1C30] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#243146] text-xs animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#89F5E7] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#8B97B0] hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-[#DCE5F5] bg-white/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-[#536078] hover:text-[#0E1C30] hover:bg-[#F0F3FF] transition-colors"
              title="Return to System Architecture"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1745D8] to-[#254EE0] flex items-center justify-center text-white shadow-md">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-[#0E1C30] leading-tight">
                  Healthcare Provider Discovery & Care Coordination
                </h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${isLocalDemo ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-[#E6F8F2] text-[#047857] border-[#A7F3D0]'}`}>
                  {isLocalDemo ? 'Synthetic Demo Directory' : 'Verified Directory'}
                </span>
              </div>
              <p className="text-xs text-[#536078]">
                Discover accredited community facilities for safe post-surgical follow-up
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/api/docs/openapi"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#DCE5F5] text-[#0E1C30] hover:bg-[#F0F3FF] transition-colors shadow-2xs"
            >
              <FileCode className="w-4 h-4 text-[#1745D8]" />
              OpenAPI Contract
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLocalDemo && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            Local demo listings are synthetic and are not real healthcare providers. Referral and travel actions stay unavailable until an administrator verifies a real facility.
          </div>
        )}
        {/* Cross-Module Testing Bar */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400">
              <Activity className="w-4 h-4" />
              Cross-Module Integration & Contract Testing
            </div>
            <span className="text-[11px] text-slate-400">
              Simulate inputs from Patient Intake and AI Risk Stratification
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Patient Intake Simulation */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Patient Intake Context
                </span>
                <p className="text-[11px] text-slate-400">
                  {simulatedPatient.active
                    ? `${simulatedPatient.name} • ${simulatedPatient.surgery} • Indiranagar, Bengaluru`
                    : 'No patient selected. Search defaults to regional center.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplySimulatedPatient}
                className={`mt-2.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  simulatedPatient.active
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {simulatedPatient.active ? '✓ Patient Active (Indiranagar)' : 'Load Patient (Anita Verma)'}
              </button>
            </div>

            {/* AI Risk Simulation */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
                  AI Risk Gating
                </span>
                <p className="text-[11px] text-slate-400">
                  {simulatedRiskTier === 'CRITICAL'
                    ? 'CRITICAL RISK: Surgical complication suspected. Routine clinic care disabled.'
                    : simulatedRiskTier === 'LOW'
                    ? 'LOW RISK: Routine local dressing & suture removal clinically eligible.'
                    : 'Standard mode. No risk gating applied.'}
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedRiskTier(simulatedRiskTier === 'LOW' ? 'NONE' : 'LOW')
                  }
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    simulatedRiskTier === 'LOW'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Low Risk Tier
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedRiskTier(simulatedRiskTier === 'CRITICAL' ? 'NONE' : 'CRITICAL')
                  }
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    simulatedRiskTier === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Critical Risk (Escalate)
                </button>
              </div>
            </div>

            {/* Travel Routing Payload */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Travel Routing Payload
                </span>
                <p className="text-[11px] text-slate-400">
                  {travelHandoffPayload
                    ? travelHandoffPayload.hasValidCoordinates && travelHandoffPayload.coordinates
                      ? `Ready for Travel Matrix: ${travelHandoffPayload.facilityName} (${travelHandoffPayload.coordinates.latitude.toFixed(2)}, ${travelHandoffPayload.coordinates.longitude.toFixed(2)})`
                      : `Notice: ${travelHandoffPayload.facilityName} has no verified coordinates. Transit routing suspended.`
                    : 'Click "Send to Travel" on any facility card to verify payload.'}
                </p>
              </div>
              {travelHandoffPayload && (
                <div className="mt-2 text-[10px] font-mono text-amber-300 truncate">
                  ID: {travelHandoffPayload.facilityId} • Coordinates: {travelHandoffPayload.hasValidCoordinates ? 'Verified Lat/Lng' : 'Unavailable (Unmapped)'}
                </div>
              )}
            </div>
          </div>

          {/* Critical Risk Alert Banner */}
          {simulatedRiskTier === 'CRITICAL' && (
            <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-white">Safety Override Triggered:</strong> AI Risk Assessment flagged critical symptoms (fever &gt; 38.5°C or wound dehiscence). Travel cost optimization is disabled. Patient must be routed directly to the surgical hospital or nearest 24/7 emergency facility.
              </div>
            </div>
          )}
        </div>

        {/* Filter Controls Component */}
        <ProviderSearchFilters
          filters={filters}
          onChange={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          totalResultsCount={totalCount}
        />

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Hospital className="w-4 h-4 text-teal-600" />
            <span>Healthcare Directory & Mapping Results</span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'split' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list_only')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'list_only' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map_only')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'map_only' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Map Only
            </button>
          </div>
        </div>

        {/* Split / List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Section */}
          {(viewMode === 'split' || viewMode === 'map_only') && (
            <div
              className={`${
                viewMode === 'map_only'
                  ? 'lg:col-span-12 h-[650px]'
                  : 'lg:col-span-7 h-[580px]'
              } sticky top-24`}
            >
              <ProviderMap
                facilities={facilities}
                selectedFacilityId={selectedFacility?.id}
                onSelectFacility={(fac) => {
                  setSelectedFacility(fac);
                  setDetailFacility(fac);
                }}
                center={
                  simulatedPatient.active ? simulatedPatient.coords : DEFAULT_CENTER
                }
              />
            </div>
          )}

          {/* Provider Card List Section */}
          {(viewMode === 'split' || viewMode === 'list_only') && (
            <div
              className={`${
                viewMode === 'list_only' ? 'lg:col-span-12' : 'lg:col-span-5'
              } space-y-4`}
            >
              {isLoading && (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Querying local healthcare directory...</p>
                </div>
              )}

              {!isLoading && facilities.length === 0 && (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">No Matching Facilities Found</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Try expanding the radius slider or resetting service filters to find nearby medical centers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="mt-4 px-4 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {!isLoading &&
                facilities.map((fac) => (
                  <ProviderCard
                    key={fac.id}
                    facility={fac}
                    isSelected={fac.id === selectedFacility?.id}
                    onSelect={(f) => setSelectedFacility(f)}
                    onOpenDetails={(f) => setDetailFacility(f)}
                    onRequestReferral={(f) => setReferralFacility(f)}
                    onForwardToTravel={(f) => handleForwardToTravelOptimizer(f)}
                    onVerify={(f) => setVerificationFacility(f)}
                  />
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ProviderDetailModal
        facility={detailFacility}
        onClose={() => setDetailFacility(null)}
        onRequestReferral={(f) => setReferralFacility(f)}
        onVerify={(f) => setVerificationFacility(f)}
      />

      <ReferralModal
        facility={referralFacility}
        onClose={() => setReferralFacility(null)}
        onSuccess={(msg) => showToast(msg)}
      />

      <VerificationModal
        facility={verificationFacility}
        onClose={() => setVerificationFacility(null)}
        onSuccess={(msg) => {
          showToast(msg);
          refetch();
        }}
      />
    </div>
  );
}
