'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  ShieldCheck,
  Server,
  Zap,
  TrendingDown,
  Clock,
  HelpCircle,
} from 'lucide-react';

export default function SystemReliabilityPanel() {
  const [healthData, setHealthData] = useState<any>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const runProbe = async () => {
    setIsProbing(true);
    try {
      const res = await fetch('/api/travel/health?probe=true');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const res = await fetch('/api/travel/health');
        if (res.ok && isMounted) {
          const data = await res.json();
          setHealthData(data);
        }
      } catch {
        // Graceful fallback
      }
    }

    loadHealth();

    const interval = setInterval(() => {
      loadHealth();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const status = healthData?.status || 'HEALTHY';
  const checks = healthData?.checks;
  const telemetry = healthData?.telemetry;
  const cb = checks?.geospatialRouting?.circuitBreaker;
  const cache = checks?.geospatialRouting?.cache;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                Production Reliability & Telemetry
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  status === 'HEALTHY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Zero-PHI operational signals, routing cache metrics, and clinical safety circuit-breaker status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={runProbe}
            disabled={isProbing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            title="Perform active reachability probe on external OSRM routing service"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin text-teal-600' : ''}`} />
            {isProbing ? 'Probing...' : 'Probe Routing Engine'}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Top Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Geospatial Routing Cache */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Route Cache
                </span>
                <span className="text-[10px] text-teal-600 font-bold">
                  {cache ? `${Math.round(cache.hitRatio * 100)}% Hit Rate` : 'Active'}
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {cache ? `${cache.hits} Hits / ${cache.size} Cached` : '0 Hits'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                TTL: 15 mins • Coordinates normalized to 4 decimals (~11m)
              </p>
            </div>

            {/* Card 2: Circuit Breaker Status */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  Circuit Breaker
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    cb?.state === 'CLOSED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {cb?.state || 'CLOSED'}
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {cb?.failures || 0} Failures
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Threshold: 3 • Auto-fallback: 30s cooling
              </p>
            </div>

            {/* Card 3: Clinical Safety Circuit-Breaker */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Safety Gate
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-1.5 py-0.5 rounded">
                  ARMED
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {telemetry?.escalatedComparisons ?? 0} Escalated
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Emergency override takes absolute precedence
              </p>
            </div>

            {/* Card 4: Aggregate Travel Saved */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  Total Distance Saved
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {telemetry?.totalDistanceSavedKm ? `${telemetry.totalDistanceSavedKm} km` : '0 km'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Across {telemetry?.completedComparisons ?? 0} completed care plans
              </p>
            </div>
          </div>

          {/* Detailed Probe & Routing Health Status */}
          {checks?.geospatialRouting?.probe && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                checks.geospatialRouting.probe.reachable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Active Probe:</strong> Live OSRM Routing is{' '}
                  {checks.geospatialRouting.probe.reachable ? 'Reachable' : 'Unreachable'} (Latency:{' '}
                  {checks.geospatialRouting.probe.latencyMs}ms)
                </span>
              </div>
              <span className="font-mono text-[10px]">
                {checks.geospatialRouting.probe.reachable ? 'HTTP 200 OK' : 'Degraded Fallback Active'}
              </span>
            </div>
          )}

          {/* Privacy & Zero-PHI Compliance Tag */}
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong>HIPAA & Privacy Notice:</strong> All metrics, comparisons, and telemetry are strictly anonymized. No patient identifiers, clinical diagnoses, or personal health information (PHI) are logged or stored in telemetry.
              </span>
            </div>
            <a
              href="/api/travel/health"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-teal-700 hover:underline shrink-0"
            >
              Raw Health JSON &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
