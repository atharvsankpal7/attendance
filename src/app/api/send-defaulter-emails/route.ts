import { NextResponse } from 'next/server';
import { getMailTransporter } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const { defaulters } = await request.json();
    if (!Array.isArray(defaulters)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const results = [];
    console.log('send-defaulter-emails called, defaulters count=', defaulters.length);

    const mailTransporter = await getMailTransporter();

    if (!mailTransporter) {
        console.warn('Mail transporter not configured: running in simulation mode for send-defaulter-emails');
        const simulated = defaulters.map(d => ({
            success: true,
            email: d.student_email,
            message: `Email simulated for ${d.name}`
        }));
        const successCount = simulated.filter(r => r.success).length;
        console.debug('Simulated results sample:', simulated.slice(0, 3));
        return NextResponse.json({
            success: true,
            simulated: true,
            sent: successCount,
            total: defaulters.length,
            results: simulated,
            message: 'Email simulation completed. Set EMAIL_USER and EMAIL_PASS (Gmail app password) in .env to send real emails.'
        });
    }

    for (const d of defaulters) {
        console.debug('Preparing to send email to:', d.student_email, 'cc:', d.parent_email, 'name:', d.name);
        const mailOptions = {
            from: process.env.EMAIL_FROM,
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
            results.push({
                success: true,
                email: d.student_email,
                message: `Sent: ${info.messageId || 'unknown'}`,
                info: { accepted: info.accepted, rejected: info.rejected }
            });
        } catch (err) {
            console.error('Failed to send email to', d.student_email, 'error:', err && (err.message || err));
            const errDetails = {
                message: err && err.message,
                code: err && err.code,
                response: err && err.response
            };
            results.push({ success: false, email: d.student_email, error: errDetails });
        }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
        success: true,
        sent: successCount,
        total: defaulters.length,
        results,
        message: 'Emails processed (some may have failed). See results for details.'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}