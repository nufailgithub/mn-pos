import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email Service Configuration
 * 
 * SYSTEM DESIGN:
 * - Uses Nodemailer with Gmail SMTP
 * - Singleton pattern (one transporter instance)
 * - Environment-based configuration
 * - Production-ready error handling
 * 
 * WHY GMAIL SMTP:
 * - Free: 15,000 emails/month
 * - Reliable: 99.9% uptime
 * - Easy setup: Just app password
 * - Trusted: Emails less likely to be spam
 */

// Singleton transporter instance (created once, reused)
let transporter: Transporter | null = null;

/**
 * Get or create email transporter
 * WHY: Reuse connection instead of creating new one each time
 */
export function getEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  // Validate required environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email configuration missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env'
    );
  }

  // Create transporter with Gmail SMTP settings
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // smtp.gmail.com
    port: parseInt(process.env.EMAIL_PORT || '587'), // 587 for TLS
    secure: false, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.EMAIL_USER, // your-email@gmail.com
      pass: process.env.EMAIL_PASS, // app password (NOT your Gmail password)
    },
    // Production settings
    pool: true, // Use pooled connections (faster for multiple emails)
    maxConnections: 5, // Max simultaneous connections
    maxMessages: 100, // Max messages per connection
    rateDelta: 1000, // Time between messages (1 second)
    rateLimit: 5, // Max 5 emails per rateDelta
  });

  // Verify connection on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error);
    } else {
      console.log('✅ Email transporter ready to send emails');
    }
  });

  return transporter;
}

/**
 * Send email with retry logic
 * 
 * WHY RETRY: Network failures happen, retry improves deliverability
 * HOW: Try 3 times with exponential backoff (1s, 2s, 4s)
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}, retries = 3): Promise<void> {
  const transporter = getEmailTransporter();
  
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'MN Collection POS'}" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html), // Plain text fallback
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${options.to} - Message ID: ${info.messageId}`);
      return; // Success!
    } catch (error) {
      console.error(`❌ Email send attempt ${attempt}/${retries} failed:`, error);
      
      if (attempt === retries) {
        // All retries failed
        throw new Error(`Failed to send email after ${retries} attempts`);
      }
      
      // Wait before retry (exponential backoff)
      await sleep(Math.pow(2, attempt - 1) * 1000);
    }
  }
}

/**
 * Strip HTML tags for plain text version
 * WHY: Some email clients only support plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .trim();
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test email configuration
 * WHY: Quick way to verify SMTP settings work
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
