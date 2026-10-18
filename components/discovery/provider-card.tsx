'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  Globe,
  Hospital,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { HealthcareFacilityItem } from '@/lib/types/provider';

interface ProviderCardProps {
  facility: HealthcareFacilityItem;
  isSelected?: boolean;
  onSelect: (facility: HealthcareFacilityItem) => void;
  onOpenDetails: (facility: HealthcareFacilityItem) => void;
  onRequestReferral: (facility: HealthcareFacilityItem) => void;
  onForwardToTravel?: (facility: HealthcareFacilityItem) => void;
  onVerify?: (facility: HealthcareFacilityItem) => void;
}

export default function ProviderCard({
  facility,
  isSelected,
  onSelect,
  onOpenDetails,
  onRequestReferral,
  onForwardToTravel,
  onVerify,
}: ProviderCardProps) {
  const isVerified = facility.verificationStatus === 'VERIFIED';
  const isDemo = facility.verificationStatus === 'SEEDED_DEMO';
  const isUnverified = facility.verificationStatus === 'UNVERIFIED';
  const isPending = facility.verificationStatus === 'PENDING_REVIEW';

  const formatFacilityType = (type: string) => {
    switch (type) {
      case 'WOUND_CARE_CENTER':
        return 'Wound Care Center';
      case 'DIAGNOSTIC_CENTER':
        return 'Diagnostic Center';
      case 'SURGICAL_REHAB':
        return 'Surgical Rehabilitation';
      case 'HOSPITAL':
        return 'General Hospital';
      default:
        return 'Community Clinic';
    }
  };

  const formatServiceCategory = (cat: string) => {
    return cat.replace('_', ' ').toLowerCase();
  };

  return (
    <div
      onClick={() => onSelect(facility)}
      className={`bg-white rounded-2xl border p-5 transition-all cursor-pointer shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-[#1745D8] ring-2 ring-[#1745D8]/20 bg-[#F0F3FF]/50'
          : 'border-[#DCE5F5] hover:border-[#1745D8]'
      }`}
    >
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {formatFacilityType(facility.facilityType)}
          </span>
          {facility.emergencyCapable && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              24/7 ER
            </span>
          )}
          {(facility.latitude === undefined || facility.longitude === undefined) && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1 border border-slate-200" title="Facility address is recorded, but exact geospatial coordinates are not mapped.">
              <MapPin className="w-3 h-3 text-slate-400" />
              Unmapped (List Only)
            </span>
          )}
        </div>

        {/* Verification Status Badge */}
        <div>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Facility
            </span>
          )}
          {isDemo && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Seeded Demo Record
            </span>
          )}
          {isUnverified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              Unverified Listing
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Pending Verification
            </span>
          )}
        </div>
      </div>

      {/* Facility Name & Location */}
      <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
        {facility.name}
      </h4>
      {isDemo && <p className="mt-1 text-[11px] font-medium text-amber-800">Synthetic sample only — not a real care provider.</p>}

      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600">
        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          {facility.addressLine1}, {facility.city}, {facility.state} {facility.postalCode}
        </span>
      </div>

      {/* Distance Metric */}
      {facility.distanceKm !== undefined && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>Approx. {facility.distanceKm} km from search location</span>
        </div>
      )}

      {/* Listed Services Badges */}
      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Available Post-Op Services
        </div>
        <div className="flex flex-wrap gap-1.5">
          {facility.services.map((srv) => (
            <span
              key={srv.id}
              className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 capitalize"
            >
              {formatServiceCategory(srv.serviceCategory)}
            </span>
          ))}
          {facility.services.length === 0 && (
            <span className="text-[11px] text-slate-400 italic">
              No specific post-op services listed yet.
            </span>
          )}
        </div>
      </div>

      {/* Contact snippet */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {facility.phone && (
            <span className="flex items-center gap-1 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {facility.phone}
            </span>
          )}
          {facility.websiteUrl && (
            <a
              href={facility.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-teal-600 hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              Website
            </a>
          )}
        </div>

        {facility.lastVerifiedAt && (
          <span className="text-[10px] text-slate-400">
            Verified: {new Date(facility.lastVerifiedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(facility);
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            View Full Profile
          </button>

          {onForwardToTravel && isVerified && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onForwardToTravel(facility);
              }}
              title="Forward coordinates to Travel Optimizer"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <Compass className="w-3 h-3 text-amber-600" />
              Send to Travel
            </button>
          )}

          {onVerify && !isVerified && !isDemo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onVerify(facility);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <FileCheck className="w-3 h-3 text-emerald-600" />
              Verify (Admin)
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            if (!isVerified) return;
            e.stopPropagation();
            onRequestReferral(facility);
          }}
          disabled={!isVerified}
          title={isVerified ? 'Coordinate care with this verified facility.' : 'Only administrator-verified facilities can receive referrals.'}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isVerified ? 'Coordinate Care' : 'Verification required'}
        </button>
      </div>
    </div>
  );
}
