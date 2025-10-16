import nodemailer from 'nodemailer';

let cachedMailTransporter = null;

export async function getMailTransporter() {
    if (cachedMailTransporter) {
        return cachedMailTransporter;
    }

    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('Mail transporter not configured: EMAIL_USER or EMAIL_PASS missing. Running in simulation mode.');
        return null;
    }

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

            await new Promise((resolve, reject) => {
                transporter.verify((err, success) => {
                    if (err) return reject(err);
                    return resolve(success);
                });
            });

            console.log('Mail transporter ready (SMTP -> ' + a.label + ') for', EMAIL_USER);
            cachedMailTransporter = transporter;
            return transporter;
        } catch (err) {
            console.warn(`Mail transporter verification failed for ${a.label}:`, err && (err.message || err));
        }
    }

    console.error('All mail transporter verification attempts failed. Mail will run in simulation mode.');
    return null;
}