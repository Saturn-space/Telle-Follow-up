'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  FileCheck,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  HealthcareFacilityItem,
} from '@/lib/types/provider';

interface VerificationModalProps {
  facility: HealthcareFacilityItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function VerificationModal({
  facility,
  onClose,
  onSuccess,
}: VerificationModalProps) {
  const [status, setStatus] = useState<'VERIFIED' | 'UNVERIFIED'>('VERIFIED');
  const [registryLicenseNo, setRegistryLicenseNo] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!facility) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (evidenceNotes.trim().length < 5) {
      setError('Audit evidence notes must be at least 5 characters detailing the clinical check.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/providers/${facility.id}/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          evidenceNotes: evidenceNotes.trim(),
          registryLicenseNo: registryLicenseNo.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Verification update failed.');
      }

      onSuccess(`Verification status for ${facility.name} updated to ${status}.`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update verification status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Administrative Verification Review
              </h3>
              <p className="text-xs text-slate-500">
                Record audit evidence for {facility.name}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-900">
            <span className="font-bold">Clinical Audit Protocol:</span> Marking a facility as &ldquo;Verified&rdquo; requires verifying the state health registry license and confirming post-operative nursing capabilities.
          </div>

          {/* New Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Status Decision
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'VERIFIED' | 'UNVERIFIED')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="VERIFIED">VERIFIED — Formally Checked & Approved</option>
              <option value="UNVERIFIED">UNVERIFIED — Incomplete or Unconfirmed</option>
            </select>
          </div>

          {/* License Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              State Medical / Clinical Registry License No.
            </label>
            <input
              type="text"
              value={registryLicenseNo}
              onChange={(e) => setRegistryLicenseNo(e.target.value)}
              placeholder="e.g. KPME/BLR/2024/491 or NABH-C-2023-88"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Evidence Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Evidence & Verification Notes (Mandatory)
            </label>
            <textarea
              rows={3}
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Detail verification method (e.g., KPME registry portal lookup, telephonic validation with head nurse, site visit on DD/MM/YYYY)..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Footer Buttons */}
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
              className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Recording...' : 'Record Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
