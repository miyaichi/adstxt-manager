import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Create a Nodemailer transporter with MailHog configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false, // MailHog doesn't use SSL
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined, // MailHog typically doesn't require authentication
  tls: {
    rejectUnauthorized: false, // For development, accept self-signed certs
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

export default transporter;
