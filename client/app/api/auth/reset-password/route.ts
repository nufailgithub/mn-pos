import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/password-reset";
import { fromZodError } from "zod-validation-error";
import { hashPassword } from "@/lib/password";
import { isTokenExpired } from "@/lib/reset-token";
import { sendEmail } from "@/lib/email";
import { getPasswordResetSuccessEmailHtml } from "@/lib/email-templates";
import {
  logAuditEvent,
  getClientIpAddress,
  getClientUserAgent,
} from "@/lib/rate-limit";

/**
 * Reset Password API Endpoint
 * 
 * FLOW:
 * 1. Validate input (token + new password)
 * 2. Find user by token
 * 3. Check token not expired
 * 4. Hash new password (Argon2)
 * 5. Update password in database
 * 6. Clear reset token (one-time use)
 * 7. Send confirmation email
 * 8. Log audit event
 * 
 * SECURITY:
 * - Token must exist in database
 * - Token must not be expired
 * - Token cleared after use (one-time only)
 * - Password strength validation
 * - Audit logging
 * - Confirmation email sent
 */
export async function POST(request: Request) {
  const ipAddress = getClientIpAddress(request);
  const userAgent = getClientUserAgent(request);

  try {
    const body = await request.json();

    // Validate request body
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = fromZodError(validation.error);
      return NextResponse.json(
        { message: errorMessage.message },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      await logAuditEvent({
        action: "PASSWORD_RESET_INVALID_TOKEN",
        ipAddress,
        userAgent,
        details: { token: token.substring(0, 10) + "..." }, // Log partial token
      });

      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (!user.passwordResetExpires || isTokenExpired(user.passwordResetExpires)) {
      await logAuditEvent({
        action: "PASSWORD_RESET_EXPIRED_TOKEN",
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
      });

      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return NextResponse.json(
        { message: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token (one-time use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null, // ✅ Clear token
        passwordResetExpires: null, // ✅ Clear expiry
      },
    });

    // Log successful password reset
    await logAuditEvent({
      action: "PASSWORD_RESET_COMPLETED",
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    });

    console.log(`✅ Password reset successful for: ${user.email}`);

    // Send confirmation email (security best practice)
    try {
      const emailHtml = getPasswordResetSuccessEmailHtml(user.name);

      await sendEmail({
        to: user.email,
        subject: "Password Reset Successful - MN Collection POS",
        html: emailHtml,
      });

      await logAuditEvent({
        action: "PASSWORD_RESET_CONFIRMATION_EMAIL_SENT",
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
      });
    } catch (emailError) {
      // Log but don't fail the request (password already reset)
      console.error("Failed to send confirmation email:", emailError);

      await logAuditEvent({
        action: "PASSWORD_RESET_CONFIRMATION_EMAIL_FAILED",
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: { error: String(emailError) },
      });
    }

    return NextResponse.json(
      {
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);

    await logAuditEvent({
      action: "PASSWORD_RESET_COMPLETION_ERROR",
      ipAddress,
      userAgent,
      details: { error: String(error) },
    });

    return NextResponse.json(
      { message: "An error occurred while resetting your password" },
      { status: 500 }
    );
  }
}
