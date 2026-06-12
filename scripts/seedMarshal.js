// ============================================================
// scripts/seedMarshal.js
// Run once to create the initial Marshal account.
// Usage: node scripts/seedMarshal.js
// Run from inside the backend/ directory.
// ============================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const email = "marshal@breakathon.com";
  const password = "Marshal@123";
  const name = "Marshal";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Marshal already exists: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "MARSHAL",
      isActive: true,
    },
  });

  console.log("✅ Marshal user created:");
  console.log(`   Email:    ${user.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     ${user.role}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
