import { Prisma, PrismaClient } from "@prisma/client";

const prismaOptions: Prisma.PrismaClientOptions = {
  // Datamodel and datasource config come from schema.prisma
  // This file exists for Prisma 7.x compatibility layer
};

const prisma = new PrismaClient(prismaOptions);

export default prisma;
export { prisma };