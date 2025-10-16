import { NextResponse } from 'next/server';
import dbConnect, { UploadBatch, AttendanceRecord } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { batchId: string } }) {
  try {
    await dbConnect();

    const { batchId } = params;
    if (!batchId) {
      return NextResponse.json({ error: 'batchId query parameter is required' }, { status: 400 });
    }

    const batch = await UploadBatch.findById(batchId).lean();
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const records = await AttendanceRecord.find({ batch_id: batchId }).lean();

    const genderStats = {
        male: records.filter(r => (r.gender || '').toLowerCase() === 'male').length,
        female: records.filter(r => (r.gender || '').toLowerCase() === 'female').length
    };

    const defaulters = records.filter(r => r.is_defaulter);
    const defaulterStats = {
        total: defaulters.length,
        male: defaulters.filter(r => (r.gender || '').toLowerCase() === 'male').length,
        female: defaulters.filter(r => (r.gender || '').toLowerCase() === 'female').length
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
        topStudents: sortedByAttendance.slice(0, 5).map(r => ({ name: r.name, percentage: r.attendance_percentage }))
    };

    return NextResponse.json({ batch, records, genderStats, defaulterStats, insights });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}