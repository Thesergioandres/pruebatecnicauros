import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/tickets/route";
import { prisma } from "@/server/infrastructure/db";

async function getJson(params: string): Promise<Response> {
  const request = new Request(
    `http://localhost:3000/api/tickets${params}`,
    { method: "GET" },
  );
  return GET(request);
}

beforeEach(async () => {
  await prisma.ticket.createMany({
    data: [
      {
        title: "Impresora no responde",
        description: "La impresora del primer piso no responde a trabajos.",
        requester: "Luis",
        category: "Hardware",
        priority: "Baja",
        priorityWeight: 0,
        status: "Pendiente",
      },
      {
        title: "Servidor caído",
        description: "El servidor de archivos no responde desde las 8am.",
        requester: "Marta",
        category: "Red",
        priority: "Critica",
        priorityWeight: 3,
        status: "EnProgreso",
      },
      {
        title: "Instalar antivirus",
        description: "Instalar antivirus en los portátiles nuevos.",
        requester: "Luis",
        category: "Software",
        priority: "Media",
        priorityWeight: 1,
        status: "Resuelta",
      },
    ],
  });
});

afterEach(async () => {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

describe("GET /api/tickets", () => {
  it("returns a paginated envelope by default", async () => {
    const response = await getJson("");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.total).toBe(3);
    expect(body.totalPages).toBe(1);
    expect(body.data).toHaveLength(3);
  });

  it("filters by status, priority and category combined", async () => {
    const response = await getJson(
      "?status=Pendiente&priority=Baja&category=Hardware",
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.data[0].title).toBe("Impresora no responde");
  });

  it("searches title and description case-insensitively", async () => {
    const byTitle = await (await getJson("?q=IMPRESORA")).json();
    expect(byTitle.total).toBe(1);

    const byDescription = await (await getJson("?q=portátiles")).json();
    expect(byDescription.total).toBe(1);
  });

  it("sorts by priority descending (most urgent first)", async () => {
    const response = await getJson("?sort=priority&order=desc");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.map((t: { priority: string }) => t.priority)).toEqual([
      "Crítica",
      "Media",
      "Baja",
    ]);
  });

  it("sorts by title ascending", async () => {
    const response = await getJson("?sort=title&order=asc");

    const body = await response.json();
    expect(body.data[0].title).toBe("Impresora no responde");
  });

  it("paginates to the second page", async () => {
    const response = await getJson("?page=2&pageSize=2&sort=title&order=asc");

    const body = await response.json();
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBe(3);
    expect(body.totalPages).toBe(2);
    expect(body.data).toHaveLength(1);
  });

  it("rejects an unknown sort field with VALIDATION_ERROR", async () => {
    const response = await getJson("?sort=whatever");

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects pageSize above the cap with VALIDATION_ERROR", async () => {
    const response = await getJson("?pageSize=500");

    expect(response.status).toBe(422);
  });

  it("returns an empty page when nothing matches", async () => {
    const response = await getJson("?q=zzz-sin-coincidencias");

    const body = await response.json();
    expect(body.total).toBe(0);
    expect(body.data).toEqual([]);
  });
});
