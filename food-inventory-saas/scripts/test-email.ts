
import { MailService } from '../src/modules/mail/mail.service';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// Load env
dotenv.config();

// Mock ConfigService
const mockConfigService = {
    get: (key: string) => {
        // Handle number conversion for port
        if (key === 'SMTP_PORT') return parseInt(process.env.SMTP_PORT || '587');
        return process.env[key];
    }
} as any;

async function runTest() {
    console.log('🚀 Starting Standalone Email Test...');

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing SMTP credentials in .env');
        process.exit(1);
    }

    console.log('Using SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM
    });

    // Manually instantiate MailService with mocks for unused dependencies
    // Constructor: (config, tenantModel, gmail, outlook, resend)
    const mailService = new MailService(
        mockConfigService,
        null as any, // tenantModel not needed for default SMTP
        null as any, // gmailService not needed
        null as any, // outlookService not needed
        null as any  // resendService not needed
    );

    const testEmail = 'contacto@smartkubik.com';

    try {
        console.log(`📧 Sending test email to ${testEmail}...`);
        await mailService.sendTemplatedEmail({
            to: testEmail,
            subject: '🔮 SmartKubik Backend - Brevo Verification',
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">¡Backend Conectado a Brevo!</h2>
          <p>Este correo confirma que tu configuración SMTP está funcionando correctamente.</p>
          <ul>
            <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
          </ul>
        </div>
      `,
        });
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        if (error.response) {
            console.error('SMTP Response:', error.response);
        }
    }
}

runTest();
