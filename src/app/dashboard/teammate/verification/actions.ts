"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { countryUsesIban, PAYOUT_FIELDS, sanitizePayoutDetails, type PayoutMethodType } from "@/lib/payoutMethods";
import { notifyAdmins } from "@/lib/notifications/service";

async function requireOwnTeammate() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) throw new Error("No teammate profile linked to this account.");
  return teammate;
}

export interface PersonalDetailsInput {
  fullName: string;
  dateOfBirth: string;
  address: string;
  country: string;
}

export async function savePersonalDetails(input: PersonalDetailsInput) {
  const teammate = await requireOwnTeammate();
  const data = {
    fullName: input.fullName.trim().slice(0, 120),
    dateOfBirth: input.dateOfBirth.trim().slice(0, 20),
    address: input.address.trim().slice(0, 240),
    country: input.country.trim().slice(0, 80),
  };

  await prisma.teammateVerification.upsert({
    where: { teammateId: teammate.id },
    create: { teammateId: teammate.id, ...data },
    update: data,
  });

  revalidatePath("/dashboard/teammate/verification");
}

/**
 * Completes verification. Everything has to be there — a half-filled
 * submission would just bounce back and forth.
 *
 * Approval is automatic for now: a teammate who has uploaded all three
 * documents is unblocked immediately rather than waiting on an admin. The
 * documents are still stored and still visible to admins, who can reject
 * afterwards — this trades an up-front gate for an after-the-fact review, so
 * onboarding doesn't stall on nobody being online to click approve.
 */
export async function submitForReview() {
  const teammate = await requireOwnTeammate();
  const record = await prisma.teammateVerification.findUnique({ where: { teammateId: teammate.id } });

  const missing: string[] = [];
  if (!record?.fullName) missing.push("full name");
  if (!record?.dateOfBirth) missing.push("date of birth");
  if (!record?.address) missing.push("address");
  if (!record?.country) missing.push("country");
  if (!record?.idFrontPath) missing.push("ID front");
  if (!record?.idBackPath) missing.push("ID back");
  if (!record?.selfiePath) missing.push("selfie");
  if (missing.length > 0) throw new Error(`Still missing: ${missing.join(", ")}.`);

  const now = new Date();
  await prisma.teammateVerification.update({
    where: { teammateId: teammate.id },
    data: { status: "APPROVED", submittedAt: now, reviewedAt: now, reviewNote: null },
  });

  // Admins are told after the fact rather than asked up front — they can
  // still open the documents and reject from the teammate detail page.
  await notifyAdmins({
    type: "verification.submitted",
    title: `${teammate.name} completed identity verification`,
    body: "Auto-approved — documents are available for review.",
    href: `/dashboard/admin/teammates/${teammate.teammateNo}`,
  });

  revalidatePath("/dashboard/teammate/verification");
  revalidatePath("/dashboard/teammate/onboarding");
}

export async function savePayoutMethod(input: {
  id?: string;
  type: PayoutMethodType;
  details: Record<string, string>;
  isDefault: boolean;
}) {
  const teammate = await requireOwnTeammate();
  const details = sanitizePayoutDetails(input.type, input.details);
  const missing = PAYOUT_FIELDS[input.type].filter((field) => field.required && !details[field.key]);
  if (input.type === "BANK") {
    const accountField = countryUsesIban(details.country ?? "") ? "iban" : "accountNumber";
    if (!details[accountField]) missing.push({ key: accountField, label: accountField === "iban" ? "IBAN" : "Account number" });
  }
  if (missing.length) throw new Error(`Missing: ${missing.map((field) => field.label).join(", ")}.`);

  const method = input.id
    ? await prisma.payoutMethod.update({
        // Scoped by teammateId as well so an id from another account can't be
        // steered into this update.
        where: { id: input.id, teammateId: teammate.id },
        data: { type: input.type, details: details as Prisma.InputJsonObject },
      })
    : await prisma.payoutMethod.create({
        data: { teammateId: teammate.id, type: input.type, details: details as Prisma.InputJsonObject },
      });

  if (input.isDefault) await makeDefault(method.id);

  revalidatePath("/dashboard/teammate/verification");
}

export async function makeDefault(methodId: string) {
  const teammate = await requireOwnTeammate();
  await prisma.$transaction([
    prisma.payoutMethod.updateMany({ where: { teammateId: teammate.id }, data: { isDefault: false } }),
    prisma.payoutMethod.updateMany({ where: { id: methodId, teammateId: teammate.id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/dashboard/teammate/verification");
}

export async function deletePayoutMethod(methodId: string) {
  const teammate = await requireOwnTeammate();
  await prisma.payoutMethod.deleteMany({ where: { id: methodId, teammateId: teammate.id } });

  revalidatePath("/dashboard/teammate/verification");
}
