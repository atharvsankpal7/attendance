import { AttendanceRecord as ExcelRecord } from '../utils/excelTemplate';

// Backend API base (local server)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export interface AttendanceRecord {
  id?: string;
  roll_number: string;
  name: string;
  gender: string;
  attendance_days: number;
  total_days: number;
  attendance_percentage: number;
  student_email: string;
  parent_email: string;
  is_defaulter: boolean;
  batch_id?: string;
  class_name?: string;
  uploaded_at?: string;
}

export interface UploadBatch {
  id?: string;
  class_name: string;
  total_students: number;
  total_defaulters: number;
  average_attendance: number;
  uploaded_by: string;
  uploaded_at?: string;
}

export interface AnalysisData {
  batch: UploadBatch;
  records: AttendanceRecord[];
  genderStats: {
    male: number;
    female: number;
  };
  defaulterStats: {
    total: number;
    male: number;
    female: number;
  };
  insights: {
    averageAttendance: number;
    highestAttendance: { name: string; percentage: number };
    lowestAttendance: { name: string; percentage: number };
    topStudents: Array<{ name: string; percentage: number }>;
  };
}

export const uploadAttendanceData = async (
  records: ExcelRecord[],
  className: string = 'Default Class'
): Promise<string> => {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, className })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const data = await res.json();
  return data.id;
};

export const getAnalysisData = async (batchId: string): Promise<AnalysisData> => {
  const res = await fetch(`${API_BASE}/analysis/${batchId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch analysis' }));
    throw new Error(err.error || 'Failed to fetch analysis');
  }
  const json = await res.json();
  return json as AnalysisData;
};

export const getLatestBatchId = async (): Promise<string | null> => {
  const res = await fetch(`${API_BASE}/batches/latest`);
  if (!res.ok) {
    console.warn('Failed to get latest batch id from API');
    return null;
  }
  const json = await res.json();
  return json?.id || null;
};
