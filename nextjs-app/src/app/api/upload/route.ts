import { NextResponse } from 'next/server';
import dbConnect, { UploadBatch, AttendanceRecord, History } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { records, className } = await request.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const totalStudents = records.length;
    const defaulters = records.filter(r => r.attendancePercentage < 75);
    const totalDefaulters = defaulters.length;
    const averageAttendance = records.reduce((sum, r) => sum + r.attendancePercentage, 0) / totalStudents;

    const batch = await UploadBatch.create({
        class_name: className || 'Default Class',
        total_students: totalStudents,
        total_defaulters: totalDefaulters,
        average_attendance: averageAttendance,
        uploaded_by: 'Teacher'
    });

    const attendanceDocs = records.map(r => ({
        roll_number: r.rollNumber,
        name: r.name,
        gender: r.gender,
        attendance_days: r.attendanceDays,
        total_days: r.totalDays,
        attendance_percentage: r.attendancePercentage,
        student_email: r.studentEmail,
        parent_email: r.parentEmail,
        is_defaulter: r.attendancePercentage < 75,
        batch_id: batch._id,
        class_name: className
    }));

    const inserted = await AttendanceRecord.insertMany(attendanceDocs);

    batch.records = inserted.map(d => d._id);
    await batch.save();

    const defaulterDocs = inserted.filter(d => d.is_defaulter);
    await History.create({
        batch: batch._id,
        defaulter_count: defaulterDocs.length,
        defaulters: defaulterDocs.map(d => d._id),
        uploaded_by: 'Teacher'
    });

    return NextResponse.json({ id: batch._id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}