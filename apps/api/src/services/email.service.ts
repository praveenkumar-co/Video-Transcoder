import { env } from '../env';
import mailerTransporter from '../config/mailer.config';

interface SendContactEmailParams {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  message: string;
}

export class EmailService {

  public static async sendContactQuery({
    firstName,
    lastName,
    email,
    countryCode,
    phone,
    message,
  }: SendContactEmailParams): Promise<boolean> {
    const adminEmail = env.ADMIN_EMAIL;
    const subject = `[VideoForge Get in Touch] Query from ${firstName} ${lastName}`;

    const textContent = `
New Query Received:

Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${countryCode} ${phone}

Message:
${message}
    `;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 12px; background-color: #fafafa;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">VideoForge</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.8;">New "Get in Touch" Query Received</p>
        </div>
        
        <div style="padding: 24px; background-color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Sender Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; width: 120px;">Name:</td>
                <td style="padding: 6px 0;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600;">Email:</td>
                <td style="padding: 6px 0;">
                  <a href="mailto:${email}" style="color: #2dd4bf; text-decoration: none; font-weight: 500;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600;">Phone:</td>
                <td style="padding: 6px 0;">${countryCode} ${phone}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Message / Query</h3>
            <div style="background-color: #f8fafc; border-left: 4px solid #2dd4bf; padding: 16px; border-radius: 0 8px 8px 0; font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${message}</div>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="mailto:${email}" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: background 0.2s;">
              Reply Direct to Sender
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p>© 2026 VideoForge Infrastructure. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      // "From" must match the authenticated Gmail user to avoid Gmail rejections
      from: `"VideoForge Contact" <${env.SMTP_USER || 'contact@videoforge.dev'}>`,
      to: adminEmail,
      replyTo: email, // Admin reply goes directly back to the customer
      subject,
      text: textContent,
      html: htmlContent,
    };

    // Check if SMTP credentials are set (mailerTransporter uses process.env directly)
    if (env.SMTP_USER && env.SMTP_PASS) {
      try {
        const info = await mailerTransporter.sendMail(mailOptions);
        console.info(`[EmailService] Contact message sent to ${adminEmail}. MessageId: ${info.messageId}`);
        return true;
      } catch (err) {
        console.error('[EmailService] Failed to send email via Gmail SMTP:', err);
        // Record is already saved to MongoDB — return false but don't throw
        return false;
      }
    } else {
      // SMTP not configured — log details, still mark submission successful
      console.warn('========================================================================');
      console.warn('⚠️  [EmailService] SMTP_USER / SMTP_PASS not set — email delivery disabled.');
      console.warn('Submission saved in MongoDB, email mock details logged below:');
      console.warn(`FROM:       ${env.SMTP_USER || 'contact@videoforge.dev'}`);
      console.warn(`TO:         ${adminEmail}`);
      console.warn(`REPLY-TO:   ${email}`);
      console.warn(`SUBJECT:    ${subject}`);
      console.warn('CONTENT:');
      console.warn(textContent);
      console.warn('========================================================================');
      return true;
    }
  }
}
