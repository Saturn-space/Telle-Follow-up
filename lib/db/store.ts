// lib/db/store.ts
// In-Memory Clinical Store matching the Prisma schema for development & prototyping.
// Provides persistent synthetic post-surgical data, relational integrity, and query helpers.

import {
  Patient,
  Surgery,
  RecoveryEntry,
  VitalMeasurement,
  MedicalDocument,
  OcrExtraction,
  TimelineItem,
  UserRole,
} from '@/lib/types/patient';
import { RecoveryObservationDataContract } from '@/lib/contracts/member2-risk-contract';

class DataStore {
  private patients: Map<string, Patient> = new Map();
  private surgeries: Map<string, Surgery> = new Map();
  private recoveryEntries: Map<string, RecoveryEntry> = new Map();
  private vitalMeasurements: Map<string, VitalMeasurement> = new Map();
  private documents: Map<string, MedicalDocument> = new Map();
  private ocrExtractions: Map<string, OcrExtraction> = new Map();

  constructor() {
    this.seedInitialSyntheticData();
  }

  private seedInitialSyntheticData() {
    // 1. Patient: Eleanor Vance (Total Knee Arthroplasty)
    const p1Id = 'pat-001';
    const p1: Patient = {
      id: p1Id,
      userId: 'usr-001',
      mrn: 'TFO-2026-001',
      fullName: 'Eleanor Vance',
      dateOfBirth: '1964-04-12T00:00:00.000Z',
      gender: 'Female',
      phone: '+1 (555) 234-5678',
      homeAddress: '442 Prairie Ridge Way',
      homeCity: 'Springfield',
      homeState: 'IL',
      homeZip: '62704',
      emergencyContact: 'Thomas Vance (Spouse) - +1 (555) 234-5679',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };
    this.patients.set(p1.id, p1);

    const s1: Surgery = {
      id: 'surg-001',
      patientId: p1Id,
      procedureName: 'Right Total Knee Arthroplasty (TKA)',
      surgicalSpecialty: 'Orthopedic Surgery',
      hospitalName: 'Chicago Metropolitan Orthopedic Center',
      hospitalCity: 'Chicago',
      hospitalState: 'IL',
      operatingSurgeon: 'Dr. Sarah Jenkins, MD, FAAOS',
      surgeryDate: '2026-10-10T09:30:00.000Z',
      dischargeDate: '2026-10-13T14:00:00.000Z',
      dischargeCondition: 'Stable, ambulatory with front-wheeled walker. Incision closed with 18 surgical staples.',
      woundCareInstructions: 'Keep incision clean and dry. No submersion in water. Change outer dressing every 48 hours or when soiled.',
      plannedFollowUpDate: '2026-10-24T10:00:00.000Z',
      createdAt: '2026-10-10T11:00:00.000Z',
      updatedAt: '2026-10-13T14:00:00.000Z',
    };
    this.surgeries.set(s1.id, s1);

    // Initial Recovery Entry 1 (Post-Op Day 2)
    const rec1Id = 'rec-001';
    const rec1: RecoveryEntry = {
      id: rec1Id,
      patientId: p1Id,
      recordedAt: '2026-10-14T09:00:00.000Z',
      painScore: 5,
      mobilityStatus: 'Assisted (Walker)',
      woundCondition: 'Clean/Dry',
      symptoms: ['localized_stiffness', 'mild_swelling'],
      patientNotes: 'Managing pain well with prescribed oral analgesics. Completed morning quad sets with physical therapist.',
      reportedByRole: 'PATIENT',
      createdAt: '2026-10-14T09:05:00.000Z',
    };
    this.recoveryEntries.set(rec1Id, rec1);

    const vit1: VitalMeasurement = {
      id: 'vit-001',
      patientId: p1Id,
      recoveryEntryId: rec1Id,
      recordedAt: '2026-10-14T09:00:00.000Z',
      temperatureC: 36.9,
      heartRateBpm: 76,
      systolicBp: 124,
      diastolicBp: 80,
      spO2Percent: 98,
      drainOutputMl: 10,
      createdAt: '2026-10-14T09:05:00.000Z',
    };
    this.vitalMeasurements.set(vit1.id, vit1);

    // Recovery Entry 2 (Post-Op Day 4 - Recent)
    const rec2Id = 'rec-002';
    const rec2: RecoveryEntry = {
      id: rec2Id,
      patientId: p1Id,
      recordedAt: '2026-10-16T15:30:00.000Z',
      painScore: 3,
      mobilityStatus: 'Assisted (Cane/Walker)',
      woundCondition: 'Clean/Dry',
      symptoms: ['mild_stiffness'],
      patientNotes: 'Swelling has decreased significantly with ice packs. Incision staples intact, no drainage noted.',
      reportedByRole: 'PATIENT',
      createdAt: '2026-10-16T15:32:00.000Z',
    };
    this.recoveryEntries.set(rec2Id, rec2);

    const vit2: VitalMeasurement = {
      id: 'vit-002',
      patientId: p1Id,
      recoveryEntryId: rec2Id,
      recordedAt: '2026-10-16T15:30:00.000Z',
      temperatureC: 36.7,
      heartRateBpm: 72,
      systolicBp: 118,
      diastolicBp: 76,
      spO2Percent: 99,
      drainOutputMl: 0,
      createdAt: '2026-10-16T15:32:00.000Z',
    };
    this.vitalMeasurements.set(vit2.id, vit2);

    // Document & OCR for Eleanor
    const doc1Id = 'doc-001';
    const doc1: MedicalDocument = {
      id: doc1Id,
      patientId: p1Id,
      category: 'DISCHARGE_SUMMARY',
      originalName: 'Eleanor_Vance_Discharge_Summary_TKA.pdf',
      mimeType: 'application/pdf',
      fileSize: 428000,
      filePath: '/uploads/documents/doc-001-tka.pdf',
      uploadedAt: '2026-10-14T11:00:00.000Z',
    };
    this.documents.set(doc1Id, doc1);

    const ocr1: OcrExtraction = {
      id: 'ocr-001',
      documentId: doc1Id,
      status: 'REVIEWED',
      rawExtractedText: `TERTIARY SURGICAL HOSPITAL - INPATIENT DISCHARGE SUMMARY
Patient: Eleanor Vance | MRN: TFO-2026-001 | DOB: 1964-04-12
Primary Procedure: Right Total Knee Arthroplasty (CPT 27447)
Surgeon: Dr. Sarah Jenkins, MD, FAAOS
Discharge Date: 2026-10-13 | Incision Staples: 18
Discharge Vitals: Temp: 36.8°C | BP: 122/78 mmHg | HR: 72 bpm | SpO2: 98%
Follow-up: Staple removal at day 14. DVT prophylaxis via Apixaban 2.5mg BID x14d.`,
      extractedMetadata: {
        documentType: 'DISCHARGE_SUMMARY',
        stapleCount: 18,
        prescriptions: ['Apixaban 2.5mg BID', 'Acetaminophen 1000mg TID PRN'],
        stapleRemovalWindowDays: 14,
      },
      isVerified: true,
      reviewedByUserId: 'usr-clinician-01',
      reviewedAt: '2026-10-14T14:20:00.000Z',
      correctionNotes: 'Verified against operative record. Confirmed 18 surgical staples placed.',
      createdAt: '2026-10-14T11:02:00.000Z',
      updatedAt: '2026-10-14T14:20:00.000Z',
    };
    this.ocrExtractions.set(doc1Id, ocr1);

    // 2. Patient: Marcus Chen (Coronary Artery Bypass Graft)
    const p2Id = 'pat-002';
    const p2: Patient = {
      id: p2Id,
      userId: 'usr-002',
      mrn: 'TFO-2026-002',
      fullName: 'Marcus Chen',
      dateOfBirth: '1968-11-20T00:00:00.000Z',
      gender: 'Male',
      phone: '+1 (555) 345-6789',
      homeAddress: '812 Forest Glen Lane',
      homeCity: 'Rockford',
      homeState: 'IL',
      homeZip: '61101',
      emergencyContact: 'Lily Chen (Daughter) - +1 (555) 345-6780',
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
    };
    this.patients.set(p2.id, p2);

    const s2: Surgery = {
      id: 'surg-002',
      patientId: p2Id,
      procedureName: 'Coronary Artery Bypass Graft (CABG x2)',
      surgicalSpecialty: 'Cardiothoracic Surgery',
      hospitalName: 'Midwest Heart & Vascular Institute',
      hospitalCity: 'Chicago',
      hospitalState: 'IL',
      operatingSurgeon: 'Dr. Robert Martinez, MD, FACS',
      surgeryDate: '2026-10-07T08:00:00.000Z',
      dischargeDate: '2026-10-12T11:00:00.000Z',
      dischargeCondition: 'Hemodynamically stable, median sternotomy incision healing well. Sternal precautions reviewed.',
      woundCareInstructions: 'Inspect sternal incision daily. No lifting > 5 lbs for 6 weeks. Log daily weights.',
      plannedFollowUpDate: '2026-10-26T14:00:00.000Z',
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-12T11:00:00.000Z',
    };
    this.surgeries.set(s2.id, s2);

    const rec3Id = 'rec-003';
    const rec3: RecoveryEntry = {
      id: rec3Id,
      patientId: p2Id,
      recordedAt: '2026-10-15T10:00:00.000Z',
      painScore: 4,
      mobilityStatus: 'Assisted',
      woundCondition: 'Clean/Dry',
      symptoms: ['mild_fatigue', 'mild_dyspnea_on_exertion'],
      patientNotes: 'Breathing exercises performed with incentive spirometer. No chest tightness at rest.',
      reportedByRole: 'PATIENT',
      createdAt: '2026-10-15T10:05:00.000Z',
    };
    this.recoveryEntries.set(rec3Id, rec3);

    const vit3: VitalMeasurement = {
      id: 'vit-003',
      patientId: p2Id,
      recoveryEntryId: rec3Id,
      recordedAt: '2026-10-15T10:00:00.000Z',
      temperatureC: 37.0,
      heartRateBpm: 82,
      systolicBp: 128,
      diastolicBp: 82,
      spO2Percent: 97,
      drainOutputMl: 0,
      createdAt: '2026-10-15T10:05:00.000Z',
    };
    this.vitalMeasurements.set(vit3.id, vit3);

    // 3. Patient: Priya Sharma (Laparoscopic Cholecystectomy)
    const p3Id = 'pat-003';
    const p3: Patient = {
      id: p3Id,
      userId: 'usr-003',
      mrn: 'TFO-2026-003',
      fullName: 'Priya Sharma',
      dateOfBirth: '1985-07-03T00:00:00.000Z',
      gender: 'Female',
      phone: '+1 (555) 456-7890',
      homeAddress: '230 University Blvd',
      homeCity: 'Peoria',
      homeState: 'IL',
      homeZip: '61604',
      emergencyContact: 'Raj Sharma (Brother) - +1 (555) 456-7891',
      createdAt: '2026-10-12T07:30:00.000Z',
      updatedAt: '2026-10-16T09:00:00.000Z',
    };
    this.patients.set(p3.id, p3);

    const s3: Surgery = {
      id: 'surg-003',
      patientId: p3Id,
      procedureName: 'Laparoscopic Cholecystectomy',
      surgicalSpecialty: 'General Surgery',
      hospitalName: 'Central Illinois Surgical Pavilion',
      hospitalCity: 'Peoria',
      hospitalState: 'IL',
      operatingSurgeon: 'Dr. Anita Patel, MD',
      surgeryDate: '2026-10-12T10:00:00.000Z',
      dischargeDate: '2026-10-13T09:00:00.000Z',
      dischargeCondition: 'Tolerating light diet, pain controlled with acetaminophen.',
      woundCareInstructions: 'Four puncture sites covered with Dermabond surgical adhesive. Do not pick or scrub.',
      plannedFollowUpDate: '2026-10-27T11:30:00.000Z',
      createdAt: '2026-10-12T12:00:00.000Z',
      updatedAt: '2026-10-13T09:00:00.000Z',
    };
    this.surgeries.set(s3.id, s3);
  }

