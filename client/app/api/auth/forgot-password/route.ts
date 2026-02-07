import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/password-reset";
import { fromZodError } from "zod-validation-error";
import { generateResetToken, getResetTokenExpiry } from "@/lib/reset-token";
import { sendEmail } from "@/lib/email";
import { getPasswordResetEmailHtml } from "@/lib/email-templates";
import {
  checkPasswordResetRateLimit,
  logAuditEvent,
  getClientIpAddress,
  getClientUserAgent,
} from "@/lib/rate-limit";

/**
 * Forgot Password API Endpoint
 * 
 * FLOW:
 * 1. Validate email format
 * 2. Check rate limiting (3 attempts/hour)
 * 3. Find user in database
 * 4. Generate secure token (256-bit)
 * 5. Store token in database (1 hour expiry)
 * 6. Send email with reset link
 * 7. Log audit event
 * 
 * SECURITY:
 * - Email enumeration protection (same response always)
 * - Rate limiting (prevent spam)
 * - Audit logging (track attempts)
 * - IP + User Agent tracking
 */
export async function POST(request: Request) {
  const ipAddress = getClientIpAddress(request);
  const userAgent = getClientUserAgent(request);

  try {
    const body = await request.json();

    // Validate request body
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = fromZodError(validation.error);
      return NextResponse.json(
        { message: errorMessage.message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // CHECK RATE LIMITING
    // WHY: Prevent abuse (email spam, server load)
    const rateLimit = await checkPasswordResetRateLimit(email, ipAddress, userAgent);

    if (!rateLimit.allowed) {
      // Log blocked attempt
      await logAuditEvent({
        action: "PASSWORD_RESET_RATE_LIMITED",
        email,
        ipAddress,
        userAgent,
        details: { message: rateLimit.message },
      });

      return NextResponse.json(
        { message: rateLimit.message },
        { status: 429 } // 429 = Too Many Requests
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // SECURITY: Always return same response (prevent email enumeration)
    // WHY: Attacker can't tell if email exists
    const successMessage =
      "If an account with that email exists, we've sent password reset instructions.";

    if (!user) {
      // Log attempt for non-existent email (security monitoring)
      await logAuditEvent({
        action: "PASSWORD_RESET_NONEXISTENT_EMAIL",
        email,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Check if user is active
    if (!user.isActive) {
      await logAuditEvent({
        action: "PASSWORD_RESET_INACTIVE_USER",
        userId: user.id,
        email,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpiry = getResetTokenExpiry();

    // Store token in database
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpiry,
      },
    });

    // Build reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;

    // Send email
    try {
      const emailHtml = getPasswordResetEmailHtml({
        userName: user.name,
        resetUrl,
        expiryHours: 1,
      });

      await sendEmail({
        to: email,
        subject: "Password Reset Request - MN Collection POS",
        html: emailHtml,
      });

      // Log successful email send
      await logAuditEvent({
        action: "PASSWORD_RESET_EMAIL_SENT",
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        details: { expiresAt: resetExpiry.toISOString() },
      });

      console.log(`✅ Password reset email sent to: ${email}`);
    } catch (emailError) {
      // Log email failure
      console.error("Failed to send password reset email:", emailError);

      await logAuditEvent({
        action: "PASSWORD_RESET_EMAIL_FAILED",
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        details: { error: String(emailError) },
      });

      // Clear the token since email failed
      await prisma.user.update({
        where: { email },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return NextResponse.json(
        { message: "Failed to send reset email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: successMessage }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);

    await logAuditEvent({
      action: "PASSWORD_RESET_ERROR",
      ipAddress,
      userAgent,
      details: { error: String(error) },
    });

    return NextResponse.json(
      { message: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
