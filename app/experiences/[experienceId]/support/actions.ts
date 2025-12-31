"use server";

import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export async function createSupportTicket(formData: FormData) {
  const experienceId = String(formData.get("experienceId") || "").trim();
  const niche = String(formData.get("niche") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!experienceId) throw new Error("experienceId is required");
  if (!message || message.length < 3) throw new Error("Message is required");
  if (!subject) throw new Error("Subject is required");

  // ✅ this runs server-side with the Whop-auth headers available
  const { userId } = await whopsdk.verifyUserToken(await headers());

  // Combine subject and message for storage
  const fullMessage = subject ? `Subject: ${subject}\n\n${message}` : message;

  await (prisma as any).supportTicket.create({
    data: {
      whopUserId: userId,
      experienceId,
      niche: niche || null,
      message: fullMessage,
    },
  });

  return { ok: true };
}

