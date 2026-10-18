'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - PATIENT DAILY RECOVERY LOG SUBMISSION
// Modern Clinical Sanctuary Design System
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
  HeartPulse,
  Thermometer,
  Wind,
  Gauge,
  Sparkles,
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
      const res = await apiClient.post(`/api/v1/patients/${patientId}/recovery-log`, payload);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit recovery telemetry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3">
            <ClipboardList className="w-4 h-4 text-[#89F5E7]" />
            <span>Biometric Telemetry Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Daily Recovery Telemetry Log</h1>
          <p className="text-sm text-[#C0CAFF] mt-2 max-w-2xl leading-relaxed">
            Record physiological vital signs and post-surgical wound observations. Data is ingested into PostgreSQL and instantly evaluated by the AI Risk Stratification CDS engine.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEB] border border-[#FFDAD6] text-[#B91C1C] text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-6 rounded-3xl bg-white border border-[#DCE5F5] shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-[#047857] font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-[#047857]" />
            <span>Telemetry Ingested &amp; AI Risk Evaluated Successfully</span>
          </div>

          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              result.isHighRisk
                ? 'bg-[#FEECEB] border-[#FFDAD6] text-[#B91C1C]'
                : 'bg-[#E6F8F2] border-[#A7F3D0] text-[#047857]'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider">
                Risk Engine Stratification Output
              </div>
              <div className="text-lg font-black mt-0.5">
                Risk Tier: {result.riskAssessment?.riskLevel || 'LOW'}
              </div>
              <p className="text-xs mt-1 max-w-xl text-[#0E1C30]/80">
                {result.riskAssessment?.clinicalSummary}
              </p>
            </div>

            {result.isHighRisk ? (
              <Link
                href={`/travel-comparison/${patientId}`}
                className="px-5 py-2.5 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#93000A] flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
              >
                <span>Travel Escalation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-white text-[#047857] border border-[#A7F3D0] shadow-2xs self-start sm:self-auto">
                Healing On Track
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#DCE5F5] p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1745D8] uppercase tracking-wider mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>Telemetry Inputs</span>
          </div>
          <h2 className="text-base font-bold text-[#0E1C30]">
            Physiological Vital Signs
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Body Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              required
              value={temperatureC}
              onChange={(e) => setTemperatureC(parseFloat(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>

          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Heart Rate (bpm)</label>
            <input
              type="number"
              required
              value={heartRate}
              onChange={(e) => setHeartRate(parseInt(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>

          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Blood Pressure (Systolic mmHg)</label>
            <input
              type="number"
              required
              value={systolicBP}
              onChange={(e) => setSystolicBP(parseInt(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>

          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Blood Pressure (Diastolic mmHg)</label>
            <input
              type="number"
              required
              value={diastolicBP}
              onChange={(e) => setDiastolicBP(parseInt(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>

          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Respiratory Rate (/min)</label>
            <input
              type="number"
              required
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(parseInt(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>

          <div>
            <label className="block text-[#536078] font-semibold mb-1.5">Oxygen Saturation (SpO2 %)</label>
            <input
              type="number"
              step="0.1"
              required
              value={oxygenSat}
              onChange={(e) => setOxygenSat(parseFloat(e.target.value))}
              className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] font-mono tnum focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#F0F3FF]">
          <h2 className="text-base font-bold text-[#0E1C30] mb-4">
            Symptoms &amp; Wound Assessment
          </h2>

          <div className="space-y-5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#536078] font-semibold">Pain Severity Score (0 - 10)</label>
                <span className="font-bold text-sm px-3 py-0.5 text-[#1745D8] bg-[#EDF3FF] border border-[#CBD9F2] rounded-full tnum">
                  {painScore} / 10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={painScore}
                onChange={(e) => setPainScore(parseInt(e.target.value))}
                className="w-full accent-[#1745D8] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[#536078] font-semibold mb-1.5">Reported Symptoms (comma separated)</label>
              <input
                type="text"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="e.g. Incision redness, fever, dizziness"
                className="w-full h-11 px-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
              />
            </div>

            <div>
              <label className="block text-[#536078] font-semibold mb-1.5">Surgical Wound Appearance</label>
              <textarea
                rows={3}
                value={woundDescription}
                onChange={(e) => setWoundDescription(e.target.value)}
                placeholder="Describe dressing cleanliness, discharge, or localized swelling..."
                className="w-full p-3.5 border border-[#DCE5F5] rounded-xl text-[#0E1C30] focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] transition"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 bg-[#1745D8] hover:bg-[#1238B5] text-white font-semibold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          <Activity className="w-4 h-4" />
          {isSubmitting ? 'Evaluating with Risk Engine...' : 'Submit Telemetry & Run AI Evaluation'}
        </button>
      </form>
    </div>
  );
}
