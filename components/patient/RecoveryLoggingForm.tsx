'use client';

// components/patient/RecoveryLoggingForm.tsx
import React, { useState } from 'react';
import { RecoveryEntry, UserRole } from '@/lib/types/patient';
import { Activity, Thermometer, Heart, AlertTriangle, CheckCircle, Plus } from 'lucide-react';

interface Props {
  patientId: string;
  activeRole: UserRole;
  onObservationAdded: (entry: RecoveryEntry) => void;
}

export function RecoveryLoggingForm({ patientId, activeRole, onObservationAdded }: Props) {
  const [painScore, setPainScore] = useState<number>(3);
  const [mobilityStatus, setMobilityStatus] = useState<string>('Assisted (Walker/Cane)');
  const [woundCondition, setWoundCondition] = useState<string>('Clean/Dry');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Vitals
  const [tempC, setTempC] = useState<string>('36.8');
  const [heartRate, setHeartRate] = useState<string>('74');
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [spO2, setSpO2] = useState<string>('98');
  const [drainMl, setDrainMl] = useState<string>('5');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const symptomOptions = [
    { id: 'fever_feeling', label: 'Feeling feverish / Chills' },
    { id: 'erythema', label: 'Spreading redness around incision' },
    { id: 'drainage', label: 'Drainage or fluid oozing' },
    { id: 'stiffness', label: 'Joint / Muscular stiffness' },
    { id: 'calf_pain', label: 'Unilateral calf pain or swelling' },
    { id: 'dyspnea', label: 'Shortness of breath' },
    { id: 'nausea', label: 'Nausea or loss of appetite' },
  ];

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getPainAnchor = (score: number) => {
    if (score === 0) return { label: 'No Pain', color: 'text-emerald-700 bg-emerald-50' };
    if (score <= 3) return { label: 'Mild Pain (Tolerable)', color: 'text-teal-700 bg-teal-50' };
    if (score <= 6) return { label: 'Moderate Pain (Interferes with tasks)', color: 'text-amber-700 bg-amber-50' };
    if (score <= 8) return { label: 'Severe Pain (Hard to concentrate)', color: 'text-orange-700 bg-orange-50' };
    return { label: 'Extreme / Debilitating Pain', color: 'text-rose-700 bg-rose-50' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        painScore: Number(painScore),
        mobilityStatus,
        woundCondition,
        symptoms: selectedSymptoms,
        patientNotes: notes.trim() || undefined,
        reportedByRole: activeRole,
        recordedAt: new Date().toISOString(),
        vitals: {
          temperatureC: tempC ? parseFloat(tempC) : null,
          heartRateBpm: heartRate ? parseInt(heartRate, 10) : null,
          systolicBp: systolic ? parseInt(systolic, 10) : null,
          diastolicBp: diastolic ? parseInt(diastolic, 10) : null,
          spO2Percent: spO2 ? parseInt(spO2, 10) : null,
          drainOutputMl: drainMl ? parseFloat(drainMl) : null,
        },
      };

      const res = await fetch(`/api/v1/patients/${patientId}/recovery-observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record recovery observation');
      }

      onObservationAdded(json.data);
      setSuccess(true);
      setNotes('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error logging recovery entry');
    } finally {
      setLoading(false);
    }
  };

  const currentPain = getPainAnchor(painScore);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Post-Surgical Recovery Observation Entry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Logging recovery metrics as <span className="font-semibold text-slate-800">{activeRole}</span>. Data feeds into the clinical timeline and Member 2 AI Risk Evaluation.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          Observation recorded successfully. Added to chronological recovery stream.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Pain Rating Scale */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Pain Rating Scale (NRS 0–10)
            </label>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentPain.color}`}>
              Score: {painScore}/10 • {currentPain.label}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={painScore}
            onChange={(e) => setPainScore(parseInt(e.target.value, 10))}
            className="mt-3 w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
            <span>0 (None)</span>
            <span>2</span>
            <span>4</span>
            <span>6</span>
            <span>8</span>
            <span>10 (Worst)</span>
          </div>
        </div>

        {/* Mobility & Wound Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobility Status *
            </label>
            <select
              value={mobilityStatus}
              onChange={(e) => setMobilityStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="Independent (Full Weight-bearing)">Independent (Full Weight-bearing)</option>
              <option value="Assisted (Walker/Cane)">Assisted (Walker/Cane)</option>
              <option value="Non-Weight-Bearing (Crutches)">Non-Weight-Bearing (Crutches)</option>
              <option value="Wheelchair Bound">Wheelchair Bound</option>
              <option value="Bedbound">Bedbound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Wound / Incision Status *
            </label>
            <select
              value={woundCondition}
              onChange={(e) => setWoundCondition(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="Clean/Dry (Approximated)">Clean/Dry (Approximated)</option>
              <option value="Mild Erythema (<5mm border)">Mild Erythema (&lt;5mm border)</option>
              <option value="Serosanguinous Drainage (Minimal)">Serosanguinous Drainage (Minimal)</option>
              <option value="Purulent Drainage (Odor/Yellow)">Purulent Drainage (Odor/Yellow)</option>
              <option value="Localized Warmth & Swelling">Localized Warmth &amp; Swelling</option>
              <option value="Incision Edge Separation / Dehiscence">Incision Edge Separation / Dehiscence</option>
            </select>
          </div>
        </div>

        {/* Symptoms Checklist */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Active Symptoms / Physical Discomforts
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {symptomOptions.map((sym) => {
              const active = selectedSymptoms.includes(sym.id);
              return (
                <button
                  type="button"
                  key={sym.id}
                  onClick={() => toggleSymptom(sym.id)}
                  className={`px-3 py-2 text-xs rounded-lg border text-left font-medium transition-colors flex items-center justify-between ${
                    active
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{sym.label}</span>
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                      active ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {active ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Objective Vital Measurements
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={tempC}
                onChange={(e) => setTempC(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="36.8"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="74"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="120"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                SpO2 Saturation (%)
              </label>
              <input
                type="number"
                value={spO2}
                onChange={(e) => setSpO2(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="98"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Drain Output (ml)
              </label>
              <input
                type="number"
                step="1"
                value={drainMl}
                onChange={(e) => setDrainMl(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="5"
              />
            </div>
          </div>
        </div>

        {/* Qualitative Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Qualitative Observations / Recovery Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            placeholder="Describe physical activity tolerance, incision dressing appearance, response to oral analgesics, or sleep quality..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Submitting Observation...' : 'Submit Recovery Observation'}
          </button>
        </div>
      </form>
    </div>
  );
}
