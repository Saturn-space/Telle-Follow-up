'use client';

import React, { useState } from 'react';
import {
  FollowUpPlan,
  Patient,
  RiskAssessment,
  TravelComparison,
  UserRole,
} from '@/lib/types/followup';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  FileText,
  MapPin,
  Hospital,
  AlertCircle,
} from 'lucide-react';

interface FollowUpPlanViewProps {
  plans: FollowUpPlan[];
  patient: Patient;
  riskAssessment?: RiskAssessment;
  travelComparison?: TravelComparison;
  userRole: UserRole;
  onRefresh: () => void;
  onSelectPlanForAppointments: (planId: string) => void;
}

export const FollowUpPlanView: React.FC<FollowUpPlanViewProps> = ({
  plans,
  patient,
  riskAssessment,
  travelComparison,
  userRole,
  onRefresh,
  onSelectPlanForAppointments,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [startDate, setStartDate] = useState('');

  const openCreateModal = () => {
    setStartDate(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16));
    setShowCreateModal(true);
  };

  const isHighRisk = riskAssessment?.riskTier === 'HIGH';
  const isEscalated = travelComparison?.isEscalated || isHighRisk;

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/followup/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          title,
          clinicalSummary,
          startDate: new Date(startDate).toISOString(),
          riskAssessmentId: riskAssessment?.id,
          travelComparisonId: travelComparison?.id,
          approvedByClinician:
            userRole === 'CLINICIAN' ? patient.surgeonName || 'Attending Clinician' : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create plan.');
      }

      setShowCreateModal(false);
      setTitle('');
      setClinicalSummary('');
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Header Summary Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                {patient.mrn}
              </span>
              <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
                {patient.age}y • {patient.gender}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-1.5">
              <Hospital className="w-4 h-4 text-slate-400" />
              <span>{patient.surgeryProcedure}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{patient.operatingHospital}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Home: {patient.homeCity}, {patient.homeState}</span>
              <span className="text-slate-400">•</span>
              <span>Discharged: {new Date(patient.dischargeDate).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEscalated ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs flex items-center gap-2 max-w-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                <span>
                  <strong>Escalated Safety Protocol:</strong> Routine travel optimization is bypassed due to high risk.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Follow-Up Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cross-Module Clinical Decision Support Context Pill */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Member 2 Risk Snapshot */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Member 2 • AI Risk Stratification
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                riskAssessment?.riskTier === 'HIGH'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : riskAssessment?.riskTier === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {riskAssessment?.riskTier || 'LOW'} RISK ({Math.round((riskAssessment?.riskScore || 0) * 100)}%)
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {riskAssessment?.summaryRationale || 'Patient vital trends and recovery data stable.'}
          </p>
          {riskAssessment?.doctorNotes && (
            <p className="text-[11px] text-teal-800 bg-teal-50/70 p-2 rounded mt-2 border border-teal-100">
              <strong>Clinician Sign-off:</strong> {riskAssessment.doctorNotes}
            </p>
          )}
        </div>

        {/* Member 4 Travel Optimization Snapshot */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              Member 4 • Travel Feasibility
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                travelComparison?.isEscalated
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {travelComparison?.recommendedOption.replace(/_/g, ' ') || 'LOCAL & TELECONSULT'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {travelComparison?.recommendationRationale ||
              'Local clinic follow-up prevents excessive interstate travel distress.'}
          </p>
          {travelComparison && !travelComparison.isEscalated && (
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-mono">
              <span>Saved Dist: ~{travelComparison.roundTripDistanceKm} km</span>
              <span>•</span>
              <span>Avoided Transit: ~{travelComparison.estimatedTravelHours} hrs</span>
              <span>•</span>
              <span>Saved Est: ~₹{travelComparison.estimatedCostInr}</span>
            </div>
          )}
        </div>
      </div>

      {/* Follow-Up Plans List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Active & Historical Follow-Up Plans ({plans.length})</span>
          <span className="text-xs font-normal text-slate-500">
            Click a plan to manage appointments & video consults
          </span>
        </h3>

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No Follow-Up Plans Created</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create a personalized post-discharge follow-up care plan to coordinate local clinic visits and teleconsultations.
            </p>
            {!isEscalated && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {plans.map((plan) => {
              const appts = plan.appointments || [];
              const teleAppts = appts.filter((a) => a.type === 'TELECONSULTATION');
              const localAppts = appts.filter((a) => a.type === 'LOCAL_CLINIC_VISIT' || a.type === 'DIAGNOSTIC_LAB');

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 hover:border-teal-300 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{plan.id}</span>
                        <h4 className="text-base font-bold text-slate-900">{plan.title}</h4>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            plan.status === 'ACTIVE'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : plan.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {plan.clinicalSummary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectPlanForAppointments(plan.id)}
                      className="bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors shrink-0 cursor-pointer"
                    >
                      View & Manage Appointments ({appts.length})
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Start: {new Date(plan.startDate).toLocaleDateString()}
                      </span>
                      {plan.approvedByClinician && (
                        <span className="flex items-center gap-1 text-teal-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          Approved by {plan.approvedByClinician}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {teleAppts.length} Video Consults
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {localAppts.length} Local Procedures
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Follow-Up Plan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Create Follow-Up Coordination Plan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Defines the post-discharge recovery milestones and follow-up strategy for {patient.name}.
            </p>

            {errorMessage && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Post-CABG 3-Week Tele-Cardiology Review"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Summary & Goals
                </label>
                <textarea
                  required
                  rows={3}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  placeholder="Summarize required lab checks, suture evaluation, or video consultation targets..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600 space-y-1 border border-slate-200">
                <p>
                  <strong>Patient Risk Tier:</strong> {riskAssessment?.riskTier || 'LOW'}
                </p>
                <p>
                  <strong>Recommended Modality:</strong>{' '}
                  {travelComparison?.recommendedOption.replace(/_/g, ' ') || 'LOCAL & TELECONSULT'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
