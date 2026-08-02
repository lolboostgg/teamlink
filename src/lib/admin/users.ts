import { prisma } from "@/lib/db";

export async function getUsersWithTeammate() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { teammate: true },
  });
}
