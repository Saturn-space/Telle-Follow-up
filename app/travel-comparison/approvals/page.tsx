'use client';

import React from 'react';
import TravelOptimizationDashboard from '@/components/travel/TravelOptimizationDashboard';
import { Compass } from 'lucide-react';

export default function TravelApprovalsPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="bg-gradient-to-r from-[#122A70] via-[#1745D8] to-[#254EE0] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[#89F5E7] text-xs font-semibold uppercase tracking-wider mb-3">
            <Compass className="w-4 h-4 text-[#89F5E7]" />
            <span>Care Coordinator Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Travel Optimization &amp; Care Transfer Approvals
          </h1>
          <p className="text-sm text-[#C0CAFF] mt-2 max-w-2xl leading-relaxed">
            Review transit costs, travel hours, and local provider alternatives for recovering patients. Confirms safety criteria before approving local care substitution.
          </p>
        </div>
      </div>

      <TravelOptimizationDashboard initialPatientId="pt-101" />
    </div>
  );
}
