import "dotenv/config";

import { prisma } from "../src/server/infrastructure/db";

async function main(): Promise<void> {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();

  const t1 = await prisma.ticket.create({
    data: {
      title: "No enciende el PC de contabilidad",
      description:
        "El equipo del área de contabilidad no enciende desde esta mañana. Se revisó el cable de poder y sigue sin respuesta.",
      requester: "María López",
      requesterEmail: "maria.lopez@example.com",
      category: "Hardware",
      priority: "Alta",
      status: "Pendiente",
    },
  });

  const t2 = await prisma.ticket.create({
    data: {
      title: "Caída intermitente de la red en bodega",
      description:
        "La conexión se cae cada 20 minutos aproximadamente en la zona de bodega. Afecta a 3 equipos.",
      requester: "Carlos Ruiz",
      category: "Red",
      priority: "Critica",
      status: "EnProgreso",
      history: {
        create: [
          {
            fromStatus: "Pendiente",
            toStatus: "EnProgreso",
            actor: "Soporte N1",
            observation: "Se asigna técnico para revisión en sitio.",
          },
        ],
      },
    },
  });

  const t3 = await prisma.ticket.create({
    data: {
      title: "Instalar Office en equipo nuevo",
      description: "Instalar la suite ofimática en el portátil nuevo de recursos humanos.",
      requester: "Ana Torres",
      category: "Software",
      priority: "Baja",
      status: "Resuelta",
      history: {
        create: [
          {
            fromStatus: "Pendiente",
            toStatus: "EnProgreso",
            actor: "Soporte N1",
          },
          {
            fromStatus: "EnProgreso",
            toStatus: "Resuelta",
            actor: "Soporte N1",
            observation: "Suite instalada y licencia activada.",
          },
        ],
      },
    },
  });

  console.log(`Seeded tickets: ${t1.id}, ${t2.id}, ${t3.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
