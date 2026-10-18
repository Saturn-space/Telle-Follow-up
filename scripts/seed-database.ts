import './load-next-env';
import { PrismaClient, Role } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 16 characters before running this bootstrap.');
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role !== Role.ADMIN) throw new Error('The bootstrap email is already registered with a non-admin role. No changes were made.');
    console.log('Administrator account already exists; no data was changed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, role: Role.ADMIN } });
  console.log('Administrator account created. The password was not printed or stored in the repository.');
}

main()
  .catch((error) => {
    console.error('Administrator bootstrap failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
