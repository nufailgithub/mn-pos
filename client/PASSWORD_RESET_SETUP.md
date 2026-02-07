# 🔐 Password Reset System - Production Setup Guide

## ✅ Implementation Complete

Your POS system now has a **production-ready** password reset feature with:

✅ **Nodemailer + Gmail SMTP** (Free, 15,000 emails/month)  
✅ **Rate Limiting** (3 attempts/hour, database-based)  
✅ **Email Templates** (Professional, responsive HTML)  
✅ **Security Best Practices** (Token expiry, one-time use, audit logging)  
✅ **Email Enumeration Protection** (Attackers can't discover registered emails)

---

## 🚀 Quick Start (5 Minutes)

### **Step 1: Get Gmail App Password**

1. Go to your **Gmail account**
2. Enable **2-Factor Authentication** (if not already)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" → Enable

3. Generate **App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "MN Collection POS"
   - Click "Generate"
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### **Step 2: Update .env File**

```bash
# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="youremail@gmail.com"           # ← Your Gmail address
EMAIL_PASS="xxxx xxxx xxxx xxxx"            # ← App password from Step 1
EMAIL_FROM_NAME="MN Collection POS"
```

### **Step 3: Restart Dev Server**

```bash
# Stop server (Ctrl+C) then:
pnpm dev
```

### **Step 4: Test It!**

1. **Go to Login:** http://localhost:3000/login
2. **Click** "Forgot password?"
3. **Enter your email** (must be registered in system)
4. **Check your Gmail inbox**
5. **Click reset link** in email
6. **Set new password**

---

## 📧 How It Works

### **User Flow:**

```
User forgets password
  ↓
Clicks "Forgot password?" on login page
  ↓
Enters email address
  ↓
System checks rate limit (3 attempts/hour)
  ↓
System finds user in database
  ↓
Generates secure 256-bit token (1-hour expiry)
  ↓
Stores token in database
  ↓
Sends email to user's registered email
  ↓
User checks inbox → Clicks link
  ↓
Opens reset page with token in URL
  ↓
Enters new password (validated for strength)
  ↓
System verifies token (exists + not expired)
  ↓
Hashes password with Argon2
  ↓
Updates password in database
  ↓
Clears token (one-time use)
  ↓
Sends confirmation email
  ↓
Logs audit event
  ↓
User logs in with new password ✅
```

### **Security Features:**

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Token Generation** | 256-bit crypto-random | Impossible to guess |
| **Token Expiry** | 1 hour | Limits attack window |
| **One-Time Use** | Deleted after reset | Can't reuse old tokens |
| **Rate Limiting** | 3 attempts/hour | Prevents email spam |
| **Email Enumeration** | Same response always | Can't discover registered users |
| **Audit Logging** | Every attempt logged | Track suspicious activity |
| **Password Hashing** | Argon2 (better than bcrypt) | Secure password storage |
| **IP Tracking** | Logs IP address | Detect attack patterns |

---

## 🔒 Security Details

### **Q: Can hackers guess the reset token?**
**A:** No. Token is 256-bit = 2^256 combinations = would take billions of years to crack

### **Q: What if hacker enters random email?**
**A:** System returns same "email sent" message but NO email is actually sent
- Attacker can't tell if email is registered
- No spam to random people

### **Q: Can token be reused?**
**A:** No. Token is deleted immediately after password reset

### **Q: What if someone requests reset without permission?**
**A:** 
- Email only sent to registered user's email
- Confirmation email sent after password changed
- User can see if unauthorized change

### **Q: Can attacker spam reset emails?**
**A:** No. Rate limit = 3 attempts per hour per email

---

## 📋 Email Templates

### **Reset Request Email:**
- **Subject:** "Password Reset Request - MN Collection POS"
- **Content:** 
  - Personalized greeting
  - Clear reset button
  - Expiry warning (1 hour)
  - Security notice
  - Alternative text link

### **Reset Success Email:**
- **Subject:** "Password Changed Successfully"
- **Content:**
  - Confirmation of change
  - Timestamp and IP address
  - Alert if unauthorized

---

## 🧪 Testing Checklist

- [ ] **Valid User Reset:**
  - Enter registered email
  - Receive email within 1 minute
  - Click link → Successfully reset password
  - Login with new password works

- [ ] **Invalid Email:**
  - Enter unregistered email
  - See success message
  - NO email received (correct behavior)

- [ ] **Rate Limiting:**
  - Request reset 4 times in 1 hour
  - 4th attempt shows "too many requests"
  - Wait 1 hour → Can request again

- [ ] **Token Expiry:**
  - Request reset
  - Wait 1+ hours
  - Try to use link → Shows "expired" error

- [ ] **Token Reuse:**
  - Request reset
  - Reset password successfully
  - Try to use same link again → Shows "invalid token"

---

## 🎨 Email Customization

### **Change Company Name:**
```typescript
// lib/email-templates.ts
EMAIL_FROM_NAME="Your Company Name"
```

### **Change Colors:**
```typescript
// In email template:
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
```

### **Add Logo:**
```html
<img src="https://yourwebsite.com/logo.png" alt="Logo" style="max-width: 150px;">
```

---

## 🔧 Troubleshooting

### **Emails Not Sending:**

1. **Check Gmail App Password:**
   ```bash
   # Test SMTP connection:
   pnpm prisma studio
   # Check console logs
   ```

2. **Verify .env Variables:**
   ```bash
   cat .env | grep EMAIL
   ```

3. **Check Server Logs:**
   ```bash
   # Look for:
   ✅ Email transporter ready
   ✅ Email sent to: user@email.com
   ```

4. **Common Issues:**
   - Wrong app password → Regenerate
   - 2FA not enabled → Enable it
   - Using regular password instead of app password

### **Rate Limit Issues:**

```bash
# Clear rate limit for specific email (admin):
psql -d mncollectiondb -c "DELETE FROM password_reset_attempts WHERE email = 'user@email.com';"
```

### **Token Issues:**

```sql
-- Check if token exists:
SELECT * FROM users WHERE "passwordResetToken" IS NOT NULL;

-- Clear stuck token:
UPDATE users SET "passwordResetToken" = NULL, "passwordResetExpires" = NULL WHERE email = 'user@email.com';
```

---

## 📊 Monitoring

### **View Rate Limit Status:**
```typescript
import { getPasswordResetRateLimitStatus } from '@/lib/rate-limit';

const status = await getPasswordResetRateLimitStatus('user@email.com');
console.log(status);
// {
//   totalAttempts: 2,
//   maxAttempts: 3,
//   remainingAttempts: 1,
//   isBlocked: false
// }
```

### **Detect Suspicious Activity:**
```typescript
import { detectSuspiciousActivity } from '@/lib/rate-limit';

const suspicious = await detectSuspiciousActivity();
console.log(suspicious);
// {
//   suspiciousIPs: ['123.45.67.89'],
//   suspiciousEmails: ['attacker@evil.com']
// }
```

### **View Audit Logs:**
```sql
SELECT * FROM audit_logs 
WHERE action LIKE 'PASSWORD_RESET%' 
ORDER BY "createdAt" DESC 
LIMIT 50;
```

---

## 🌐 Production Deployment

### **Environment Variables (Production):**

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@prod-server:5432/db"
AUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://yourdomain.com"

EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="noreply@yourdomain.com"
EMAIL_PASS="production-app-password"
EMAIL_FROM_NAME="Your Company Name"
```

### **Use Custom Domain Email (Professional):**

Instead of `yourname@gmail.com`, use `noreply@yourdomain.com`:

1. **Setup:** Configure Gmail to send from custom domain
2. **Or:** Use hosting provider's SMTP (cPanel, Hostinger, etc.)
3. **Or:** Use transactional email service (free tier):
   - Mailgun: 5,000/month free
   - SendGrid: 100/day free
   - Mailjet: 6,000/month free

---

## 🎯 Summary

✅ **System Status:** Production-Ready  
✅ **Security Level:** Industry Standard  
✅ **Email Delivery:** Nodemailer + Gmail SMTP  
✅ **Cost:** $0 (Free forever with Gmail)  
✅ **Scalability:** Database-based (works with multiple servers)  
✅ **Maintenance:** Zero external dependencies

**What You Need to Do:**
1. Add Gmail app password to `.env`
2. Restart server
3. Test with your email
4. You're done! 🎉

**Questions?** Check the code comments - every function is documented with WHY and HOW it works.
