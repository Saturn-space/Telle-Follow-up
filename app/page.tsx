import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Stethoscope, 
  BrainCircuit, 
  FileText, 
  Calendar, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import TravelOptimizationDashboard from '@/components/travel/TravelOptimizationDashboard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header / Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Tele-Follow-Up Orchestrator</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Member 4 Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">An AI-Assisted Post-Surgical Follow-Up Coordination System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              Branch: feature/member-4-phase-5-maintenance
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Core Member 4 Vertical Slice */}
        <section id="member-4-travel-optimization">
          <TravelOptimizationDashboard />
        </section>

        {/* Five-Member Monorepo Architecture Overview */}
        <section className="pt-8 border-t border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Shared Monorepo Architecture & Cross-Module Contracts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Member 4 connects upstream patient recovery data (Member 1), clinical risk & escalation state (Member 2), and verified provider directories (Member 3) into follow-up care plans (Member 5).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Member 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">Member 1</span>
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Patient & Recovery</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies origin coordinates, days post-op, and surgical history.
              </p>
              <div className="mt-2 text-[10px] font-mono text-teal-700 bg-teal-50/50 p-1 rounded">
                Ingested in M4
              </div>
            </div>

            {/* Member 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Member 2</span>
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">AI Risk & Escalation</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies clinical urgency level & red flags. Triggers emergency override.
              </p>
              <div className="mt-2 text-[10px] font-mono text-indigo-700 bg-indigo-50/50 p-1 rounded">
                Active Safety Gate
              </div>
            </div>

            {/* Member 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Member 3</span>
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Provider Directory</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supplies verified clinic coordinates and surgical capability tags.
              </p>
              <div className="mt-2 text-[10px] font-mono text-sky-700 bg-sky-50/50 p-1 rounded">
                Reused Coordinates
              </div>
            </div>

            {/* Member 4 (Active) */}
            <div className="bg-amber-50/60 rounded-xl border-2 border-amber-400 p-4 shadow-sm ring-1 ring-amber-400/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Member 4 (Implemented)</span>
                <MapPin className="w-4 h-4 text-amber-700" />
              </div>
              <h4 className="font-bold text-amber-950 text-xs mb-1">Travel Optimization</h4>
              <p className="text-[11px] text-amber-800 leading-snug">
                Leaflet GIS, OSRM routing, transparent costs, and safety escalation.
              </p>
              <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-200/50 p-1 rounded text-center">
                Phase 2 Core Complete
              </div>
            </div>

            {/* Member 5 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Member 5</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Care Plans & Jitsi</h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Consumes selected follow-up destination for appointment booking.
              </p>
              <div className="mt-2 text-[10px] font-mono text-emerald-700 bg-emerald-50/50 p-1 rounded">
                Ready for Handoff
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
