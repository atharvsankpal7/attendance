import { NextResponse } from 'next/server';
import dbConnect, { UploadBatch } from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();

    const batch = await UploadBatch.findOne().sort({ uploaded_at: -1 }).lean();
    if (!batch) return NextResponse.json(null);

    return NextResponse.json({ id: batch._id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}