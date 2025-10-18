import { NextResponse } from 'next/server';
import dbConnect, { History } from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();

    const entries = await History.find().sort({ uploaded_at: -1 }).populate('batch').lean();
    const mapped = entries.map(e => ({
        id: e._id,
        batch_id: e.batch?._id,
        batch_class_name: e.batch?.class_name,
        defaulter_count: e.defaulter_count,
        uploaded_at: e.uploaded_at
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}