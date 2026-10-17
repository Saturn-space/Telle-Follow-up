'use client';

// components/patient/SurgicalProfileView.tsx
import React, { useState } from 'react';
import { Surgery, Patient } from '@/lib/types/patient';
import { Stethoscope, Building2, MapPin, Calendar, FileText, PlusCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  patient: Patient;
  surgery?: Surgery | null;
  onSurgeryUpdated: (surgery: Surgery) => void;
}

export function SurgicalProfileView({ patient, surgery, onSurgeryUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    procedureName: surgery?.procedureName || 'Right Total Knee Arthroplasty (TKA)',
    surgicalSpecialty: surgery?.surgicalSpecialty || 'Orthopedic Surgery',
    hospitalName: surgery?.hospitalName || 'Chicago Metropolitan Orthopedic Center',
    hospitalCity: surgery?.hospitalCity || 'Chicago',
    hospitalState: surgery?.hospitalState || 'IL',
    operatingSurgeon: surgery?.operatingSurgeon || 'Dr. Sarah Jenkins, MD, FAAOS',
    surgeryDate: surgery?.surgeryDate ? surgery.surgeryDate.split('T')[0] : '2026-10-10',
    dischargeDate: surgery?.dischargeDate ? surgery.dischargeDate.split('T')[0] : '2026-10-13',
    dischargeCondition:
      surgery?.dischargeCondition || 'Stable, ambulatory with walker. Incision closed with 18 surgical staples.',
    woundCareInstructions:
      surgery?.woundCareInstructions || 'Keep incision clean and dry. No submersion. Change outer dressing every 48h.',
    plannedFollowUpDate: surgery?.plannedFollowUpDate
      ? surgery.plannedFollowUpDate.split('T')[0]
      : '2026-10-24',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isUpdating = Boolean(surgery?.id);
      const res = await fetch(`/api/v1/patients/${patient.id}/surgeries`, {
        method: isUpdating ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUpdating ? { surgeryId: surgery!.id, ...formData } : formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save surgery');
      }

      onSurgeryUpdated(json.data);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save surgery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            Surgical &amp; Discharge Profile
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Verified operative details and discharge directives from the operating medical center.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          {surgery ? 'Edit Record' : '+ Record Surgery'}
        </button>
      </div>

      {/* Geographic Travel Burden Banner */}
      {surgery && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-950">Geographic Follow-Up Disparity</h3>
              <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                Operating Center: <strong>{surgery.hospitalName} ({surgery.hospitalCity}, {surgery.hospitalState})</strong>
                <br />
                Patient Home: <strong>{patient.homeAddress}, {patient.homeCity}, {patient.homeState} {patient.homeZip}</strong>
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-indigo-900 font-medium bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-200/80 inline-flex">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Candidate for Tele-Follow-Up &amp; Local Provider Suture Removal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            {surgery ? 'Update Surgical & Discharge Details' : 'Record Surgery & Discharge'}
          </h3>

          {error && <div className="mb-4 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Procedure Name *</label>
                <input
                  type="text"
                  required
                  value={formData.procedureName}
                  onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Surgical Specialty</label>
                <input
                  type="text"
                  value={formData.surgicalSpecialty}
                  onChange={(e) => setFormData({ ...formData, surgicalSpecialty: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Operating Hospital *</label>
                <input
                  type="text"
                  required
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Operating Surgeon *</label>
                <input
                  type="text"
                  required
                  value={formData.operatingSurgeon}
                  onChange={(e) => setFormData({ ...formData, operatingSurgeon: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Hospital City</label>
                <input
                  type="text"
                  value={formData.hospitalCity}
                  onChange={(e) => setFormData({ ...formData, hospitalCity: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Hospital State</label>
                <input
                  type="text"
                  value={formData.hospitalState}
                  onChange={(e) => setFormData({ ...formData, hospitalState: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Surgery Date *</label>
                <input
                  type="date"
                  required
                  value={formData.surgeryDate}
                  onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Discharge Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dischargeDate}
                  onChange={(e) => setFormData({ ...formData, dischargeDate: e.target.value })}
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Condition at Discharge</label>
              <textarea
                rows={2}
                value={formData.dischargeCondition}
                onChange={(e) => setFormData({ ...formData, dischargeCondition: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Wound Care Instructions</label>
              <textarea
                rows={2}
                value={formData.woundCareInstructions}
                onChange={(e) => setFormData({ ...formData, woundCareInstructions: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs"
              >
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Surgery & Discharge Display Cards */}
      {surgery ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Surgery Information */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Operative Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Procedure</span>
                <span className="font-semibold text-slate-800">{surgery.procedureName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Specialty</span>
                <span className="font-semibold text-slate-800">{surgery.surgicalSpecialty}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Operating Hospital</span>
                <span className="font-semibold text-slate-800">{surgery.hospitalName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Lead Surgeon</span>
                <span className="font-semibold text-slate-800">{surgery.operatingSurgeon}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Surgery Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date(surgery.surgeryDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Location</span>
                <span className="font-semibold text-slate-800">
                  {surgery.hospitalCity}, {surgery.hospitalState}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Discharge Directives */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Discharge Directives</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Discharge Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date(surgery.dischargeDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Condition at Discharge</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                  {surgery.dischargeCondition}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Wound Care Guidelines</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                  {surgery.woundCareInstructions || 'No specialized instructions recorded.'}
                </p>
              </div>
              {surgery.plannedFollowUpDate && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Recommended Follow-up Target</span>
                  <span className="font-semibold text-teal-700">
                    {new Date(surgery.plannedFollowUpDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
          <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 mt-2">No Surgical Record Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Attach procedure, hospital, and discharge guidelines to contextualize recovery monitoring.
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Add Surgical Record
          </button>
        </div>
      )}
    </div>
  );
}
