'use client';

import React from 'react';
import { DataQualityAlert } from '@/lib/risk/types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  alerts: DataQualityAlert[];
  missingFlags: string[];
}

export function DataQualityAlerts({ alerts, missingFlags }: Props) {
  if ((!alerts || alerts.length === 0) && (!missingFlags || missingFlags.length === 0)) {
    return null;
  }

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-700" />
        <h3 className="font-semibold text-amber-900 text-sm">
          Data Quality & Observation Sufficiency Warnings
        </h3>
      </div>

      <p className="text-xs text-amber-800 mb-3 leading-relaxed">
        <strong>Clinical Safety Rule:</strong> Missing or stale observations cannot produce a reassuring &quot;Low Risk&quot; assessment. Clinicians should evaluate the missing data points below before finalizing care modality.
      </p>

      {missingFlags && missingFlags.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-semibold text-amber-900 block mb-1.5">
            Unrecorded Clinical Parameters:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {missingFlags.map((flag) => (
              <span
                key={flag}
                className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-100 text-amber-900 border border-amber-300"
              >
                Missing: {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.alertId}
              className={`p-3 rounded-lg border text-xs ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-100/80 border-rose-300 text-rose-900'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-100/60 border-amber-300 text-amber-900'
                  : 'bg-blue-100/60 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {alert.severity === 'CRITICAL' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>{alert.headline}</span>
              </div>
              <p className="mt-1 leading-relaxed">{alert.detailedMessage}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
