const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onlineLocal = await prisma.local.findFirst({
    where: { nome: 'Remoto / On-line' }
  });

  if (!onlineLocal) {
    await prisma.local.create({
      data: {
        nome: 'Remoto / On-line',
        bairro: 'Qualquer',
        tipo: 'ONLINE',
        distanciaKm: 0.0,
        tempoMinutos: 0
      }
    });
    console.log("Local On-line criado com sucesso!");
  } else {
    console.log("Local On-line já existia.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
