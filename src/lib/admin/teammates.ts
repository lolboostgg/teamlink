import { prisma } from "@/lib/db";

export async function getAllTeammates() {
  return prisma.teammate.findMany({
    orderBy: { name: "asc" },
    include: { user: true },
  });
}
