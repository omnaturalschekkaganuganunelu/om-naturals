const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log(JSON.stringify(products.slice(0, 2), null, 2));
}

main().then(() => prisma.$disconnect()).catch(console.error);
