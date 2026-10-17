'use client';

import React, { useState } from 'react';
import { PaymentOrder, FollowUpPlan } from '@/lib/types/followup';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface PaymentStatusViewProps {
  plan?: FollowUpPlan;
}

export const PaymentStatusView: React.FC<PaymentStatusViewProps> = ({ plan }) => {
  const [testOrder, setTestOrder] = useState<PaymentOrder | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<boolean | null>(null);

  const isEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

  const handleCreateTestOrder = async () => {
    setIsCreating(true);
    setVerifyStatus(null);
    setVerifySuccess(null);

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan?.id || 'plan-101',
          amount: 50000, // ₹500 in paise
        }),
      });

      const json = await res.json();
      if (json.data?.order) {
        setTestOrder(json.data.order);
      }
    } catch {
      // Error handling
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestSignatureVerification = async (useValidSignature: boolean) => {
    if (!testOrder) return;
    setIsVerifying(true);

    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: testOrder.id,
          razorpayOrderId: testOrder.razorpayOrderId,
          razorpayPaymentId: 'pay_sandbox_test_9988',
          razorpaySignature: useValidSignature ? 'test_valid_signature' : 'tampered_invalid_signature',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setVerifySuccess(true);
        setVerifyStatus('Backend timing-safe HMAC-SHA256 signature verification SUCCEEDED. Order state transitioned to CAPTURED.');
        setTestOrder((prev) => (prev ? { ...prev, status: 'CAPTURED' } : null));
      } else {
        setVerifySuccess(false);
        setVerifyStatus(json.error?.message || 'Verification rejected: signature mismatch.');
      }
    } catch (err: unknown) {
      setVerifySuccess(false);
      setVerifyStatus(err instanceof Error ? err.message : 'Network error verifying signature');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Integration Status Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Razorpay Payment Gateway Verification
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Optional Feature • Disabled by Default
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Active configuration: <code className="font-mono text-slate-700">PAYMENTS_ENABLED={isEnabled ? 'true' : 'false'}</code>. Server-side signature validation active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
              STATUS: DISABLED BY DEFAULT (SANDBOX READY)
            </span>
          </div>
        </div>
      </div>

      {/* Medical Safety Invariant Callout */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-teal-800">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Core Safety Principle: Payment Never Gates Clinical Care</span>
        </div>
        <p className="leading-relaxed">
          In this post-surgical coordination system, clinical urgency, emergency escalation, and surgical follow-up care must <strong>never</strong> depend on payment status, whether a gateway is configured, or transaction success. Urgent red-flag escalations immediately bypass all billing screens.
        </p>
      </div>

      {/* Five-State Lifecycle Discipline */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-600" />
          <span>Defined Payment Status State Machine</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700 block text-[11px]">1. NOT_REQUIRED</span>
            <span className="text-slate-500 text-[10px]">When payments are disabled or consultation is free.</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
            <span className="font-bold text-amber-800 block text-[11px]">2. PENDING</span>
            <span className="text-slate-500 text-[10px]">Order created on backend; awaiting client completion.</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
            <span className="font-bold text-blue-800 block text-[11px]">3. AUTHORIZED</span>
            <span className="text-slate-500 text-[10px]">Payment authorized by bank; pending capture.</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
            <span className="font-bold text-emerald-800 block text-[11px]">4. CAPTURED</span>
            <span className="text-slate-500 text-[10px]">HMAC signature verified server-side; confirmed.</span>
          </div>
          <div className="p-3 bg-red-50/60 rounded-lg border border-red-200">
            <span className="font-bold text-red-800 block text-[11px]">5. FAILED</span>
            <span className="text-slate-500 text-[10px]">Signature mismatch, cancelled, or rejected.</span>
          </div>
        </div>
      </div>

      {/* Security Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-teal-600" />
            <span>Server-Side Secret Isolation</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only the public key ID (<code className="font-mono text-slate-700">NEXT_PUBLIC_RAZORPAY_KEY_ID</code>) is exposed to the browser. The secret key (<code className="font-mono text-slate-700">RAZORPAY_KEY_SECRET</code>) and webhook secret remain server-only secrets.
          </p>
          <div className="bg-slate-50 p-2.5 rounded font-mono text-[11px] text-slate-600 space-y-1">
            <div>Key ID: rzp_test_placeholder (Public)</div>
            <div>Key Secret: [Isolated in process.env.RAZORPAY_KEY_SECRET]</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Timing-Safe Cryptographic Verification</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Never trust browser callbacks alone. The backend computes HMAC-SHA256 over <code className="font-mono">order_id|payment_id</code> and compares buffers via <code className="font-mono">crypto.timingSafeEqual</code> to prevent timing attacks.
          </p>
          <div className="bg-slate-50 p-2.5 rounded font-mono text-[11px] text-slate-600 space-y-1">
            <div>Algorithm: HMAC-SHA256 with timingSafeEqual</div>
            <div>Idempotency: Handled against duplicate captures</div>
          </div>
        </div>
      </div>

      {/* Sandbox Lifecycle Verification Demo */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Sandbox Lifecycle & Signature Verification Sandbox
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Demonstrates order generation, timing-safe cryptographic verification, and tampered signature rejection.
          </p>
        </div>

        {!testOrder ? (
          <button
            type="button"
            onClick={handleCreateTestOrder}
            disabled={isCreating}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isCreating ? 'Creating Order...' : 'Generate Test Order (₹500 Teleconsultation Fee)'}</span>
          </button>
        ) : (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                Order ID: <span className="font-mono">{testOrder.razorpayOrderId}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  testOrder.status === 'CAPTURED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : testOrder.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                STATUS: {testOrder.status}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-0.5 font-mono text-[11px]">
              <div>Amount: ₹{testOrder.amount / 100} ({testOrder.currency})</div>
              <div>Receipt: {testOrder.receipt}</div>
            </div>

            {testOrder.status === 'PENDING' && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleTestSignatureVerification(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Test Valid Signature (Server Verification)</span>
                </button>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleTestSignatureVerification(false)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Test Tampered Signature (Rejection)</span>
                </button>
              </div>
            )}

            {verifyStatus && (
              <div
                className={`p-3 rounded-lg text-xs mt-2 flex items-center gap-2 ${
                  verifySuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {verifySuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{verifyStatus}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
