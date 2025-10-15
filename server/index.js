const path = require('path');
const dotenv = require('dotenv');

// Try loading .env from common locations and log which (if any) was loaded.
const envCandidates = [
    path.resolve(__dirname, '.env'),       // server/.env
    path.resolve(__dirname, '..', '.env'), // repo root .env
    path.resolve(process.cwd(), '.env')    // current working dir .env
];
let loadedEnv = null;
for (const p of envCandidates) {
    try {
        const result = dotenv.config({ path: p });
        if (!result.error) {
            loadedEnv = p;
            break;
        }
    } catch (e) {
        // ignore and try next
    }
}
console.log('dotenv loaded from:', loadedEnv || 'none (no .env found in common locations)');
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

const UploadBatch = mongoose.model('UploadBatch', UploadBatchSchema);
const AttendanceRecord = mongoose.model('AttendanceRecord', AttendanceRecordSchema);

const HistorySchema = new Schema({
    batch: { type: Schema.Types.ObjectId, ref: 'UploadBatch' },
    defaulter_count: { type: Number, default: 0 },
    defaulters: [{ type: Schema.Types.ObjectId, ref: 'AttendanceRecord' }],
    uploaded_at: { type: Date, default: Date.now },
    uploaded_by: { type: String, default: '' }
});

const History = mongoose.model('History', HistorySchema);

const nodemailer = require('nodemailer');

// Setup mail transporter if env provided
let mailTransporter = null;
// IMPORTANT: do NOT provide secrets/defaults in source code. Read from env only.
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;

async function setupMailTransporter() {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('Mail transporter not configured: EMAIL_USER or EMAIL_PASS missing. Running in simulation mode.');
        return null;
    }

    // Try port 465 (secure) first, then fallback to 587 (STARTTLS)
    const attempts = [
        { host: 'smtp.gmail.com', port: 465, secure: true, label: 'smtp.gmail.com:465 (SSL)' },
        { host: 'smtp.gmail.com', port: 587, secure: false, label: 'smtp.gmail.com:587 (STARTTLS)' }
    ];

    for (const a of attempts) {
        try {
            const transporter = nodemailer.createTransport({
                host: a.host,
                port: a.port,
                secure: a.secure,
                auth: { user: EMAIL_USER, pass: EMAIL_PASS },
                tls: { rejectUnauthorized: false }
            });

            // wrap verify in a promise so we can await result synchronously
            await new Promise((resolve, reject) => {
                transporter.verify((err, success) => {
                    if (err) return reject(err);
                    return resolve(success);
                });
            });

            console.log('Mail transporter ready (SMTP -> ' + a.label + ') for', EMAIL_USER);

            // attach optional debug hooks
            transporter.on && transporter.on('idle', () => console.debug('Mail transporter idle event'));
            return transporter;
        } catch (err) {
            console.warn(`Mail transporter verification failed for ${a.label}:`, err && (err.message || err));
            // try next
        }
    }

    console.error('All mail transporter verification attempts failed. Mail will run in simulation mode.');
    return null;
}

(async () => {
    try {
        mailTransporter = await setupMailTransporter();
    } catch (err) {
        console.error('Unexpected error while setting up mail transporter:', err && (err.message || err));
        mailTransporter = null;
    }
})();

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

        const inserted = await AttendanceRecord.insertMany(attendanceDocs);

        // attach record ids to batch
        batch.records = inserted.map(d => d._id);
        await batch.save();

        // create a history record for this scan
        const defaulterDocs = inserted.filter(d => d.is_defaulter);
        await History.create({
            batch: batch._id,
            defaulter_count: defaulterDocs.length,
            defaulters: defaulterDocs.map(d => d._id),
            uploaded_by: 'Teacher'
        });

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

// Return list of all batches (history)
app.get('/api/batches', async (req, res) => {
    try {
        const batches = await UploadBatch.find().sort({ uploaded_at: -1 }).lean();
        const mapped = batches.map(b => ({
            id: b._id,
            class_name: b.class_name,
            total_students: b.total_students,
            total_defaulters: b.total_defaulters,
            average_attendance: b.average_attendance,
            uploaded_at: b.uploaded_at
        }));
        return res.json(mapped);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Return history scan entries
app.get('/api/history', async (req, res) => {
    try {
        const entries = await History.find().sort({ uploaded_at: -1 }).populate('batch').lean();
        const mapped = entries.map(e => ({
            id: e._id,
            batch_id: e.batch?._id,
            batch_class_name: e.batch?.class_name,
            defaulter_count: e.defaulter_count,
            uploaded_at: e.uploaded_at
        }));
        return res.json(mapped);
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
        console.log('/api/send-defaulter-emails called, defaulters count=', defaulters.length);

        if (!mailTransporter) {
            // Not configured: simulate and return explicit flag so caller can react
            console.warn('Mail transporter not configured: running in simulation mode for send-defaulter-emails');
            const simulated = defaulters.map(d => ({ success: true, email: d.student_email, message: `Email simulated for ${d.name}` }));
            const successCount = simulated.filter(r => r.success).length;
            console.debug('Simulated results sample:', simulated.slice(0, 3));
            return res.status(200).json({ success: true, simulated: true, sent: successCount, total: defaulters.length, results: simulated, message: 'Email simulation completed. Set EMAIL_USER and EMAIL_PASS (Gmail app password) in server .env to send real emails.' });
        }

        for (const d of defaulters) {
            console.debug('Preparing to send email to:', d.student_email, 'cc:', d.parent_email, 'name:', d.name);
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
                const start = Date.now();
                const info = await mailTransporter.sendMail(mailOptions);
                const duration = Date.now() - start;
                console.log(`Email sent to ${d.student_email} messageId=${info && info.messageId} duration=${duration}ms`);
                console.debug('SMTP accepted/rejected:', info && { accepted: info.accepted, rejected: info.rejected });
                results.push({ success: true, email: d.student_email, message: `Sent: ${info.messageId || 'unknown'}`, info: { accepted: info.accepted, rejected: info.rejected } });
            } catch (err) {
                console.error('Failed to send email to', d.student_email, 'error:', err && (err.message || err));
                // If nodemailer gives response with response or code, include it
                const errDetails = {
                    message: err && err.message,
                    code: err && err.code,
                    response: err && err.response
                };
                results.push({ success: false, email: d.student_email, error: errDetails });
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
