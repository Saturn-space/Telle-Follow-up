'use client';

import React from 'react';
import { User, Activity, ArrowRight } from 'lucide-react';

interface PatientOption {
  patientId: string;
  name: string;
  surgeryType: string;
  daysPostOp: number;
}

interface Props {
  patients: PatientOption[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  onEvaluate: () => void;
  isLoading: boolean;
  canEvaluate: boolean;
}

export function PatientCaseSelector({ patients, selectedPatientId, onSelectPatient, onEvaluate, isLoading, canEvaluate }: Props) {
  return (
    <div className="bg-white rounded-3xl border border-[#DCE5F5] p-6 sm:p-8 shadow-xs space-y-5">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Patient Clinical Intake</span>
        <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2"><User className="h-5 w-5 text-teal-600" />Select an authorized patient record</h3>
        <p className="text-xs text-slate-500 mt-1">Assessment runs only against the latest recovery entry saved for this patient.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-xs font-semibold text-slate-700">Patient record
          <select value={selectedPatientId} onChange={(event) => onSelectPatient(event.target.value)} disabled={isLoading || patients.length === 0} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {patients.length === 0 && <option value="">No accessible patient records</option>}
            {patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} · {patient.surgeryType}</option>)}
          </select>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Post-operative day:</span> {patients.find((patient) => patient.patientId === selectedPatientId)?.daysPostOp ?? 'Not recorded'}
          <p className="mt-1">If the record needs updating, use the patient recovery log before creating an assessment.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onEvaluate} disabled={isLoading || !selectedPatientId || !canEvaluate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Activity className="h-4 w-4" />{isLoading ? 'Assessing saved recovery entry…' : 'Assess latest saved recovery entry'}<ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
