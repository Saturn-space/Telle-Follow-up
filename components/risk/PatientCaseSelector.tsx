'use client';

import React from 'react';
import { SEEDED_PATIENT_CASES } from '@/lib/risk/store';
import { User, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PatientRecoveryInput } from '@/lib/risk/types';

interface Props {
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  currentInput: PatientRecoveryInput;
  onUpdateInput: (updated: PatientRecoveryInput) => void;
  onEvaluate: () => void;
  isLoading: boolean;
}

export function PatientCaseSelector({
  selectedPatientId,
  onSelectPatient,
  currentInput,
  onUpdateInput,
  onEvaluate,
  isLoading,
}: Props) {
  const cases = Object.values(SEEDED_PATIENT_CASES);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Member 1 Upstream Data Integration
          </span>
          <span className="text-xs font-medium text-slate-500">
            Synthetic Clinical Fixtures
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mt-1">
          Select Post-Surgical Patient Recovery Case
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Choose a synthetic post-operative profile or adjust vital signs below to evaluate deterministic rules &amp; AI explanations.
        </p>
      </div>

      {/* Preset Case Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cases.map((c) => {
          const isSelected = c.patientId === selectedPatientId;
          const isCritical = c.patientId === 'pat_cabg_03';
          const isModerate = c.patientId === 'pat_tka_02';

          return (
            <div
              key={c.patientId}
              onClick={() => onSelectPatient(c.patientId)}
              className={`p-3.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{c.patientName}</span>
                  {isCritical ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                      Critical Red Flag
                    </span>
                  ) : isModerate ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-amber-600" />
                      Moderate Fever
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                      Normal Healing
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700">{c.procedureName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Post-Op Day {c.postOpDay} • {c.originalHospital}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Temp: {c.vitals.temperatureC ?? 'N/A'}°C</span>
                <span>HR: {c.vitals.heartRate ?? 'N/A'} bpm</span>
                <span>SpO2: {c.vitals.oxygenSat ?? 'N/A'}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editable Parameters Strip */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Observation Adjuster (Test Physiological Boundary Cases)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Log ID: {currentInput.recoveryLogId}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Temp (°C)</label>
            <input
              type="number"
              step="0.1"
              value={currentInput.vitals.temperatureC ?? ''}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  vitals: {
                    ...currentInput.vitals,
                    temperatureC: e.target.value === '' ? null : parseFloat(e.target.value),
                  },
                })
              }
              placeholder="e.g. 37.0"
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Heart Rate (bpm)</label>
            <input
              type="number"
              value={currentInput.vitals.heartRate ?? ''}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  vitals: {
                    ...currentInput.vitals,
                    heartRate: e.target.value === '' ? null : parseInt(e.target.value),
                  },
                })
              }
              placeholder="e.g. 75"
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Systolic BP</label>
            <input
              type="number"
              value={currentInput.vitals.systolicBP ?? ''}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  vitals: {
                    ...currentInput.vitals,
                    systolicBP: e.target.value === '' ? null : parseInt(e.target.value),
                  },
                })
              }
              placeholder="e.g. 120"
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">SpO2 (%)</label>
            <input
              type="number"
              value={currentInput.vitals.oxygenSat ?? ''}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  vitals: {
                    ...currentInput.vitals,
                    oxygenSat: e.target.value === '' ? null : parseInt(e.target.value),
                  },
                })
              }
              placeholder="e.g. 98"
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Pain Score (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={currentInput.painScore}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  painScore: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                })
              }
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Post-Op Day</label>
            <input
              type="number"
              min="0"
              value={currentInput.postOpDay}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  postOpDay: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Symptoms and Wound notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Reported Symptoms</label>
            <input
              type="text"
              value={currentInput.symptoms.join(', ')}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  symptoms: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="e.g. Mild pain, nausea, active bleeding"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Incision &amp; Wound Site</label>
            <input
              type="text"
              value={currentInput.woundDescription ?? ''}
              onChange={(e) =>
                onUpdateInput({
                  ...currentInput,
                  woundDescription: e.target.value,
                })
              }
              placeholder="e.g. Incision clean, dry, intact"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Trigger Evaluation Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Safety Rule:</span> Critical indicators immediately trigger emergency escalation overriding distance/cost analysis.
        </div>

        <button
          onClick={onEvaluate}
          disabled={isLoading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          {isLoading ? 'Running Risk Assessment...' : 'Run Clinical Risk Assessment'}
        </button>
      </div>
    </div>
  );
}
