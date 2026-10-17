'use client';

import React from 'react';
import { ClinicalUrgencyLevel, TransportMode } from '@/lib/travel/types';
import { User, Stethoscope, Car, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PatientOption {
  patientId: string;
  name: string;
  surgeryType: string;
  daysPostOp: number;
  origin: {
    label: string;
    latitude: number;
    longitude: number;
  };
  clinicalRisk: {
    urgencyLevel: ClinicalUrgencyLevel;
    isEscalated: boolean;
  };
}

interface JourneySelectorProps {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  requiredService: string;
  onChangeService: (service: string) => void;
  transportMode: TransportMode;
  onChangeTransportMode: (mode: TransportMode) => void;
  clinicalUrgencySimulation: ClinicalUrgencyLevel;
  onChangeClinicalUrgencySimulation: (level: ClinicalUrgencyLevel) => void;
  isLoading: boolean;
  onRunComparison: () => void;
}

export default function JourneySelector({
  patients,
  selectedPatientId,
  onSelectPatient,
  requiredService,
  onChangeService,
  transportMode,
  onChangeTransportMode,
  clinicalUrgencySimulation,
  onChangeClinicalUrgencySimulation,
  isLoading,
  onRunComparison,
}: JourneySelectorProps) {
  const currentPatient = patients.find((p) => p.patientId === selectedPatientId) ?? patients[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Patient Travel Context & Journey Configuration
          </h3>
          <p className="text-xs text-slate-500">
            Ingests patient surgical baseline from Member 1 and clinical risk state from Member 2.
          </p>
        </div>

        {/* Safety Indicator Badge */}
        <div className="flex items-center gap-1.5 text-xs">
          {clinicalUrgencySimulation === 'CRITICAL' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Emergency Escalation Test Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Safety Gate: Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patient Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Patient (Member 1 Seed)
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => onSelectPatient(e.target.value)}
            disabled={isLoading}
            className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {patients.map((p) => (
              <option key={p.patientId} value={p.patientId}>
                {p.name} ({p.surgeryType}) - {p.origin.label}
              </option>
            ))}
          </select>
          {currentPatient && (
            <span className="text-[10px] text-slate-500 block mt-1">
              Origin: {currentPatient.origin.label} ({currentPatient.origin.latitude.toFixed(2)}, {currentPatient.origin.longitude.toFixed(2)})
            </span>
          )}
        </div>

        {/* Required Clinical Service */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
            Required Follow-Up Service
          </label>
          <select
            value={requiredService}
            onChange={(e) => onChangeService(e.target.value)}
            disabled={isLoading}
            className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="POST_OP_WOUND_CARE">Surgical Wound Care & Debridement</option>
            <option value="SUTURE_REMOVAL">Suture / Staple Removal</option>
            <option value="DRAIN_REMOVAL">Surgical Jackson-Pratt Drain Removal</option>
            <option value="DOPPLER_ULTRASOUND">Venous Doppler DVT Screening</option>
            <option value="CARDIAC_REHAB">Monitored Post-CABG Physical Rehab</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-1">
            Filters local providers by clinical capability
          </span>
        </div>

        {/* Transport Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-slate-500" />
            Transport Mode Modeled
          </label>
          <select
            value={transportMode}
            onChange={(e) => onChangeTransportMode(e.target.value as TransportMode)}
            disabled={isLoading}
            className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="DRIVING">Private Vehicle / Car (₹12/km)</option>
            <option value="PUBLIC_TRANSIT">Public Transit / Bus (₹3.50/km)</option>
            <option value="TAXI">Commercial Taxi / Cab (₹18/km)</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-1">
            Updates scenario-based travel cost rates
          </span>
        </div>

        {/* Member 2 Clinical Risk Simulation */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Clinical Urgency State (Member 2)
          </label>
          <select
            value={clinicalUrgencySimulation}
            onChange={(e) => onChangeClinicalUrgencySimulation(e.target.value as ClinicalUrgencyLevel)}
            disabled={isLoading}
            className={`w-full text-xs font-bold rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
              clinicalUrgencySimulation === 'CRITICAL'
                ? 'border-red-500 bg-red-50 text-red-900'
                : clinicalUrgencySimulation === 'HIGH'
                ? 'border-amber-500 bg-amber-50 text-amber-900'
                : clinicalUrgencySimulation === 'UNASSESSED_OR_MISSING'
                ? 'border-purple-500 bg-purple-50 text-purple-900'
                : 'border-slate-300 bg-white text-slate-900'
            }`}
          >
            <option value="LOW">Low Risk (Stable healing)</option>
            <option value="MODERATE">Moderate Risk (Mild localized symptoms)</option>
            <option value="HIGH">High Risk (Requires close vigilance)</option>
            <option value="CRITICAL">CRITICAL (Trigger Emergency Escalation)</option>
            <option value="UNASSESSED_OR_MISSING">Unassessed / Missing Risk (Safety Test)</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-1">
            Tests safety circuit-breaker behavior
          </span>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onRunComparison}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Computing Travel Options...
            </>
          ) : (
            'Re-evaluate Follow-Up Destinations'
          )}
        </button>
      </div>
    </div>
  );
}