  // --- Patient Operations ---
  public getPatients(search?: string): Patient[] {
    const all = Array.from(this.patients.values());
    if (!search || !search.trim()) return all;
    const term = search.toLowerCase().trim();
    return all.filter(
      (p) =>
        p.fullName.toLowerCase().includes(term) ||
        p.mrn.toLowerCase().includes(term) ||
        p.homeCity.toLowerCase().includes(term)
    );
  }

  public getPatientById(id: string): Patient | undefined {
    return this.patients.get(id);
  }

  public getPatientByMrn(mrn: string): Patient | undefined {
    return Array.from(this.patients.values()).find((p) => p.mrn.toLowerCase() === mrn.toLowerCase());
  }

  public createPatient(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
    const id = `pat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  public updatePatient(id: string, data: Partial<Patient>): Patient | null {
    const existing = this.patients.get(id);
    if (!existing) return null;
    const updated: Patient = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    this.patients.set(id, updated);
    return updated;
  }

  // --- Surgery Operations ---
  public getSurgeriesByPatientId(patientId: string): Surgery[] {
    return Array.from(this.surgeries.values())
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => new Date(b.surgeryDate).getTime() - new Date(a.surgeryDate).getTime());
  }

  public getSurgeryById(id: string): Surgery | undefined {
    return this.surgeries.get(id);
  }

  public createSurgery(data: Omit<Surgery, 'id' | 'createdAt' | 'updatedAt'>): Surgery {
    const id = `surg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();
    const surgery: Surgery = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.surgeries.set(id, surgery);
    return surgery;
  }

