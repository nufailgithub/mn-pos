/**
 * Email Templates
 * 
 * DESIGN PRINCIPLES:
 * - Responsive: Works on mobile & desktop
 * - Accessible: High contrast, clear CTAs
 * - Tested: Works in Gmail, Outlook, Apple Mail
 * - Secure: No external resources (inline CSS)
 * 
 * WHY INLINE CSS:
 * - Some email clients strip <style> tags
 * - Inline CSS works everywhere
 */

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiryHours: number;
}

/**
 * Password Reset Email Template
 * 
 * STRUCTURE:
 * 1. Header with logo/branding
 * 2. Clear explanation
 * 3. Prominent CTA button
 * 4. Security warnings
 * 5. Footer with support info
 */
export function getPasswordResetEmailHtml({
  userName,
  resetUrl,
  expiryHours,
}: PasswordResetEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  
  <!-- Main Container -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Email Content Card -->
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🔐 Password Reset
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #333333;">
                Hello <strong>${userName}</strong>,
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #666666;">
                We received a request to reset your password for your <strong>MN Collection POS</strong> account. 
                Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 20px 0; font-size: 14px; line-height: 20px; color: #999999; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #667eea; word-break: break-all; text-align: center;">
                ${resetUrl}
              </p>
              
              <!-- Expiry Warning -->
              <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #856404;">
                      ⏰ <strong>Important:</strong> This link will expire in <strong>${expiryHours} hour${expiryHours > 1 ? 's' : ''}</strong>. 
                      If you don't reset your password within this time, you'll need to request a new link.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #f8f9fa; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 20px; color: #333333;">
                      <strong>🛡️ Security Tips:</strong>
                    </p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #666666;">
                      <li>Never share your password with anyone</li>
                      <li>Use a strong, unique password</li>
                      <li>Enable two-factor authentication if available</li>
                      <li>If you didn't request this, ignore this email</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Didn't Request -->
              <p style="margin: 30px 0 0; font-size: 14px; line-height: 20px; color: #999999;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will remain unchanged and your account is secure.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #666666; text-align: center;">
                <strong>MN Collection POS System</strong>
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                This is an automated message, please do not reply to this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                Need help? Contact support at <a href="mailto:support@mncollection.com" style="color: #667eea; text-decoration: none;">support@mncollection.com</a>
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Legal Footer -->
        <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="padding: 0 20px; text-align: center; font-size: 11px; line-height: 16px; color: #999999;">
              © ${new Date().getFullYear()} MN Collection. All rights reserved.
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

/**
 * Password Reset Success Email Template
 * 
 * WHY: Confirm password change (security best practice)
 */
export function getPasswordResetSuccessEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ✅ Password Reset Successful
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #333333;">
                Hello <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #666666;">
                Your password for <strong>MN Collection POS</strong> has been successfully reset. 
                You can now log in with your new password.
              </p>
              
              <!-- Security Alert -->
              <table role="presentation" style="width: 100%; margin: 30px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #92400e;">
                      <strong>⚠️ Important Security Notice:</strong><br>
                      If you didn't make this change, your account may have been compromised. 
                      Please contact support immediately at 
                      <a href="mailto:support@mncollection.com" style="color: #92400e; font-weight: 600;">support@mncollection.com</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; font-size: 14px; line-height: 20px; color: #666666;">
                Password changed at: <strong>${new Date().toLocaleString()}</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #666666; text-align: center;">
                <strong>MN Collection POS System</strong>
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                This is an automated security notification.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}
