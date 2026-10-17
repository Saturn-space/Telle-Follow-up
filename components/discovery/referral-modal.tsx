'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Send,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  HealthcareFacilityItem,
  ServiceCategory,
} from '@/lib/types/provider';

interface ReferralModalProps {
  facility: HealthcareFacilityItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ReferralModal({
  facility,
  onClose,
  onSuccess,
}: ReferralModalProps) {
  const [patientId, setPatientId] = useState('pat_synt_101');
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>(
    facility?.services.map((s) => s.serviceCategory) || ['WOUND_CARE']
  );
  const [urgencyLevel, setUrgencyLevel] = useState<'ROUTINE' | 'PRIORITY' | 'URGENT'>('ROUTINE');
  const [clinicalSummary, setClinicalSummary] = useState(
    'Post-operative follow-up care referral. Patient is Day 10 post-surgery. Local clinical examination and routine wound care requested.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!facility) return null;

  const toggleService = (srv: ServiceCategory) => {
    setSelectedServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedServices.length === 0) {
      setError('Please select at least one required service category.');
      return;
    }

    if (!clinicalSummary.trim()) {
      setError('Clinical summary notes are mandatory for referral handoff.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CLINICIAN',
        },
        body: JSON.stringify({
          patientId,
          facilityId: facility.id,
          requestedServices: selectedServices,
          urgencyLevel,
          clinicalSummary,
          attendingPhysicianId: 'dr_surgical_lead',
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Referral dispatch failed.');
      }

      onSuccess(`Care coordination referral successfully dispatched to ${facility.name}.`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch referral.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Coordinate Local Care Referral
              </h3>
              <p className="text-xs text-slate-500">
                Dispatch follow-up request to {facility.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Identification (Synthetic ID)
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Refers to Member 1 synthetic post-surgical patient profile.
            </p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Referral Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ROUTINE', 'PRIORITY', 'URGENT'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setUrgencyLevel(lvl)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    urgencyLevel === lvl
                      ? lvl === 'URGENT'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'bg-teal-50 border-teal-500 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Services Requested */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              Requested Clinical Services
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {facility.services.map((srv) => {
                const isChecked = selectedServices.includes(srv.serviceCategory);
                return (
                  <label
                    key={srv.id}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleService(srv.serviceCategory)}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span className="font-medium">{srv.specialtyName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Clinical Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Summary & Instructions
            </label>
            <textarea
              rows={3}
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Detail surgical procedure, suture type, drain instructions..."
              required
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Dispatching...' : 'Dispatch Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
