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

const nodemailer = require('nodemailer');

// Setup mail transporter if env provided
let mailTransporter = null;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Attendance <no-reply@example.com>';

if (EMAIL_USER && EMAIL_PASS) {
    mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    // verify transporter
    mailTransporter.verify((err, success) => {
        if (err) console.warn('Mail transporter verification failed:', err.message || err);
        else console.log('Mail transporter ready');
    });
}

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

        const results = [];

        if (!mailTransporter) {
            // Not configured: simulate
            const simulated = defaulters.map(d => ({ success: true, email: d.student_email, message: `Email simulated for ${d.name}` }));
            const successCount = simulated.filter(r => r.success).length;
            return res.json({ success: true, sent: successCount, total: defaulters.length, results: simulated, message: 'Email simulation completed. Set EMAIL_USER and EMAIL_PASS to send real emails.' });
        }

        for (const d of defaulters) {
            const mailOptions = {
                from: EMAIL_FROM,
                to: d.student_email,
                cc: d.parent_email,
                subject: 'Attendance Alert - Low Attendance Warning',
                html: `
                <p>Dear ${d.name},</p>
                <p>Your attendance is ${Number(d.attendance_percentage).toFixed(2)}% which is below the required threshold of 75%.</p>
                <p>Please contact your academic advisor and take immediate action.</p>
                <p>Regards,<br/>Attendance Monitoring Team</p>
                `
            };

            try {
                const info = await mailTransporter.sendMail(mailOptions);
                results.push({ success: true, email: d.student_email, message: `Sent: ${info.messageId}` });
            } catch (err) {
                console.error('Failed to send email to', d.student_email, err);
                results.push({ success: false, email: d.student_email, error: err.message || String(err) });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return res.json({ success: true, sent: successCount, total: defaulters.length, results, message: 'Emails processed (some may have failed). See results for details.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Server listening on port', port));
