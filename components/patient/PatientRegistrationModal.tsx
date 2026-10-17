'use client';

// components/patient/PatientRegistrationModal.tsx
import React, { useState } from 'react';
import { X, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { Patient } from '@/lib/types/patient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
}

export function PatientRegistrationModal({ isOpen, onClose, onPatientCreated }: Props) {
  const [formData, setFormData] = useState({
    fullName: '',
    mrn: '',
    dateOfBirth: '1970-05-15',
    gender: 'Female',
    phone: '+1 (555) 789-1234',
    homeAddress: '100 Main Street',
    homeCity: 'Bloomington',
    homeState: 'IL',
    homeZip: '61701',
    emergencyContact: 'Family Contact - +1 (555) 789-1235',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreset = (type: 'ortho' | 'cardiac' | 'neuro') => {
    if (type === 'ortho') {
      setFormData({
        fullName: 'Arthur Pendelton',
        mrn: `TFO-2026-${Math.floor(100 + Math.random() * 899)}`,
        dateOfBirth: '1959-08-22',
        gender: 'Male',
        phone: '+1 (555) 612-4411',
        homeAddress: '512 Oak Ridge Road',
        homeCity: 'Carbondale',
        homeState: 'IL',
        homeZip: '62901',
        emergencyContact: 'Martha Pendelton (Wife) - +1 (555) 612-4412',
      });
    } else if (type === 'cardiac') {
      setFormData({
        fullName: 'Beatrice Morales',
        mrn: `TFO-2026-${Math.floor(100 + Math.random() * 899)}`,
        dateOfBirth: '1966-02-14',
        gender: 'Female',
        phone: '+1 (555) 883-9922',
        homeAddress: '782 Cedar Lane',
        homeCity: 'Decatur',
        homeState: 'IL',
        homeZip: '62521',
        emergencyContact: 'Carlos Morales (Son) - +1 (555) 883-9923',
      });
    } else {
      setFormData({
        fullName: 'Devon Washington',
        mrn: `TFO-2026-${Math.floor(100 + Math.random() * 899)}`,
        dateOfBirth: '1978-11-09',
        gender: 'Male',
        phone: '+1 (555) 441-2299',
        homeAddress: '319 Pine Crest Way',
        homeCity: 'Champaign',
        homeState: 'IL',
        homeZip: '61820',
        emergencyContact: 'Tanya Washington (Spouse) - +1 (555) 441-2298',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to register patient');
      }

      onPatientCreated(json.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Register New Synthetic Patient</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Synthetic Case Presets */}
        <div className="mt-4 p-3 bg-teal-50/60 border border-teal-200 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Quick Clinical Test Presets:
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePreset('ortho')}
              className="px-2.5 py-1 text-xs bg-white text-teal-700 border border-teal-300 rounded-md font-medium hover:bg-teal-100/50 transition-colors"
            >
              Arthur P. (TKA, Carbondale)
            </button>
            <button
              type="button"
              onClick={() => handlePreset('cardiac')}
              className="px-2.5 py-1 text-xs bg-white text-teal-700 border border-teal-300 rounded-md font-medium hover:bg-teal-100/50 transition-colors"
            >
              Beatrice M. (CABG, Decatur)
            </button>
            <button
              type="button"
              onClick={() => handlePreset('neuro')}
              className="px-2.5 py-1 text-xs bg-white text-teal-700 border border-teal-300 rounded-md font-medium hover:bg-teal-100/50 transition-colors"
            >
              Devon W. (Spine, Champaign)
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. Eleanor Vance"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">MRN (Synthetic)</label>
              <input
                type="text"
                value={formData.mrn}
                onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                placeholder="Auto-generated if blank"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Home City *</label>
              <input
                type="text"
                required
                value={formData.homeCity}
                onChange={(e) => setFormData({ ...formData, homeCity: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">State *</label>
              <input
                type="text"
                required
                value={formData.homeState}
                onChange={(e) => setFormData({ ...formData, homeState: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Zip Code *</label>
              <input
                type="text"
                required
                value={formData.homeZip}
                onChange={(e) => setFormData({ ...formData, homeZip: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Emergency Contact</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="mt-1 w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
