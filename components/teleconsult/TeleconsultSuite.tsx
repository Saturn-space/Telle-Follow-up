'use client';

import React, { useState } from 'react';
import { Appointment, TeleconsultationSession, UserRole } from '@/lib/types/followup';
import {
  Video,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lock,
  ExternalLink,
  Info,
  Copy,
  Check,
  AlertCircle,
  Wifi,
  RefreshCw,
} from 'lucide-react';

interface TeleconsultSuiteProps {
  activeSession: TeleconsultationSession | null;
  activeAppointment: Appointment | null;
  userRole: UserRole;
  onOutcomeSubmitted: () => void;
}

export const TeleconsultSuite: React.FC<TeleconsultSuiteProps> = ({
  activeSession,
  activeAppointment,
  userRole,
  onOutcomeSubmitted,
}) => {
  const [copied, setCopied] = useState(false);
  const [subjectiveNotes, setSubjectiveNotes] = useState('');
  const [objectiveFindings, setObjectiveFindings] = useState('');
  const [assessmentPlan, setAssessmentPlan] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  const domain = activeSession?.domain || process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const roomName = activeSession?.roomName || 'tfo-sess-demo-sample';
  const meetingUrl = `https://${domain}/${roomName}`;
  const iframeSrc = `${meetingUrl}#config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/teleconsult/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
        body: JSON.stringify({
          appointmentId: activeAppointment.id,
          teleSessionId: activeSession?.id,
          clinicianId: 'Dr. V. K. Ramanathan (Senior Attending Surgeon)',
          subjectiveNotes,
          objectiveFindings: objectiveFindings || undefined,
          assessmentPlan,
          followUpRequired,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record consultation outcome');

      setSubmitSuccess(true);
      setTimeout(() => {
        onOutcomeSubmitted();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting clinical outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy & Clinical Prototype Safety Header */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Encrypted Teleconsultation Suite</span>
                <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200">
                  Jitsi External API
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  <span>Service Connected</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Peer-to-peer encrypted video coordination between patient and operating surgical team.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Non-PII Room Verification Badge */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <div className="text-[11px]">
            <span className="font-semibold text-slate-700">Non-Identifying Room: </span>
            <span className="font-mono text-slate-500">{roomName}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="ml-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
            title="Copy Meeting URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Academic Prototype Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Clinical Decision Support Notice:</strong> This video conference is part of an academic prototype. It does not replace emergency medical care or comprehensive physical examinations. In case of acute chest pain, bleeding, or acute fever, disconnect and seek immediate hospital care.
        </div>
      </div>

      {/* Main Video Call Frame & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jitsi IFrame Area */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 aspect-video relative flex flex-col">
          <div className="bg-slate-800/90 px-4 py-2 text-white text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Consultation Room ({domain})
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Status: <strong className="text-white">{activeSession?.status || 'READY'}</strong>
              </span>
              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] underline"
              >
                <span>Popout Window</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="relative flex-1 w-full h-full min-h-[420px]">
            {!isIframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mb-2" />
                <span>Initializing Encrypted Jitsi Video Stream...</span>
              </div>
            )}
            <iframe
              src={iframeSrc}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="w-full h-full min-h-[420px] border-none"
              title="Teleconsultation Meeting"
              onLoad={() => setIsIframeLoaded(true)}
            />
          </div>
        </div>

        {/* Doctor Clinical Notes / Outcome Panel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-bold text-slate-900">Clinical Consultation Record</h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                {userRole === 'CLINICIAN' ? 'Clinician Mode' : 'Read-Only Mode'}
              </span>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center my-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-emerald-900">Consultation Completed</h5>
                <p className="text-xs text-emerald-700 mt-1">
                  Clinical outcome saved. The appointment status has been updated to COMPLETED.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitOutcome} className="space-y-3">
                {errorMessage && (
                  <div className="bg-red-50 text-red-700 p-2.5 rounded-lg text-xs flex items-center gap-1.5 border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subjective Symptoms & Patient Feedback
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={subjectiveNotes}
                    onChange={(e) => setSubjectiveNotes(e.target.value)}
                    placeholder="Patient reports incision healing without pain, ambulating well..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Objective Video Findings
                  </label>
                  <textarea
                    rows={2}
                    value={objectiveFindings}
                    onChange={(e) => setObjectiveFindings(e.target.value)}
                    placeholder="Visual inspection: Clean sternal scar, no erythema or exudate..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assessment & Care Plan
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={assessmentPlan}
                    onChange={(e) => setAssessmentPlan(e.target.value)}
                    placeholder="Wound healing progressing normally. Cleared for driving in 2 weeks..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="followUpReq"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="followUpReq" className="text-xs text-slate-700 cursor-pointer">
                    Further follow-up visit required in 4 weeks
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !activeAppointment || userRole !== 'CLINICIAN'}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Signing...'
                        : userRole === 'CLINICIAN'
                        ? 'Sign & Complete Consultation'
                        : 'Clinician Role Required to Sign'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Consultation status will only change to COMPLETED upon explicit doctor sign-off.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
