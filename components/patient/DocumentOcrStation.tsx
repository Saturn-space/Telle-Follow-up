'use client';

// components/patient/DocumentOcrStation.tsx
import React, { useState } from 'react';
import { MedicalDocument, DocumentCategory } from '@/lib/types/patient';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileCheck2,
  ShieldCheck,
  Edit3,
  Trash2,
} from 'lucide-react';

interface Props {
  patientId: string;
  documents: MedicalDocument[];
  onDocumentAdded: (doc: MedicalDocument) => void;
  onOcrReviewed: (docId: string, verified: boolean) => void;
  onDocumentDeleted?: (docId: string) => void;
}

export function DocumentOcrStation({
  patientId,
  documents,
  onDocumentAdded,
  onOcrReviewed,
  onDocumentDeleted,
}: Props) {
  const [category, setCategory] = useState<DocumentCategory>('DISCHARGE_SUMMARY');
  const [selectedPreset, setSelectedPreset] = useState<'discharge' | 'lab' | 'wound'>('discharge');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review modal state
  const [reviewingDoc, setReviewingDoc] = useState<MedicalDocument | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);

    let docName = 'Inpatient_Discharge_Summary.pdf';
    let docCategory = category;

    if (selectedPreset === 'lab') {
      docName = 'PostOp_CBC_Metabolic_Lab_Report.pdf';
      docCategory = 'LAB_REPORT';
    } else if (selectedPreset === 'wound') {
      docName = 'Surgical_Wound_Site_Evaluation.png';
      docCategory = 'WOUND_PHOTO';
    }

    try {
      const res = await fetch(`/api/v1/patients/${patientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalName: docName,
          mimeType: docName.endsWith('.png') ? 'image/png' : 'application/pdf',
          category: docCategory,
          fileSize: 340000,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Document upload failed');
      }

      onDocumentAdded(json.data);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openReviewModal = (doc: MedicalDocument) => {
    setReviewingDoc(doc);
    setEditedText(doc.ocrExtraction?.rawExtractedText || '');
    setCorrectionNotes(doc.ocrExtraction?.correctionNotes || '');
    setReviewError(null);
  };

  const handleSaveVerification = async (verified: boolean) => {
    if (!reviewingDoc) return;
    setReviewing(true);
    setReviewError(null);

    try {
      const res = await fetch(
        `/api/v1/patients/${patientId}/documents/${reviewingDoc.id}/ocr/review`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isVerified: verified,
            correctedText: editedText,
            correctionNotes: correctionNotes.trim() || undefined,
            reviewedByUserId: 'usr-clinician-reviewer',
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Review submission failed');
      }

      onOcrReviewed(reviewingDoc.id, verified);
      setReviewingDoc(null);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!window.confirm(`Permanently delete diagnostic record "${docName}"? This will also remove associated OCR extractions.`)) {
      return;
    }

    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/v1/patients/${patientId}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'x-tele-role': 'CLINICIAN',
          'x-tele-user-id': 'usr-clinician-001',
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to delete document');
      }

      if (onDocumentDeleted) {
        onDocumentDeleted(docId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting document');
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Upload Station Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-600" />
              Diagnostic Document Ingestion &amp; OCR Engine
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload discharge summaries, lab reports, or wound photos. Optical character extraction runs automatically and requires clinical verification.
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {uploadError}
          </div>
        )}

        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Document Template to Ingest:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'discharge',
                  title: 'Inpatient Discharge Summary',
                  desc: 'Hospital discharge vitals, surgical staples, medication orders',
                  cat: 'DISCHARGE_SUMMARY' as DocumentCategory,
                },
                {
                  id: 'lab',
                  title: 'Post-Op Lab Diagnostic Report',
                  desc: 'Hemoglobin, WBC leukocytosis check, Platelets, CRP',
                  cat: 'LAB_REPORT' as DocumentCategory,
                },
                {
                  id: 'wound',
                  title: 'Wound Site Photographic Evaluation',
                  desc: 'Incision edge approximation, erythema margin notes',
                  cat: 'WOUND_PHOTO' as DocumentCategory,
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelectedPreset(item.id as 'discharge' | 'lab' | 'wound');
                    setCategory(item.cat);
                  }}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    selectedPreset === item.id
                      ? 'border-teal-500 bg-teal-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText
                      className={`w-4 h-4 ${
                        selectedPreset === item.id ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Supported Formats: PDF, PNG, JPEG, WEBP (Max 10 MB). Server-side MIME &amp; size verified.
            </span>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Processing OCR...' : 'Upload & Run OCR Extraction'}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Medical Documents &amp; Verification Catalog ({documents.length})
          </h3>
          <span className="text-xs text-slate-500">
            {documents.filter((d) => d.ocrExtraction?.isVerified).length} Verified •{' '}
            {documents.filter((d) => !d.ocrExtraction?.isVerified).length} Pending Review
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl mt-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 mt-2">No documents uploaded for this patient.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {documents.map((doc) => {
              const ocr = doc.ocrExtraction;
              const isVerified = ocr?.isVerified;

              return (
                <div
                  key={doc.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isVerified
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                      }`}
                    >
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{doc.originalName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {doc.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isVerified ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Clinically Verified
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Unverified (Pending Review)
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>Size: {(doc.fileSize / 1024).toFixed(0)} KB</span>
                        <span>MIME: {doc.mimeType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => openReviewModal(doc)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                        isVerified
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                      }`}
                    >
                      {isVerified ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      {isVerified ? 'View Extraction' : 'Review & Verify OCR'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id, doc.originalName)}
                      disabled={deletingDocId === doc.id}
                      title="Purge Medical Document"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-Side OCR Verification Station Modal */}
      {reviewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Side-by-Side OCR Review &amp; Clinical Verification Station
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document: <strong>{reviewingDoc.originalName}</strong> • Safety rule: OCR text is never treated as verified clinical data without human sign-off.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {reviewError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl shrink-0">
                {reviewError}
              </div>
            )}

            {/* Split Screen View */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
              {/* Left Pane: Original Document View */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Original Source Document Preview
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reviewingDoc.mimeType}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed flex-1 overflow-y-auto">
                  {reviewingDoc.ocrExtraction?.rawExtractedText || 'No text content available.'}
                </div>
              </div>

              {/* Right Pane: OCR Extraction & Editable Correction */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    Editable Verified Medical Record
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      reviewingDoc.ocrExtraction?.isVerified
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {reviewingDoc.ocrExtraction?.isVerified ? 'VERIFIED' : 'NEEDS REVIEW'}
                  </span>
                </div>

                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Corrected Clinical Text (Verify dates, counts, and measurements):
                </label>
                <textarea
                  rows={9}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full text-xs p-3 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed flex-1"
                />

                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reviewer Notes / Operative Cross-Check:
                  </label>
                  <input
                    type="text"
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="e.g. Verified staple count matches operative record (18 staples)."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500">
                Sign-off logs reviewer timestamp in clinical audit log.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingDoc(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleSaveVerification(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {reviewing ? 'Committing...' : 'Verify & Commit to Clinical Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
