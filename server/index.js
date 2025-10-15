require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_local';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Connected to MongoDB:', mongoUri);
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

const { Schema } = mongoose;

const UploadBatchSchema = new Schema({
    class_name: { type: String, default: '' },
    total_students: { type: Number, default: 0 },
    total_defaulters: { type: Number, default: 0 },
    average_attendance: { type: Number, default: 0 },
    uploaded_by: { type: String, default: '' },
    uploaded_at: { type: Date, default: Date.now }
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

const UploadBatch = mongoose.model('UploadBatch', UploadBatchSchema);
const AttendanceRecord = mongoose.model('AttendanceRecord', AttendanceRecordSchema);

// Routes
app.post('/api/upload', async (req, res) => {
    try {
        const { records, className } = req.body;
        if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ error: 'No records provided' });

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

        await AttendanceRecord.insertMany(attendanceDocs);

        return res.json({ id: batch._id });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/batches/latest', async (req, res) => {
    try {
        const batch = await UploadBatch.findOne().sort({ uploaded_at: -1 }).lean();
        if (!batch) return res.json(null);
        return res.json({ id: batch._id });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/analysis/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await UploadBatch.findById(batchId).lean();
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

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

        return res.json({ batch, records, genderStats, defaulterStats, insights });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/send-defaulter-emails', async (req, res) => {
    try {
        const { defaulters } = req.body;
        if (!Array.isArray(defaulters)) return res.status(400).json({ error: 'Invalid payload' });

        // For now, simulate sending and return a summary like original supabase function did
        const results = defaulters.map(d => ({ success: true, email: d.student_email, message: `Email simulated for ${d.name}` }));
        const successCount = results.filter(r => r.success).length;
        return res.json({ success: true, sent: successCount, total: defaulters.length, results, message: 'Email simulation completed. Configure SMTP to send real emails.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Server listening on port', port));
