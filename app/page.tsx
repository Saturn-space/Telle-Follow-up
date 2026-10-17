import React from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Compass,
  FileText,
  HeartPulse,
  Hospital,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                Tele-Follow-Up Orchestrator
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                AI-Assisted Post-Surgical Follow-Up Coordination System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phase 4: Member 3 Release Verified & Hardened
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100 mb-4">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Patient-Centric Healthcare Coordination
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Coordinating Safe Post-Surgical Follow-Up Across Distances
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              When patients travel out-of-state for complex surgical procedures, repeated physical trips back to the surgical center introduce financial stress, recovery discomfort, and appointment attrition. 
              The Tele-Follow-Up Orchestrator integrates recovery monitoring, clinical risk stratification, local accredited care discovery, travel analysis, and teleconsultation into a unified, safety-first clinical workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Prioritizes Clinical Urgency Over Travel Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Human Clinician-in-the-Loop Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                <span>Traceable Audit History</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Hospital className="w-4 h-4" />
                Launch Member 3: Local Healthcare Discovery Engine
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/api/docs/openapi"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                View OpenAPI 3.0 Contract
              </Link>
            </div>
          </div>
        </div>

        {/* 5-Member Module Grid */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Five Vertical Module Architecture</h3>
              <p className="text-sm text-slate-500">
                End-to-end full-stack slices developed collaboratively across the shared repository
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Member 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  M1
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Patient & Intake
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Patient Registration & Recovery Monitoring
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Patient profiles, surgical history, discharge summaries, vital sign logging, OCR-assisted document ingestion, and reviewable clinical extraction pipelines.
              </p>
            </div>

            {/* Member 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  M2
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  AI Decision Support
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                AI Risk Prediction & Decision Support
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Post-operative recovery risk scoring, red flag symptom detection, explainable clinical rationale summaries, risk history, and mandatory human review workflows.
              </p>
            </div>

            {/* Member 3 */}
            <div className="bg-white rounded-xl border-2 border-teal-500/80 p-6 shadow-sm hover:border-teal-600 transition-colors ring-2 ring-teal-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  M3
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Phase 4 Release Ready & Verified
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Hospital className="w-4 h-4 text-emerald-600" />
                Local Healthcare Discovery & Coordination
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Local accredited clinic and hospital registry, specialty filtering, verified vs. seeded facility status flags, referral generation, and shared care coordination.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-700">Leaflet Map + REST APIs Active</span>
                <Link
                  href="/discovery"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-flex items-center gap-1"
                >
                  Open Module
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Member 4 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  M4
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Travel & Safety
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Travel Optimization & Clinical Escalation
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Interactive mapping, geocoded transit distances, travel cost/burden evaluation, multi-modal option comparison, and immediate high-risk clinical escalation paths.
              </p>
            </div>

            {/* Member 5 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  M5
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  Telehealth & Platform
                </span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                Follow-Up, Teleconsultation & Platform Integration
              </h4>
              <p className="mt-2 text-xs text-slate-600 leading-normal">
                Follow-up plan management, Jitsi Meet teleconsultation rooms, consultation documentation, notification alerts, optional payment processing, and end-to-end integration.
              </p>
            </div>

            {/* System Guardrails Card */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Clinical & Safety Invariants
                </div>
                <h4 className="text-base font-bold text-white mb-2">
                  Medical Decision Boundaries
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>AI outputs are decision-support only, never diagnostic.</li>
                  <li>Cost/travel savings never override clinical urgency.</li>
                  <li>All OCR and AI extractions require human clinician review.</li>
                  <li>High-risk red flags immediately trigger escalation.</li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Awaiting individual member prompts to begin vertical slice execution.
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-600" />
            End-to-End Orchestration Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 text-center">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 1</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Registration</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Patient & surgery intake</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 2</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Recovery Log</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Vitals & OCR reports</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 3</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Risk Stratification</p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI decision support</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 4</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Local Discovery</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Nearby verified clinics</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 5</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Travel Comparison</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Safety & transit trade-off</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 6</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Coordination</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Teleconsult / local booking</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-teal-600">Step 7</span>
              <p className="font-semibold text-xs text-slate-800 mt-1">Audit History</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Immutable record of care</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
