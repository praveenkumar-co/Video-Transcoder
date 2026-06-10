import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export async function verifyMailer(): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP_USER / SMTP_PASS not set — email delivery is disabled.');
    return;
  }
  try {
    await transporter.verify();
    console.info('[mailer] Gmail SMTP connection verified ✓');
  } catch (err) {
    console.error('[mailer] Gmail SMTP verification failed:', err);
  }
}

export default transporter;
