import mongoose, { Schema } from 'mongoose';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_local';

if (!mongoUri) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const UploadBatchSchema = new Schema({
    class_name: { type: String, default: '' },
    total_students: { type: Number, default: 0 },
    total_defaulters: { type: Number, default: 0 },
    average_attendance: { type: Number, default: 0 },
    uploaded_by: { type: String, default: '' },
    uploaded_at: { type: Date, default: Date.now },
    records: [{ type: Schema.Types.ObjectId, ref: 'AttendanceRecord' }]
});

const AttendanceRecordSchema = new Schema({
    roll_number: String,
    name: String,
    gender: String,
    attendance_days: Number,
    total_days: Number,
    attendance_percentage: Number,
    student_email: String,
    parent_email: String,
    is_defaulter: Boolean,
    batch_id: { type: Schema.Types.ObjectId, ref: 'UploadBatch' },
    class_name: String,
    uploaded_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
});

const HistorySchema = new Schema({
    batch: { type: Schema.Types.ObjectId, ref: 'UploadBatch' },
    defaulter_count: { type: Number, default: 0 },
    defaulters: [{ type: Schema.Types.ObjectId, ref: 'AttendanceRecord' }],
    uploaded_at: { type: Date, default: Date.now },
    uploaded_by: { type: String, default: '' }
});

export const UploadBatch = mongoose.models.UploadBatch || mongoose.model('UploadBatch', UploadBatchSchema);
export const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
export const History = mongoose.models.History || mongoose.model('History', HistorySchema);

export default dbConnect;