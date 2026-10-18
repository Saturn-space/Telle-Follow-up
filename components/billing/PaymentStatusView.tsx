'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - RAZORPAY PAYMENT GATEWAY (INR ONLY)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentOrder, FollowUpPlan, SERVICE_PRICING_INR } from '@/lib/types/followup';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  HelpCircle,
  Clock,
  Receipt,
  FileCheck,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PaymentStatusViewProps {
  plan?: FollowUpPlan;
}

export const PaymentStatusView: React.FC<PaymentStatusViewProps> = ({ plan }) => {
  const [selectedService, setSelectedService] = useState<string>('TELECONSULTATION');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [userPayments, setUserPayments] = useState<PaymentOrder[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const serviceInfo = SERVICE_PRICING_INR[selectedService] || SERVICE_PRICING_INR.TELECONSULTATION;
  const effectiveAppointmentId = plan?.appointments?.find((appointment) => appointment.id === selectedAppointmentId)?.id || plan?.appointments?.[0]?.id || '';

  const loadUserPayments = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/my-payments', { credentials: 'same-origin' });
      const json = await res.json();
      if (res.ok && json.data?.payments) {
        setUserPayments(json.data.payments);
      }
    } catch {
      setPaymentStatusMessage('Payment history could not be loaded. Retry when the service is available.');
      setPaymentSuccess(false);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load payment history and provider availability on mount.
  useEffect(() => {
    void Promise.resolve().then(loadUserPayments);
    void fetch('/api/payments/config', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => setIsEnabled(result?.data?.enabled === true))
      .catch(() => setIsEnabled(false));
  }, [loadUserPayments]);

  // Load Razorpay Checkout Script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Step 1: Create Order
  const handleInitiatePayment = async () => {
    setIsProcessing(true);
    setPaymentStatusMessage(null);
    setPaymentSuccess(null);

    if (!plan?.id || !effectiveAppointmentId) {
      setPaymentSuccess(false);
      setPaymentStatusMessage('Payment needs a saved care plan and scheduled appointment. Care itself remains available.');
      setIsProcessing(false);
      return;
    }
    if (!isEnabled) {
      setPaymentSuccess(false);
      setPaymentStatusMessage('Payments are disabled or not configured. This does not affect care or follow-up access.');
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          appointmentId: effectiveAppointmentId,
          serviceType: selectedService,
          currency: 'INR',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.data?.order) {
        setPaymentSuccess(false);
        setPaymentStatusMessage(json.error?.message || 'Failed to initialize payment order on server.');
        setIsProcessing(false);
        return;
      }

      const order: PaymentOrder = json.data.order;
      const keyId = json.data.keyId;
      setCurrentOrder(order);

      // Attempt loading Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();
      if (scriptLoaded && window.Razorpay && keyId) {
        const options = {
          key: keyId,
          amount: order.amount,
          currency: 'INR',
          name: 'Tele-Follow-Up Orchestrator',
          description: serviceInfo.description,
          order_id: order.razorpayOrderId,
          theme: { color: '#0d9488' },
          handler: async function (response: any) {
            await handleVerifyPayment(order.id, response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          },
          modal: {
            ondismiss: function () {
              setPaymentSuccess(false);
              setPaymentStatusMessage('Payment window was dismissed by the patient. Transaction cancelled.');
              setIsProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setPaymentSuccess(false);
          setPaymentStatusMessage(`Payment failed: ${response.error?.description || 'Gateway transaction declined.'}`);
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        setPaymentSuccess(false);
        setPaymentStatusMessage('The provider order was created, but checkout could not be loaded. No payment was completed.');
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      setPaymentSuccess(false);
      setPaymentStatusMessage(err instanceof Error ? err.message : 'Network error initiating payment.');
      setIsProcessing(false);
    }
  };

  // Step 2: Verify Payment
  const handleVerifyPayment = async (
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const verifiedOrder = json.data?.order as PaymentOrder | undefined;
        const captured = verifiedOrder?.status === 'CAPTURED';
        setPaymentSuccess(captured ? true : null);
        setPaymentStatusMessage(captured
          ? 'The payment provider confirmed capture. Payment does not change appointment status or determine access to care.'
          : 'The provider authorized the payment, but capture is still pending. Care remains available.');
        setCurrentOrder((prev) => prev ? { ...prev, ...(verifiedOrder || {}), razorpayPaymentId } : null);
        await loadUserPayments();
      } else {
        setPaymentSuccess(false);
        setPaymentStatusMessage(json.error?.message || 'Payment signature verification failed.');
        await loadUserPayments();
      }
    } catch (err: unknown) {
      setPaymentSuccess(false);
      setPaymentStatusMessage(err instanceof Error ? err.message : 'Verification network error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Gateway Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#DCE5F5] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EDF3FF] text-[#1745D8] border border-[#CBD9F2] flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0E1C30]">
                  Razorpay Payment Gateway (INR Only)
                </h3>
                <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-[#E6F8F2] text-[#047857] border border-[#A7F3D0]">
                  Currency: ₹ INR
                </span>
              </div>
              <p className="text-xs text-[#536078] mt-0.5">
                Compliant with Indian Rupee integer paise calculations (1 INR = 100 paise). Server-side timing-safe HMAC-SHA256 validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-[#F0F3FF] text-[#0E1C30] border border-[#DCE5F5] px-3.5 py-1.5 rounded-xl font-medium">
              MODE: {isEnabled ? 'GATEWAY CONFIGURED' : 'PAYMENTS DISABLED'}
            </span>
          </div>
        </div>
      </div>

      {/* Safety Principle Banner */}
      <div className="bg-[#EDF3FF] border border-[#CBD9F2] rounded-2xl p-4 text-xs text-[#0E1C30] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#1745D8]">
          <ShieldCheck className="w-4 h-4 text-[#1745D8]" />
          <span>Clinical Safety Invariant: Care Is Never Gated by Payment</span>
        </div>
        <p className="leading-relaxed text-[#536078]">
          In this post-surgical recovery coordination system, follow-up medical care and emergency clinical escalation are <strong>never blocked</strong> by payment status or gateway outages. Red-flag symptoms immediately bypass all billing screens.
        </p>
      </div>

      {/* Payment Initiation & Order Summary Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Service & Appointment Selection */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600" />
            <span>Select Post-Op Service for Payment</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Care Service Category
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                disabled={isProcessing}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
              >
                {Object.entries(SERVICE_PRICING_INR).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.description} — ₹{val.rupees} (INR)
                  </option>
                ))}
              </select>
            </div>

            {plan?.appointments && plan.appointments.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link to Scheduled Appointment
                </label>
                <select
                  value={effectiveAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  disabled={isProcessing}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  {plan.appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.locationOrService} ({a.type.replace(/_/g, ' ')}) • Status: {a.status}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pricing Details Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Service Fee:</span>
              <span className="font-semibold text-slate-900 font-mono">₹{serviceInfo.rupees}.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Minor Units (Paise):</span>
              <span className="font-mono text-slate-700">{serviceInfo.paise} paise</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes or gateway fees:</span>
              <span className="font-mono text-slate-700">As shown by the payment provider</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Payable (INR):</span>
              <span className="text-teal-700 font-mono">₹{serviceInfo.rupees}.00</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleInitiatePayment}
              disabled={isProcessing || !isEnabled || !plan?.id || !effectiveAppointmentId}
              className="w-full flex items-center justify-center gap-2 bg-[#1745D8] hover:bg-[#1238B5] text-white font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Razorpay Checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{isEnabled ? `Pay ₹${serviceInfo.rupees} via Razorpay (INR)` : 'Payments are unavailable'}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              {isEnabled ? 'Checkout opens with the configured payment provider.' : 'Payments are disabled or not configured. Care continues without payment.'}
            </p>
          </div>
        </div>

        {/* Right: Active Order Status & Verification Testing */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-teal-600" />
              <span>Current Transaction Status</span>
            </h4>

            {currentOrder ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID:</span>
                    <span className="font-bold text-slate-900">{currentOrder.razorpayOrderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-bold text-teal-700">₹{currentOrder.amount / 100} INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt:</span>
                    <span className="text-slate-700">{currentOrder.receipt}</span>
                  </div>
                  {currentOrder.razorpayPaymentId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment ID:</span>
                      <span className="font-bold text-slate-900">{currentOrder.razorpayPaymentId}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Gateway Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        currentOrder.status === 'CAPTURED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentOrder.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentOrder.status}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No active checkout order</p>
                <p>A verified order appears here only after the payment provider accepts it.</p>
              </div>
            )}

            {/* Status Alert Banner */}
            {paymentStatusMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  paymentSuccess === true
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : paymentSuccess === false
                      ? 'bg-rose-50 text-rose-900 border border-rose-200'
                      : 'bg-blue-50 text-blue-900 border border-blue-200'
                }`}
              >
                {paymentSuccess === true ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : paymentSuccess === false ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{paymentStatusMessage}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>Security Guarantee:</strong> Client-supplied amounts are ignored. All values are determined server-side in integer paise.
          </div>
        </div>
      </div>

      {/* Patient Payment History Table */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Authorized Payment History</span>
          </h4>
          <button
            type="button"
            onClick={loadUserPayments}
            disabled={isLoadingHistory}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {userPayments.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No payments recorded for this account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Payment ID</th>
                  <th className="py-2.5 px-3">Signature</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {userPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-700 font-sans">
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-sans font-medium">
                      {p.serviceType ? p.serviceType.replace(/_/g, ' ') : 'TELECONSULTATION'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      ₹{(p.amount / 100).toFixed(2)} {p.currency}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">{p.razorpayOrderId}</td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">{p.razorpayPaymentId || '—'}</td>
                    <td className="py-2.5 px-3">
                      {p.signatureVerified ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-sans">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'CAPTURED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
