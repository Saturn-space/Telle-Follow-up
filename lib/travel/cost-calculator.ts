import { TransportMode, TravelCostEstimate } from './types';

export interface CostCalculationParams {
  oneWayDistanceKm: number;
  durationMins?: number;
  mode: TransportMode;
  currency?: string;
  customRatePerKm?: number;
}

export interface CostCalculationOutcome {
  estimate: TravelCostEstimate | null;
  missingReason?: string;
}

// Configurable benchmark rates (e.g. INR per km)
export const DEFAULT_RATES_PER_KM: Record<TransportMode, number> = {
  DRIVING: 12.0,      // Fuel, maintenance, vehicle depreciation
  PUBLIC_TRANSIT: 3.5,// Bus / rail fare average
  TAXI: 18.0,         // Commercial taxi / cab hire
};

// Long-distance lodging threshold: >250 km one-way or >4.5 hours journey
export const LONG_DISTANCE_KM_THRESHOLD = 250;
export const INCIDENTAL_LODGING_RATE = 1500; // Benchmark modest post-op recovery stay near hospital

/**
 * Calculates a transparent scenario-based travel expense estimate.
 * Never invents dynamic surge pricing, tolls, or live ticket costs.
 */
export function calculateTravelCost(params: CostCalculationParams): CostCalculationOutcome {
  const { oneWayDistanceKm, durationMins = 0, mode, currency = 'INR', customRatePerKm } = params;

  if (typeof oneWayDistanceKm !== 'number' || isNaN(oneWayDistanceKm) || oneWayDistanceKm <= 0) {
    return {
      estimate: null,
      missingReason: 'Distance is required and must be greater than zero to compute travel costs.',
    };
  }

  if (customRatePerKm !== undefined && (typeof customRatePerKm !== 'number' || isNaN(customRatePerKm) || customRatePerKm <= 0)) {
    return {
      estimate: null,
      missingReason: 'Custom rate per km must be a positive number greater than zero.',
    };
  }

  const ratePerKm = customRatePerKm && customRatePerKm > 0 ? customRatePerKm : DEFAULT_RATES_PER_KM[mode] ?? 12.0;
  const roundtripDistanceKm = Math.round(oneWayDistanceKm * 2 * 10) / 10;
  const transportCost = Math.round(roundtripDistanceKm * ratePerKm);

  // Incidental lodging estimate if long-distance interstate travel
  const requiresLodging = oneWayDistanceKm >= LONG_DISTANCE_KM_THRESHOLD || durationMins >= 270;
  const incidentalLodgingCost = requiresLodging ? INCIDENTAL_LODGING_RATE : 0;
  const totalCost = transportCost + incidentalLodgingCost;

  const assumptions: string[] = [
    `Round-trip multiplier: 2.0x one-way distance (${roundtripDistanceKm} km total).`,
    `Standard benchmark rate: ${currency} ${ratePerKm.toFixed(2)}/km for ${mode.replace('_', ' ').toLowerCase()}.`,
  ];

  if (requiresLodging) {
    assumptions.push(
      `Includes estimated post-op overnight lodging/subsistence allowance (${currency} ${incidentalLodgingCost}) due to long distance (> ${LONG_DISTANCE_KM_THRESHOLD} km).`
    );
  } else {
    assumptions.push('Assumes same-day return journey; no overnight accommodation included.');
  }

  assumptions.push(
    'Notice: Scenario projection only. Tolls, state taxes, parking, and dynamic fares are not included.'
  );

  return {
    estimate: {
      estimatedCost: totalCost,
      currency,
      transportMode: mode,
      ratePerKm,
      roundtripDistanceKm,
      incidentalLodgingCost,
      assumptions,
      isEstimateOnly: true,
    },
  };
}