  // --- Recovery Entries Operations ---
  public getRecoveryEntriesByPatientId(patientId: string): RecoveryEntry[] {
    const entries = Array.from(this.recoveryEntries.values())
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    // Attach vitals
    return entries.map((entry) => {
      const vitals = Array.from(this.vitalMeasurements.values()).filter(
        (v) => v.recoveryEntryId === entry.id
      );
      return {
        ...entry,
        vitals,
      };
    });
  }

  public createRecoveryEntry(
    data: Omit<RecoveryEntry, 'id' | 'createdAt'>,
    vitalData?: Partial<VitalMeasurement>
  ): RecoveryEntry {
    const id = `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();
    const entry: RecoveryEntry = {
      ...data,
      id,
      createdAt: now,
    };
    this.recoveryEntries.set(id, entry);

    if (vitalData) {
      const vitId = `vit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      const vital: VitalMeasurement = {
        id: vitId,
        patientId: data.patientId,
        recoveryEntryId: id,
        recordedAt: data.recordedAt || now,
        temperatureC: vitalData.temperatureC ?? null,
        heartRateBpm: vitalData.heartRateBpm ?? null,
        systolicBp: vitalData.systolicBp ?? null,
        diastolicBp: vitalData.diastolicBp ?? null,
        spO2Percent: vitalData.spO2Percent ?? null,
        drainOutputMl: vitalData.drainOutputMl ?? null,
        createdAt: now,
      };
      this.vitalMeasurements.set(vitId, vital);
      entry.vitals = [vital];
    }

