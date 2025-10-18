import { NextResponse } from 'next/server';
import dbConnect, { UploadBatch } from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();

    const batches = await UploadBatch.find().sort({ uploaded_at: -1 }).lean();
    const mapped = batches.map(b => ({
        id: b._id,
        class_name: b.class_name,
        total_students: b.total_students,
        total_defaulters: b.total_defaulters,
        average_attendance: b.average_attendance,
        uploaded_at: b.uploaded_at
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}