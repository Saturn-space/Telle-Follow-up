'use client';

// components/patient/DemoWalkthroughView.tsx
import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  Activity,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'OVERVIEW' | 'LOG_RECOVERY' | 'TIMELINE' | 'DOCUMENTS' | 'MEMBER2_CONTRACT') => void;
  onOpenNewPatient: () => void;
}

export function DemoWalkthroughView({ onNavigateTab, onOpenNewPatient }: Props) {
  const [securityTestResult, setSecurityTestResult] = useState<string | null>(null);
  const [testingSecurity, setTestingSecurity] = useState(false);

  const [validationTestResult, setValidationTestResult] = useState<string | null>(null);
  const [testingValidation, setTestingValidation] = useState(false);

  // Run live test of IDOR rejection
  const runIdorTest = async () => {
    setTestingSecurity(true);
    setSecurityTestResult(null);
    try {
      const res = await fetch('/api/v1/patients/pat-002', {
        headers: {
          'x-user-role': 'PATIENT',
          'x-patient-id': 'pat-001',
        },
      });
      const data = await res.json();
      if (res.status === 403) {
        setSecurityTestResult('✓ HTTP 403 Forbidden: IDOR cross-patient access blocked successfully.');
      } else {
        setSecurityTestResult(`Unexpected response: ${res.status}`);
      }
    } catch (err: unknown) {
      setSecurityTestResult(`Test error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setTestingSecurity(false);
    }
  };

  // Run live test of Hemodynamic Inverted BP rejection
  const runValidationTest = async () => {
    setTestingValidation(true);
    setValidationTestResult(null);
    try {
      const res = await fetch('/api/v1/patients/pat-001/recovery-observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painScore: 4,
          mobilityStatus: 'Assisted',
          woundCondition: 'Clean',
          vitals: { systolicBp: 80, diastolicBp: 120 }, // Invalid inverted BP
        }),
      });
      const data = await res.json();
      if (res.status === 400 && data.error?.message?.includes('Systolic blood pressure')) {
        setValidationTestResult(`✓ HTTP 400 Validation Error: Rejected invalid inverted BP (80/120 mmHg).`);
      } else {
        setValidationTestResult(`Unexpected response: ${res.status}`);
      }
    } catch (err: unknown) {
      setValidationTestResult(`Test error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setTestingValidation(false);
    }
  };

  const demoSteps = [
    {
      num: 1,
      title: 'Patient Profile & Registration',
      desc: 'Verify synthetic patient profiles (Eleanor Vance, Marcus Chen, Priya Sharma) or register new synthetic cases with pre-filled clinical templates.',
      actionLabel: 'Open Registration Wizard',
      action: onOpenNewPatient,
    },
    {
      num: 2,
      title: 'Surgery & Discharge Details',
      desc: 'Review procedure, lead surgeon, discharge condition, wound guidelines, and the geographic travel burden (operating center vs. home).',
      actionLabel: 'View Surgical Profile',
      action: () => onNavigateTab('OVERVIEW'),
    },
    {
      num: 3,
      title: 'Recovery Observations & Vitals',
      desc: 'Log interval check-ins with 0–10 NRS pain slider, wound checklists, and vitals with physiological boundary enforcement.',
      actionLabel: 'Log Recovery Check-In',
      action: () => onNavigateTab('LOG_RECOVERY'),
    },
    {
      num: 4,
      title: 'Longitudinal Recovery Timeline',
      desc: 'Chronological audit trail of surgical milestones, hospital discharge, interval logs, and verified medical documents.',
      actionLabel: 'View Recovery Timeline',
      action: () => onNavigateTab('TIMELINE'),
    },
    {
      num: 5,
      title: 'Medical Document Upload & OCR',
      desc: 'Upload discharge summaries or lab reports with MIME/magic-bytes validation and automatic optical character extraction.',
      actionLabel: 'Go to Documents & OCR',
      action: () => onNavigateTab('DOCUMENTS'),
    },
    {
      num: 6,
      title: 'Side-by-Side OCR Clinical Verification',
      desc: 'Human-in-the-loop review station: review raw OCR text side-by-side, correct unrecognized values, and commit to verified record.',
      actionLabel: 'Review Documents',
      action: () => onNavigateTab('DOCUMENTS'),
    },
    {
      num: 7,
      title: 'Member 2 Risk Assessment Contract',
      desc: 'Inspect the standardized JSON payload exported to Member 2 with explicit units, surgical context, and staleness warnings.',
      actionLabel: 'Inspect Risk Contract',
      action: () => onNavigateTab('MEMBER2_CONTRACT'),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Phase 4 Synthetic Demo &amp; Release Verification Suite
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Guided demonstration of Member 1&apos;s vertical slice for evaluators, team members, and examiners.
          </p>
        </div>

        <a
          href="/api/v1/health"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <Terminal className="w-3.5 h-3.5 text-teal-600" />
          Health Check API
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {/* Interactive Safety & Rejection Verification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Test 1: IDOR Cross-Patient Attack Rejection */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Live IDOR Security Verification
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Simulate a Patient user (ID: <code className="font-mono">pat-001</code>) attempting to access another patient&apos;s private record (<code className="font-mono">pat-002</code>).
          </p>
          <button
            onClick={runIdorTest}
            disabled={testingSecurity}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            {testingSecurity ? 'Testing...' : 'Execute Live IDOR Attack Test'}
          </button>
          {securityTestResult && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-mono">
              {securityTestResult}
            </div>
          )}
        </div>

        {/* Test 2: Inverted Hemodynamics Rejection */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Live Hemodynamic Boundary Verification
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Attempt to post physiologically impossible inverted blood pressure (<code className="font-mono">systolic: 80, diastolic: 120 mmHg</code>).
          </p>
          <button
            onClick={runValidationTest}
            disabled={testingValidation}
            className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            {testingValidation ? 'Testing...' : 'Execute Inverted BP Validation Test'}
          </button>
          {validationTestResult && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-mono">
              {validationTestResult}
            </div>
          )}
        </div>
      </div>

      {/* Guided 7-Step Demo Protocol */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Core Module Capabilities &amp; Navigation
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {demoSteps.map((step) => (
            <div
              key={step.num}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>

              <button
                onClick={step.action}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors flex items-center gap-1 shrink-0 self-end sm:self-center"
              >
                <span>{step.actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
