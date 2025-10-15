import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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
