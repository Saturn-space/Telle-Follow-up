'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - MEDICAL DOCUMENT CENTER & OCR
// Secure Patient Uploads, Unverified OCR Processing & Clinical Review
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  X,
  FileUp,
} from 'lucide-react';

export default function PatientDocumentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docType, setDocType] = useState('DISCHARGE_SUMMARY');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalOcrAvailable, setExternalOcrAvailable] = useState(false);
  const [externalOcrConsent, setExternalOcrConsent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success && data.data?.documents) {
        setDocuments(data.data.documents);
      }
    } catch (e) {
      console.warn('Document load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void Promise.resolve().then(loadDocuments);
      void Promise.resolve().then(() => fetch('/api/documents/config')).then((response) => response.json()).then((result) => setExternalOcrAvailable(result?.data?.externalOcrAvailable === true)).catch(() => setExternalOcrAvailable(false));
    }
  }, [isAuthenticated]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback('Choose a document file first.');
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set('file', selectedFile);
      formData.set('documentType', docType);
      formData.set('patientId', user?.patientId || '');
      formData.set('externalOcrConsent', String(externalOcrConsent));
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Upload failed.');
      }

      setFeedback(data.message || 'Document stored securely.');
      setShowUploadModal(false);
      setSelectedFile(null);
      setExternalOcrConsent(false);
      await loadDocuments();
    } catch (err: any) {
      setFeedback(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FF]">
      <main className="flex min-w-0 flex-col">
        {/* Header Bar */}
        <header className="bg-white border-b border-[#DCE5F5] sticky top-0 z-10 px-6 py-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#1745D8] border border-blue-100">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#0E1C30]">Medical Document Center</h1>
                <p className="text-xs text-slate-500">
                    Upload encrypted documents and review optional OCR results
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDocuments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1745D8] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Clinical OCR Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Diagnostic Document Integrity Safeguard:</span> Automated OCR text extraction is provided to assist data entry. All extracted medication schedules, surgical wound parameters, and laboratory figures remain <strong>UNVERIFIED</strong> until certified by an attending clinician.
            </div>
          </div>

          {feedback && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1745D8] flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Document Repository Table */}
          <div className="bg-white rounded-2xl border border-[#DCE5F5] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#DCE5F5] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Authoritative Patient Records</h2>
                <p className="text-xs text-slate-500 mt-0.5">Encrypted metadata persisted in PostgreSQL</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {documents.length} File{documents.length === 1 ? '' : 's'} on Record
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-medium">No medical documents uploaded yet.</p>
                  <p className="text-xs">Upload your discharge summary to extract wound and medication details.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{doc.originalName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1745D8]">
                          {doc.documentType}
                        </span>
                        {doc.isVerified ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED BY {doc.verifiedBy || 'DOCTOR'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING REVIEW
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Size: {(doc.fileSizeBytes / 1024).toFixed(1)} KB • Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                      {doc.clinicalNotes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-200/60">
                          <strong>Clinician Note:</strong> {doc.clinicalNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect OCR
                      </button>
                      <a href={doc.downloadUrl} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold">Download file</a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* OCR Inspector Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#DCE5F5] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Document Text Review</h3>
                  <p className="text-xs text-slate-500">{selectedDoc.originalName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <strong>Notice:</strong> OCR status: <strong>{selectedDoc.ocrStatus}</strong>. Extracted text is unverified and must be checked by a clinician.
                </div>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {selectedDoc.ocrText || 'No extracted text content available.'}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-[#DCE5F5] shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Upload Surgical Document</h3>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Category
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="block w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1745D8] outline-none"
                  >
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="SURGICAL_NOTES">Operative Surgical Note</option>
                    <option value="LAB_REPORT">Post-Op Laboratory Panel</option>
                    <option value="PRESCRIPTION">Discharge Medication Prescription</option>
                    <option value="WOUND_PHOTO">Surgical Incision Photo / Report</option>
                    <option value="OTHER">Other Medical Record</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document File *</label>
                  <input type="file" accept="application/pdf,image/png,image/jpeg" required onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="block w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl" />
                  <p className="mt-1 text-[10px] text-slate-500">PDF, PNG, or JPEG up to 10 MB. Files are encrypted before storage.</p>
                </div>

                {externalOcrAvailable && <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><input type="checkbox" checked={externalOcrConsent} onChange={(event) => setExternalOcrConsent(event.target.checked)} className="mt-0.5" /><span>I consent to sending this document to the configured external OCR provider. Extracted text remains unverified until a clinician reviews it.</span></label>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 rounded-xl bg-[#1745D8] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    {uploading ? 'Encrypting & saving…' : 'Upload document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

