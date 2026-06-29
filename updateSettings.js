const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      contactPhone: '+91 86882 91288',
      whatsappNumber: '+91 86882 91288',
    },
    create: {
      id: 'singleton',
      contactPhone: '+91 86882 91288',
      whatsappNumber: '+91 86882 91288',
    }
  });
  console.log('SiteSettings phone numbers updated successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
