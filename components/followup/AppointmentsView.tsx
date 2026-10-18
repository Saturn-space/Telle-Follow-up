'use client';

import React, { useState } from 'react';
import {
  Appointment,
  FollowUpPlan,
  Provider,
  Patient,
  UserRole,
} from '@/lib/types/followup';
import {
  Calendar,
  Clock,
  Video,
  Hospital,
  AlertCircle,
  PlusCircle,
  XCircle,
  RefreshCw,
  CheckCircle,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface AppointmentsViewProps {
  appointments: Appointment[];
  plans: FollowUpPlan[];
  providers: Provider[];
  patient: Patient;
  userRole: UserRole;
  selectedPlanId?: string | null;
  onRefresh: () => void;
  onJoinTeleconsult: (sessionRoomName: string, appointmentId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  plans,
  providers,
  patient,
  userRole,
  selectedPlanId,
  onRefresh,
  onJoinTeleconsult,
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);

  // Form states
  const [planId, setPlanId] = useState(selectedPlanId || plans[0]?.id || '');
  const [type, setType] = useState<
    'TELECONSULTATION' | 'LOCAL_CLINIC_VISIT' | 'DIAGNOSTIC_LAB' | 'HOSPITAL_RETURN'
  >('TELECONSULTATION');
  const [providerId, setProviderId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const openScheduleModal = () => {
    const s = new Date(Date.now() + 86400000 * 3);
    const e = new Date(s.getTime() + 1800000);
    setStartTime(s.toISOString().slice(0, 16));
    setEndTime(e.toISOString().slice(0, 16));
    setShowScheduleModal(true);
  };
  const [locationOrService, setLocationOrService] = useState('Encrypted Video Suite');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [newRescheduleStart, setNewRescheduleStart] = useState('');
  const [newRescheduleEnd, setNewRescheduleEnd] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAppointments = selectedPlanId
    ? appointments.filter((a) => a.planId === selectedPlanId)
    : appointments;

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/followup/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planId || plans[0]?.id,
          patientId: patient.id,
          type,
          providerId: type === 'LOCAL_CLINIC_VISIT' || type === 'DIAGNOSTIC_LAB' ? providerId || undefined : undefined,
          scheduledStartTime: new Date(startTime).toISOString(),
          scheduledEndTime: new Date(endTime).toISOString(),
          locationOrService:
            type === 'LOCAL_CLINIC_VISIT' && providerId
              ? providers.find((p) => p.id === providerId)?.name || locationOrService
              : locationOrService,
          clinicalNotes: clinicalNotes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to schedule appointment');

      setShowScheduleModal(false);
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Scheduling error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelAppt) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/followup/appointments/${cancelAppt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellationReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to cancel appointment');

      setCancelAppt(null);
      setCancellationReason('');
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Cancellation error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppt) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/followup/appointments/${rescheduleAppt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESCHEDULED',
          newStartTime: new Date(newRescheduleStart).toISOString(),
          newEndTime: new Date(newRescheduleEnd).toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to reschedule appointment');

      setRescheduleAppt(null);
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Reschedule error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#DCE5F5] shadow-xs">
        <div>
          <h3 className="text-base font-bold text-[#0E1C30]">
            Appointments & Follow-Up Tasks
          </h3>
          <p className="text-xs text-[#536078]">
            Coordinated care tasks for {patient.name} • {filteredAppointments.length} total visits
          </p>
        </div>

        {plans.length > 0 && (
          <button
            type="button"
            onClick={openScheduleModal}
            className="flex items-center gap-1.5 bg-[#1745D8] hover:bg-[#1238B5] text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Schedule Follow-Up Task</span>
          </button>
        )}
      </div>

      {/* Appointment Timeline List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No Appointments Scheduled</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a teleconsultation session or schedule a local clinic check for suture care or diagnostic tests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isTele = appt.type === 'TELECONSULTATION';
            const isCompleted = appt.status === 'COMPLETED';
            const isCancelled = appt.status === 'CANCELLED';

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-xl p-4 border transition-all ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/50'
                    : isCancelled
                    ? 'border-red-200 bg-red-50/20 opacity-80'
                    : 'border-slate-200 hover:border-teal-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isTele
                          ? 'bg-cyan-100 text-cyan-700'
                          : appt.type === 'DIAGNOSTIC_LAB'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-teal-100 text-teal-700'
                      }`}
                    >
                      {isTele ? <Video className="w-5 h-5" /> : <Hospital className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">
                          {appt.locationOrService}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            appt.status === 'CONFIRMED'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : appt.status === 'COMPLETED'
                              ? 'bg-slate-200 text-slate-700'
                              : appt.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {appt.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.2 rounded">
                          {appt.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(appt.scheduledStartTime).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(appt.scheduledStartTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(appt.scheduledEndTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {appt.clinicalNotes && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                          <strong>Clinical Instructions:</strong> {appt.clinicalNotes}
                        </p>
                      )}

                      {appt.cancellationReason && (
                        <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                          <strong>Cancellation Reason:</strong> {appt.cancellationReason}
                        </p>
                      )}

                      {appt.outcomeRecord && (
                        <div className="mt-2 text-xs bg-emerald-50 text-emerald-900 p-2.5 rounded border border-emerald-200">
                          <div className="font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Consultation Completed & Signed by {appt.outcomeRecord.clinicianId}
                          </div>
                          <p className="mt-1">
                            <strong>Subjective:</strong> {appt.outcomeRecord.subjectiveNotes}
                          </p>
                          <p className="mt-0.5">
                            <strong>Assessment & Plan:</strong> {appt.outcomeRecord.assessmentPlan}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isTele && !isCompleted && !isCancelled && appt.teleSession && (
                      <button
                        type="button"
                        onClick={() => onJoinTeleconsult(appt.teleSession!.roomName, appt.id)}
                        className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Launch Video Room</span>
                      </button>
                    )}

                    {!isCompleted && !isCancelled && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleAppt(appt);
                            setNewRescheduleStart(
                              new Date(appt.scheduledStartTime).toISOString().slice(0, 16)
                            );
                            setNewRescheduleEnd(
                              new Date(appt.scheduledEndTime).toISOString().slice(0, 16)
                            );
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 cursor-pointer"
                          title="Reschedule"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelAppt(appt)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg border border-slate-200 cursor-pointer"
                          title="Cancel"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Schedule Appointment */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Schedule Follow-Up Task</h3>
            <p className="text-xs text-slate-500 mb-4">
              Coordinate in-person visit or video consultation for {patient.name}.
            </p>

            {errorMessage && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Follow-Up Care Plan
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Appointment Modality / Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as typeof type;
                    setType(newType);
                    if (newType === 'TELECONSULTATION') {
                      setLocationOrService('Encrypted Jitsi Teleconsultation Suite');
                    } else if (newType === 'LOCAL_CLINIC_VISIT') {
                      setLocationOrService('Local Neighborhood Outpatient Clinic');
                    } else if (newType === 'DIAGNOSTIC_LAB') {
                      setLocationOrService('Diagnostic Blood / ECG Laboratory');
                    } else {
                      setLocationOrService(patient.operatingHospital);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  <option value="TELECONSULTATION">Teleconsultation (High-Definition Video)</option>
                  <option value="LOCAL_CLINIC_VISIT">Local Clinic Visit (Suture / Wound Care)</option>
                  <option value="DIAGNOSTIC_LAB">Diagnostic Lab (ECG / Blood Work)</option>
                  <option value="HOSPITAL_RETURN">Hospital Return (In-Person Tertiary Visit)</option>
                </select>
              </div>

              {(type === 'LOCAL_CLINIC_VISIT' || type === 'DIAGNOSTIC_LAB') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Local Provider (Healthcare Directory)
                  </label>
                  <select
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Choose verified local provider --</option>
                    {providers.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name} (~{pr.distanceKm} km) • {pr.verificationStatus}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Facility Name
                </label>
                <input
                  type="text"
                  required
                  value={locationOrService}
                  onChange={(e) => setLocationOrService(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Inspect drain output, review resting ECG..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Appointment */}
      {rescheduleAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reschedule Appointment</h3>
            <p className="text-xs text-slate-500 mb-4">{rescheduleAppt.locationOrService}</p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newRescheduleStart}
                  onChange={(e) => setNewRescheduleStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newRescheduleEnd}
                  onChange={(e) => setNewRescheduleEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleAppt(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Save New Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Appointment */}
      {cancelAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 text-red-600">
              Cancel Appointment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Please specify a documented clinical or administrative reason for cancelling this visit.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Patient feeling unwell, rescheduled to in-person review, or duplicate booking..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelAppt(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