    return entry;
  }

  // --- Document Operations ---
  public getDocumentsByPatientId(patientId: string): MedicalDocument[] {
    const docs = Array.from(this.documents.values())
      .filter((d) => d.patientId === patientId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return docs.map((doc) => {
      const ocr = this.ocrExtractions.get(doc.id);
      return {
        ...doc,
        ocrExtraction: ocr || null,
      };
    });
  }

  public getDocumentById(id: string): MedicalDocument | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    const ocr = this.ocrExtractions.get(doc.id);
    return {
      ...doc,
      ocrExtraction: ocr || null,
    };
  }

  public createDocument(
    data: Omit<MedicalDocument, 'id' | 'uploadedAt'>,
    initialOcr?: Partial<OcrExtraction>
  ): MedicalDocument {
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();
    const doc: MedicalDocument = {
      ...data,
      id,
      uploadedAt: now,
    };
    this.documents.set(id, doc);

    if (initialOcr) {
      const ocrId = `ocr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      const extraction: OcrExtraction = {
        id: ocrId,
        documentId: id,
        status: initialOcr.status || 'PENDING',
        rawExtractedText: initialOcr.rawExtractedText || null,
        extractedMetadata: initialOcr.extractedMetadata || null,
        isVerified: initialOcr.isVerified || false,
        reviewedByUserId: initialOcr.reviewedByUserId || null,
        reviewedAt: initialOcr.reviewedAt || null,
        correctionNotes: initialOcr.correctionNotes || null,
        createdAt: now,
        updatedAt: now,
      };
      this.ocrExtractions.set(id, extraction);
      doc.ocrExtraction = extraction;
    }

    return doc;
  }

  public deleteDocument(patientId: string, documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc || doc.patientId !== patientId) return false;
    this.documents.delete(documentId);
    this.ocrExtractions.delete(documentId);
    return true;
  }

  public updateOcrReview(
    documentId: string,
    reviewedByUserId: string,
    isVerified: boolean,
    correctedText?: string,
    correctionNotes?: string
  ): OcrExtraction | null {
    const extraction = this.ocrExtractions.get(documentId);
    if (!extraction) return null;

    const now = new Date().toISOString();
    const updated: OcrExtraction = {
      ...extraction,
      status: isVerified ? 'REVIEWED' : extraction.status,
      isVerified,
      reviewedByUserId,
      reviewedAt: now,
      rawExtractedText: correctedText !== undefined ? correctedText : extraction.rawExtractedText,
      correctionNotes: correctionNotes || extraction.correctionNotes,
      updatedAt: now,
    };
    this.ocrExtractions.set(documentId, updated);
    return updated;
  }

  // --- Timeline Aggregation ---
  public getTimelineByPatientId(patientId: string): TimelineItem[] {
    const items: TimelineItem[] = [];

    // Surgeries
    const surgeries = this.getSurgeriesByPatientId(patientId);
    for (const surg of surgeries) {
      items.push({
        id: `timeline-${surg.id}`,
        type: 'SURGERY',
        title: `Surgical Procedure: ${surg.procedureName}`,
        timestamp: surg.surgeryDate,
        description: `Performed by ${surg.operatingSurgeon} at ${surg.hospitalName} (${surg.hospitalCity}, ${surg.hospitalState}).`,
        details: { ...surg },
        badgeVariant: 'info',
      });

      if (surg.dischargeDate) {
        items.push({
          id: `timeline-dc-${surg.id}`,
          type: 'DISCHARGE',
          title: `Hospital Discharge: ${surg.dischargeCondition}`,
          timestamp: surg.dischargeDate,
          description: surg.woundCareInstructions || 'Discharged to home recovery under follow-up protocol.',
          details: {
            dischargeCondition: surg.dischargeCondition,
            plannedFollowUpDate: surg.plannedFollowUpDate,
          },
          badgeVariant: 'default',
        });
      }
    }

    // Recovery entries & vitals
    const recoveries = this.getRecoveryEntriesByPatientId(patientId);
    for (const rec of recoveries) {
      const vit = rec.vitals && rec.vitals.length > 0 ? rec.vitals[0] : null;
      const vitStr = vit
        ? `Temp: ${vit.temperatureC ?? 'N/A'}°C | BP: ${vit.systolicBp ?? '--'}/${vit.diastolicBp ?? '--'} | HR: ${vit.heartRateBpm ?? '--'} bpm`
        : 'No vitals logged';

      items.push({
        id: `timeline-${rec.id}`,
        type: 'RECOVERY_LOG',
        title: `Recovery Observation (Pain: ${rec.painScore}/10)`,
        timestamp: rec.recordedAt,
        description: `Mobility: ${rec.mobilityStatus} | Wound: ${rec.woundCondition} | Symptoms: ${rec.symptoms.length > 0 ? rec.symptoms.join(', ') : 'None'} | ${vitStr}`,
        details: {
          painScore: rec.painScore,
          mobilityStatus: rec.mobilityStatus,
          woundCondition: rec.woundCondition,
          symptoms: rec.symptoms,
          notes: rec.patientNotes,
          vitals: vit,
        },
        badgeVariant: rec.painScore >= 7 ? 'warning' : 'success',
      });
    }

    // Documents
    const docs = this.getDocumentsByPatientId(patientId);
    for (const doc of docs) {
      const verified = doc.ocrExtraction?.isVerified;
      items.push({
        id: `timeline-${doc.id}`,
        type: verified ? 'OCR_VERIFIED' : 'DOCUMENT',
        title: `Medical Document: ${doc.originalName}`,
        timestamp: doc.uploadedAt,
        description: `Category: ${doc.category} | OCR Status: ${doc.ocrExtraction?.status || 'PENDING'} ${
          verified ? '• Clinically Reviewed & Verified' : '• Pending Review'
        }`,
        details: {
          category: doc.category,
          ocrStatus: doc.ocrExtraction?.status,
          isVerified: verified,
        },
        badgeVariant: verified ? 'success' : 'default',
      });
    }

    // Sort descending by timestamp
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Member 2 Integration Contract Provider ---
  public getMember2RiskContract(patientId: string): RecoveryObservationDataContract | null {
    const patient = this.getPatientById(patientId);
    if (!patient) return null;

    const surgeries = this.getSurgeriesByPatientId(patientId);
    const surgery = surgeries.length > 0 ? surgeries[0] : null;

    const recoveries = this.getRecoveryEntriesByPatientId(patientId);
    const latestRecovery = recoveries.length > 0 ? recoveries[0] : null;
    const latestVital = latestRecovery?.vitals && latestRecovery.vitals.length > 0 ? latestRecovery.vitals[0] : null;

    const docs = this.getDocumentsByPatientId(patientId);
    const unverifiedCount = docs.filter((d) => !d.ocrExtraction?.isVerified).length;

    // Calculate approximate age
    const dob = new Date(patient.dateOfBirth);
    const ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));

    let daysPostOp = 0;
    if (surgery) {
      const sDate = new Date(surgery.surgeryDate);
      daysPostOp = Math.max(0, Math.floor((Date.now() - sDate.getTime()) / (24 * 3600 * 1000)));
    }

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      demographics: {
        ageYears,
        gender: patient.gender,
      },
      surgeryContext: surgery
        ? {
            surgeryId: surgery.id,
            procedureName: surgery.procedureName,
            surgicalSpecialty: surgery.surgicalSpecialty,
            surgeryDate: surgery.surgeryDate,
            dischargeDate: surgery.dischargeDate,
            daysPostOp,
            dischargeCondition: surgery.dischargeCondition,
          }
        : null,
      observation: {
        observationId: latestRecovery?.id || 'NO_OBSERVATION',
        recordedAt: latestRecovery?.recordedAt || new Date().toISOString(),
        reportedByRole: latestRecovery?.reportedByRole || 'PATIENT',
        painScore: {
          value: latestRecovery?.painScore ?? 0,
          scale: 'NRS_0_TO_10',
        },
        mobilityStatus: latestRecovery?.mobilityStatus || 'Unrecorded',
        woundCondition: latestRecovery?.woundCondition || 'Unrecorded',
        symptoms: latestRecovery?.symptoms || [],
        patientNotes: latestRecovery?.patientNotes,
        vitals: {
          temperature: latestVital?.temperatureC
            ? { value: latestVital.temperatureC, unit: 'celsius' }
            : null,
          heartRate: latestVital?.heartRateBpm
            ? { value: latestVital.heartRateBpm, unit: 'bpm' }
            : null,
          bloodPressure:
            latestVital?.systolicBp && latestVital?.diastolicBp
              ? {
                  systolic: latestVital.systolicBp,
                  diastolic: latestVital.diastolicBp,
                  unit: 'mmHg',
                }
              : null,
          spO2: latestVital?.spO2Percent
            ? { value: latestVital.spO2Percent, unit: 'percent' }
            : null,
          drainOutput: latestVital?.drainOutputMl
            ? { value: latestVital.drainOutputMl, unit: 'ml' }
            : null,
        },
      },
      historicalObservationsCount: recoveries.length,
      unverifiedDocumentCount: unverifiedCount,
      dataQuality: (() => {
        let hoursSince: number | null = null;
        let isStale = true;
        let freshness: 'CURRENT' | 'STALE' | 'NONE' = 'NONE';
        const warnings: string[] = [];
        const missingVitals: string[] = [];

        if (latestRecovery) {
          const recTime = new Date(latestRecovery.recordedAt).getTime();
          hoursSince = Math.max(0, Math.floor((Date.now() - recTime) / (3600 * 1000)));
          isStale = hoursSince > 48;
          freshness = isStale ? 'STALE' : 'CURRENT';

          if (isStale) {
            warnings.push(`Observation data is ${hoursSince} hours old (>48h window). Risk assessment must account for stale recovery records.`);
          }
        } else {
          warnings.push('No recovery observations have been logged for this patient yet.');
        }

        if (!latestVital?.temperatureC) missingVitals.push('temperature');
        if (!latestVital?.heartRateBpm) missingVitals.push('heartRate');
        if (!latestVital?.systolicBp || !latestVital?.diastolicBp) missingVitals.push('bloodPressure');
        if (!latestVital?.spO2Percent) missingVitals.push('spO2');

        if (missingVitals.length > 0) {
          warnings.push(`Missing vital sign measurements: ${missingVitals.join(', ')}.`);
        }

        if (unverifiedCount > 0) {
          warnings.push(`${unverifiedCount} diagnostic documents remain unverified by clinicians. Do not rely on unreviewed OCR.`);
        }

        return {
          observationFreshnessStatus: freshness,
          isStale,
          hoursSinceLastObservation: hoursSince,
          missingVitalFields: missingVitals,
          dataQualityWarnings: warnings,
        };
      })(),
    };
  }
}

// Global singleton instance
const globalStore = (global as unknown as { __teleFollowUpStore?: DataStore });
if (!globalStore.__teleFollowUpStore) {
  globalStore.__teleFollowUpStore = new DataStore();
}

export const db = globalStore.__teleFollowUpStore;
