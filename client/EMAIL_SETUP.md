# 📧 Gmail SMTP Setup Guide for Password Reset

## 🎯 **What You Need**

To send password reset emails, you need:
1. A Gmail account (any Gmail account works)
2. Google App Password (NOT your Gmail password)
3. 5 minutes to set up

---

## 🔧 **Step-by-Step Setup**

### **Step 1: Enable 2-Factor Authentication**

**WHY:** Google requires 2FA to use App Passwords (security requirement)

1. Go to: https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow prompts to enable (takes 2 minutes)
4. Verify with your phone

### **Step 2: Generate App Password**

**WHY:** App passwords are safer than using your real Gmail password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter: "MN Collection POS"
5. Click "Generate"
6. **COPY THE 16-DIGIT PASSWORD** (shown once only!)
   - Example: `abcd efgh ijkl mnop`

### **Step 3: Add to .env File**

```bash
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"      # Your actual Gmail
EMAIL_PASS="abcdefghijklmnop"           # 16-digit app password (no spaces!)
EMAIL_FROM_NAME="MN Collection POS"     # Sender name in emails
```

### **Step 4: Test the Configuration**

```bash
# Start your dev server
pnpm dev

# Go to forgot password page
# Enter your email
# Check your inbox!
```

---

## 🔒 **Security Q&A**

### **Q: Is my Gmail password safe?**
**A:** Yes! You're NOT using your Gmail password. App passwords are:
- ✅ Separate from your Gmail password
- ✅ Can be revoked anytime
- ✅ Limited to email sending only
- ✅ Can't access your Gmail account

### **Q: What if someone steals the .env file?**
**A:** They can only send emails, NOT:
- ❌ Read your emails
- ❌ Access your Gmail account
- ❌ Change your password
- ❌ Access other Google services

**Solution:** Revoke the app password immediately:
https://myaccount.google.com/apppasswords

### **Q: How many emails can I send?**
**A:** Gmail free limits:
- 500 emails per day (Google Workspace: 2000/day)
- 15,000 emails per month
- More than enough for most businesses!

### **Q: Will emails go to spam?**
**A:** Gmail SMTP has excellent deliverability:
- ✅ Trusted by Google
- ✅ Proper SPF/DKIM records
- ✅ 95%+ inbox delivery rate

**Tips to avoid spam:**
- Don't send too many at once
- Use professional email content
- Include unsubscribe links (for marketing)

---

## 📊 **System Architecture**

```
┌─────────────┐
│   User      │ Clicks "Forgot Password"
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Frontend       │ /forgot-password page
└──────┬──────────┘
       │ POST /api/auth/forgot-password
       ▼
┌─────────────────┐
│  API Route      │ 1. Validate email
└──────┬──────────┘ 2. Check rate limit (3/hour)
       │            3. Generate token
       │            4. Save to database
       ▼
┌─────────────────┐
│  Email Service  │ 5. Send email via Gmail SMTP
└──────┬──────────┘ 6. Retry on failure (3 attempts)
       │
       ▼
┌─────────────────┐
│  Gmail SMTP     │ 7. Deliver email
└──────┬──────────┘ 8. Track delivery status
       │
       ▼
┌─────────────────┐
│  User Inbox     │ 9. User receives email
└──────┬──────────┘ 10. Clicks reset link
       │
       ▼
┌─────────────────┐
│  Reset Page     │ /reset-password/[token]
└──────┬──────────┘
       │ POST /api/auth/reset-password
       ▼
┌─────────────────┐
│  API Route      │ 11. Validate token
└──────┬──────────┘ 12. Check not expired
       │            13. Hash new password
       │            14. Update database
       ▼            15. Clear token
┌─────────────────┐ 16. Send confirmation email
│  Database       │ 17. Log audit event
└─────────────────┘
```

---

## 🛠️ **Alternative SMTP Providers**

### **Option 1: Gmail (Current)**
- **Cost:** FREE (15,000 emails/month)
- **Setup:** 5 minutes
- **Reliability:** 99.9% uptime
- **Best for:** Small to medium businesses

### **Option 2: Outlook/Hotmail**
```env
EMAIL_HOST="smtp-mail.outlook.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@outlook.com"
EMAIL_PASS="your-outlook-password"
```
- **Cost:** FREE (300 emails/day)
- **Setup:** 3 minutes (no app password needed)

### **Option 3: Custom SMTP (Your Hosting)**
```env
EMAIL_HOST="mail.yourdomain.com"
EMAIL_PORT="587"
EMAIL_USER="noreply@yourdomain.com"
EMAIL_PASS="your-smtp-password"
```
- **Cost:** Usually included with hosting
- **Setup:** 10 minutes
- **Best for:** Professional appearance

### **Option 4: SendGrid (Scalable)**
```bash
pnpm add @sendgrid/mail
```
```env
SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"
```
- **Cost:** FREE (100 emails/day), Paid ($15/mo for 40k)
- **Setup:** 10 minutes
- **Best for:** High volume (100k+ emails/month)

---

## 🎨 **Email Customization**

### **Change Sender Name**
```env
EMAIL_FROM_NAME="Your Company Name"
```

### **Change Email Colors**
Edit: `lib/email-templates.ts`
```typescript
// Change header gradient
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);

// Change button color
background: linear-gradient(135deg, #YOUR_BRAND_COLOR 0%, #DARKER_SHADE 100%);
```

### **Add Company Logo**
```typescript
<img src="https://yourdomain.com/logo.png" 
     alt="Logo" 
     style="width: 120px; height: auto;" />
```

---

## 📈 **Production Checklist**

- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] .env file configured
- [ ] Test email sent successfully
- [ ] Tested password reset flow end-to-end
- [ ] HTTPS enabled (for production)
- [ ] Rate limiting working (test 4th attempt blocked)
- [ ] Audit logs being saved
- [ ] Email templates reviewed and customized
- [ ] Support email address updated in templates

---

## 🐛 **Troubleshooting**

### **Error: "Invalid login"**
- Check email/password correct
- Remove spaces from app password
- Verify 2FA is enabled

### **Error: "Connection timeout"**
- Check firewall allows port 587
- Try port 465 with `secure: true`
- Test internet connection

### **Emails going to spam**
- Use business Gmail (not personal)
- Add SPF record to your domain
- Send test emails first
- Don't send too many at once

### **Rate limiting not working**
- Check database connection
- Verify `PasswordResetAttempt` table exists
- Check server logs for errors

---

## 📞 **Need Help?**

**Email not working?**
1. Check console logs for errors
2. Test SMTP connection: `node -e "require('./lib/email').testEmailConnection()"`
3. Verify app password is correct
4. Check Gmail account activity

**Still stuck?**
- Gmail SMTP Guide: https://support.google.com/mail/answer/7126229
- Nodemailer Docs: https://nodemailer.com/
- Check GitHub Issues: Common problems already solved

---

**🎉 You're ready! Password reset system is production-ready!**
