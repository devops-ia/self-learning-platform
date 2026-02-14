import nodemailer from "nodemailer";
import { getSmtpHost, getSmtpPort, getSmtpUser, getSmtpPass, getSmtpFrom, isSmtpSecure, getBaseUrl } from "@/lib/settings";

function getTransporter() {
  const host = getSmtpHost();
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: isSmtpSecure(),
    auth: { user: getSmtpUser(), pass: getSmtpPass() },
  });
}

export function isSmtpConfigured(): boolean {
  return !!getSmtpHost();
}

export async function sendVerificationEmail(email: string, token: string) {
  const transporter = getTransporter();
  if (!transporter) return;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: getSmtpFrom(), to: email,
    subject: "Verify your email - DevOps Lab",
    html: `<p>Click the link below to verify your email:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const transporter = getTransporter();
  if (!transporter) return;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: getSmtpFrom(), to: email,
    subject: "Reset your password - DevOps Lab",
    html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });
}
