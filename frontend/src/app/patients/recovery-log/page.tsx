'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT DAILY RECOVERY LOG SUBMISSION (MODULE 1)
// Connects to Module 2 Risk Evaluation upon submission
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api-client';
import {
  ClipboardList,
  Activity,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export default function PatientRecoveryLogPage() {
  const { user } = useAuth();
  const patientId = user?.role === 'PATIENT' ? user.id : 'pat-101';

  const [temperatureC, setTemperatureC] = useState<number>(37.1);
  const [heartRate, setHeartRate] = useState<number>(78);
  const [systolicBP, setSystolicBP] = useState<number>(120);
  const [diastolicBP, setDiastolicBP] = useState<number>(80);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(16);
  const [oxygenSat, setOxygenSat] = useState<number>(98);
  const [painScore, setPainScore] = useState<number>(3);
  const [symptomsInput, setSymptomsInput] = useState<string>('Mild incision tenderness');
  const [woundDescription, setWoundDescription] = useState<string>(
    'Clean, dry, edges well-approximated'
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const payload = {
      patientId,
      postOpDay: 14,
      logTimestamp: new Date().toISOString(),
      vitals: {
        temperatureC: Number(temperatureC),
        heartRate: Number(heartRate),
        systolicBP: Number(systolicBP),
        diastolicBP: Number(diastolicBP),
        respiratoryRate: Number(respiratoryRate),
        oxygenSat: Number(oxygenSat),
      },
      painScore: Number(painScore),
      symptoms: symptomsInput.split(',').map((s) => s.trim()).filter(Boolean),
      woundDescription,
      enableAiExplanation: true,
    };

    try {
      // Cross-Module Call to Backend: Ingests telemetry and triggers M2 Risk Engine
      const res = await apiClient.post(`/api/v1/patients/${patientId}/recovery-log`, payload);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit recovery telemetry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-teal-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-1">
          <ClipboardList className="w-4 h-4" />
          <span>Recovery Tracker • Patient Data Intake</span>
          <span>•</span>
          <span>Daily Telemetry Submission</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Recovery Telemetry Log</h1>
        <p className="text-sm text-teal-100 mt-1">
          Record your vital signs and recovery observations. Submissions are instantly evaluated by the AI Risk Stratification Engine (Module 2).
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Telemetry Ingested &amp; AI Risk Evaluated Successfully</span>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              result.isHighRisk
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                Risk Engine Stratification Result
              </div>
              <div className="text-base font-black mt-0.5">
                Risk Tier: {result.riskAssessment?.riskLevel || 'LOW'}
              </div>
              <p className="text-xs mt-1 max-w-xl text-slate-700">
                {result.riskAssessment?.clinicalSummary}
              </p>
            </div>

            {result.isHighRisk ? (
              <Link
                href={`/travel-comparison/${patientId}`}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 flex items-center gap-1.5 transition"
              >
                <span>Travel Escalation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Healing On Track
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Physiological Vital Signs
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Body Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              required
              value={temperatureC}
              onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Heart Rate (bpm)</label>
            <input
              type="number"
              required
              value={heartRate}
              onChange={(e) => setHeartRate(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Blood Pressure (Systolic)</label>
            <input
              type="number"
              required
              value={systolicBP}
              onChange={(e) => setSystolicBP(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Blood Pressure (Diastolic)</label>
            <input
              type="number"
              required
              value={diastolicBP}
              onChange={(e) => setDiastolicBP(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Respiratory Rate (/min)</label>
            <input
              type="number"
              required
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Oxygen Saturation (%)</label>
            <input
              type="number"
              step="0.1"
              required
              value={oxygenSat}
              onChange={(e) => setOxygenSat(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>
        </div>

        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 pt-2">
          Symptoms &amp; Wound Assessment
        </h2>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Pain Severity Score (0 - 10)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                value={painScore}
                onChange={(e) => setPainScore(parseInt(e.target.value))}
                className="flex-1 accent-teal-600 cursor-pointer"
              />
              <span className="font-bold text-sm w-8 text-center text-slate-900 bg-slate-100 py-1 rounded">
                {painScore}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Reported Symptoms (comma separated)</label>
            <input
              type="text"
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              placeholder="e.g. Incision redness, fever, dizziness"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Surgical Wound Appearance</label>
            <textarea
              rows={3}
              value={woundDescription}
              onChange={(e) => setWoundDescription(e.target.value)}
              placeholder="Describe dressing cleanliness, discharge, or localized swelling..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Activity className="w-4 h-4" />
          {isSubmitting ? 'Evaluating with Risk Engine...' : 'Submit Telemetry & Run AI Evaluation'}
        </button>
      </form>
    </div>
  );
}
