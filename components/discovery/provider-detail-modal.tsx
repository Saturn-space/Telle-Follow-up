'use client';

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  Hospital,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { HealthcareFacilityItem } from '@/lib/types/provider';

interface ProviderDetailModalProps {
  facility: HealthcareFacilityItem | null;
  onClose: () => void;
  onRequestReferral: (facility: HealthcareFacilityItem) => void;
  onVerify?: (facility: HealthcareFacilityItem) => void;
}

export default function ProviderDetailModal({
  facility,
  onClose,
  onRequestReferral,
  onVerify,
}: ProviderDetailModalProps) {
  if (!facility) return null;

  const isVerified = facility.verificationStatus === 'VERIFIED';
  const isDemo = facility.verificationStatus === 'SEEDED_DEMO';
  const isUnverified = facility.verificationStatus === 'UNVERIFIED';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {facility.facilityType.replace('_', ' ')}
              </span>

              {isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Medical Provider
                </span>
              )}
              {isDemo && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Demonstration Seed Record
                </span>
              )}
              {isUnverified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  Unverified Listing
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900">{facility.name}</h3>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {facility.addressLine1}, {facility.city}, {facility.state} {facility.postalCode}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-500">
              {facility.latitude !== undefined && facility.longitude !== undefined && Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude) ? (
                <span className="text-emerald-700">GPS: {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}</span>
              ) : (
                <span className="text-amber-700 font-sans italic">GPS Coordinates: Unmapped (Address on record)</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Data Provenance & Safety Disclaimer */}
          <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-teal-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-teal-800">
              <FileCheck className="w-4 h-4 text-teal-600" />
              Clinical Discovery Disclaimer
            </div>
            <p className="text-teal-700 leading-relaxed">
              This directory catalogs local healthcare capabilities for post-surgical follow-up coordination.
              Listing does not constitute an automated medical diagnosis or guarantee immediate bed/appointment availability. Final care decisions must be reviewed by the surgical team.
            </p>
          </div>

          {/* Contact & Hours Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Contact & Communication
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{facility.phone || 'Phone unlisted'}</span>
                </div>
                {facility.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium">{facility.email}</span>
                  </div>
                )}
                {facility.websiteUrl && (
                  <div className="pt-1">
                    <a
                      href={facility.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 hover:underline font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Visit Official Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Operating Schedule
              </h4>
              <div className="text-xs space-y-1">
                {facility.operatingHours ? (
                  Object.entries(facility.operatingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-slate-600">
                      <span className="font-semibold uppercase">{day}</span>
                      <span>{hours}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Operating hours not verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Full Post-Surgical Service Catalog */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Listed Post-Operative Capabilities & Estimates
            </h4>
            <div className="space-y-2.5">
              {facility.services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {srv.specialtyName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {srv.description || 'Clinical service for post-op recovery monitoring.'}
                      </div>
                    </div>
                    {srv.estimatedCostINR !== undefined && (
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          ₹{srv.estimatedCostINR}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Est. procedure fee</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {srv.serviceCategory.replace('_', ' ')}
                    </span>
                    <span>
                      {srv.requiresPreBooking ? '• Prior Booking Required' : '• Walk-in Accepted'}
                    </span>
                    {srv.availableDays && (
                      <span>• Available: {srv.availableDays.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Audit Records */}
          {facility.verifications && facility.verifications.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Verification Audit History
              </h4>
              <div className="space-y-2">
                {facility.verifications.map((v) => (
                  <div key={v.id} className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100 text-xs">
                    <div className="flex items-center justify-between text-emerald-900 font-semibold mb-1">
                      <span>Status: {v.status}</span>
                      <span className="text-[11px] text-emerald-700 font-normal">
                        {new Date(v.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{v.evidenceNotes}</p>
                    {v.registryLicenseNo && (
                      <div className="mt-1 text-[11px] font-mono text-slate-500">
                        License / Registry: {v.registryLicenseNo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onVerify && !isVerified && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onVerify(facility);
                }}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                Perform Admin Verification
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestReferral(facility);
            }}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            Dispatch Care Referral
          </button>
        </div>
      </div>
    </div>
  );
}
