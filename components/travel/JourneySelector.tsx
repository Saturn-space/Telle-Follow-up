'use client';

import React from 'react';
import { TransportMode } from '@/lib/travel/types';
import { User, Stethoscope, Car, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PatientOption {
  patientId: string;
  name: string;
  surgeryType: string;
  origin: { label: string };
  clinicalRisk: { urgencyLevel: string; isEscalated: boolean; clinicianReviewed: boolean; isStale: boolean };
}

interface JourneySelectorProps {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  requiredService: string;
  onChangeService: (service: string) => void;
  transportMode: TransportMode;
  onChangeTransportMode: (mode: TransportMode) => void;
  isLoading: boolean;
  onRunComparison: () => void;
}

export default function JourneySelector({ patients, selectedPatientId, onSelectPatient, requiredService, onChangeService, transportMode, onChangeTransportMode, isLoading, onRunComparison }: JourneySelectorProps) {
  const currentPatient = patients.find((patient) => patient.patientId === selectedPatientId) ?? patients[0];
  const risk = currentPatient?.clinicalRisk;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2"><User className="w-4 h-4 text-teal-600" />Patient Travel Context &amp; Journey Configuration</h3>
          <p className="text-xs text-slate-500">Patient location and current clinical review are read from saved records.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {risk?.isEscalated ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800 border border-red-300"><AlertTriangle className="w-3.5 h-3.5" />Escalation from reviewed assessment</span>
            : risk?.clinicianReviewed && !risk.isStale ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><ShieldCheck className="w-3.5 h-3.5" />Risk review current</span>
              : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" />Current review required</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient Record</label>
          <select value={selectedPatientId} onChange={(event) => onSelectPatient(event.target.value)} disabled={isLoading || patients.length === 0} className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
            {patients.length === 0 && <option value="">No accessible patient records</option>}
            {patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} ({patient.surgeryType}) · {patient.origin.label}</option>)}
          </select>
          {currentPatient && <span className="text-[10px] text-slate-500 block mt-1">Approximate origin: {currentPatient.origin.label}</span>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 text-slate-500" />Required Follow-Up Service</label>
          <select value={requiredService} onChange={(event) => onChangeService(event.target.value)} disabled={isLoading} className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="POST_OP_WOUND_CARE">Surgical Wound Care</option><option value="SUTURE_REMOVAL">Suture / Staple Removal</option><option value="DRAIN_REMOVAL">Drain Management</option><option value="DOPPLER_ULTRASOUND">Doppler Ultrasound</option><option value="CARDIAC_REHAB">Cardiac Rehabilitation</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-1">Matches services recorded for verified facilities</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5 text-slate-500" />Transport Mode Modeled</label>
          <select value={transportMode} onChange={(event) => onChangeTransportMode(event.target.value as TransportMode)} disabled={isLoading} className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="DRIVING">Private Vehicle / Car (₹12/km)</option><option value="PUBLIC_TRANSIT">Public Transit / Bus (₹3.50/km)</option><option value="TAXI">Commercial Taxi / Cab (₹18/km)</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-1">Public transit uses an estimate without schedules or fares</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-teal-600" />Clinical Risk Context</label>
          <div className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900">{risk?.clinicianReviewed ? `${risk.urgencyLevel}${risk.isStale ? ' · review is stale' : ''}` : 'Unreviewed or unavailable'}</div>
          <span className="text-[10px] text-slate-500 block mt-1">Read from the latest saved clinician review</span>
        </div>
      </div>
      <div className="pt-2 flex items-center justify-end">
        <button type="button" onClick={onRunComparison} disabled={isLoading || !selectedPatientId} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50">
          {isLoading ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Computing Travel Options...</> : 'Re-evaluate Follow-Up Destinations'}
        </button>
      </div>
    </div>
  );
}
