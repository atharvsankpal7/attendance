import { supabase, AttendanceRecord, UploadBatch } from '../utils/supabase';
import { AttendanceRecord as ExcelRecord } from '../utils/excelTemplate';

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
  const totalStudents = records.length;
  const defaulters = records.filter(r => r.attendancePercentage < 75);
  const totalDefaulters = defaulters.length;
  const averageAttendance = records.reduce((sum, r) => sum + r.attendancePercentage, 0) / totalStudents;

  const { data: batch, error: batchError } = await supabase
    .from('upload_batches')
    .insert({
      class_name: className,
      total_students: totalStudents,
      total_defaulters: totalDefaulters,
      average_attendance: averageAttendance,
      uploaded_by: 'Teacher'
    })
    .select()
    .single();

  if (batchError) throw batchError;

  const attendanceRecords: Omit<AttendanceRecord, 'id'>[] = records.map(record => ({
    roll_number: record.rollNumber,
    name: record.name,
    gender: record.gender,
    attendance_days: record.attendanceDays,
    total_days: record.totalDays,
    attendance_percentage: record.attendancePercentage,
    student_email: record.studentEmail,
    parent_email: record.parentEmail,
    is_defaulter: record.attendancePercentage < 75,
    batch_id: batch.id,
    class_name: className
  }));

  const { error: recordsError } = await supabase
    .from('attendance_records')
    .insert(attendanceRecords);

  if (recordsError) throw recordsError;

  return batch.id;
};

export const getAnalysisData = async (batchId: string): Promise<AnalysisData> => {
  const { data: batch, error: batchError } = await supabase
    .from('upload_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError) throw batchError;

  const { data: records, error: recordsError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('batch_id', batchId)
    .order('attendance_percentage', { ascending: false });

  if (recordsError) throw recordsError;

  const genderStats = {
    male: records.filter(r => r.gender.toLowerCase() === 'male').length,
    female: records.filter(r => r.gender.toLowerCase() === 'female').length
  };

  const defaulters = records.filter(r => r.is_defaulter);
  const defaulterStats = {
    total: defaulters.length,
    male: defaulters.filter(r => r.gender.toLowerCase() === 'male').length,
    female: defaulters.filter(r => r.gender.toLowerCase() === 'female').length
  };

  const sortedByAttendance = [...records].sort((a, b) => b.attendance_percentage - a.attendance_percentage);

  const insights = {
    averageAttendance: batch.average_attendance,
    highestAttendance: {
      name: sortedByAttendance[0]?.name || 'N/A',
      percentage: sortedByAttendance[0]?.attendance_percentage || 0
    },
    lowestAttendance: {
      name: sortedByAttendance[sortedByAttendance.length - 1]?.name || 'N/A',
      percentage: sortedByAttendance[sortedByAttendance.length - 1]?.attendance_percentage || 0
    },
    topStudents: sortedByAttendance.slice(0, 5).map(r => ({
      name: r.name,
      percentage: r.attendance_percentage
    }))
  };

  return {
    batch,
    records,
    genderStats,
    defaulterStats,
    insights
  };
};

export const getLatestBatchId = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('upload_batches')
    .select('id')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
};
