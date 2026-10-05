import type { Prisma } from "@/generated/prisma/client";

import { PRIORITY_WEIGHT } from "../domain/ticket";
import type {
  NewTicketData,
  Ticket,
  TicketStatus,
} from "../domain/ticket";
import type { ListQuery, Page, TicketRepository } from "../application/ports";
import { prisma } from "./db";
import {
  categoryToDb,
  historyFromDb,
  priorityToDb,
  statusToDb,
  ticketFromDb,
} from "./ticketMappers";

export const prismaTicketRepository: TicketRepository = {
  async create(data: NewTicketData): Promise<Ticket> {
    const row = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        requester: data.requester,
        requesterEmail: data.requesterEmail ?? null,
        category: categoryToDb(data.category),
        priority: priorityToDb(data.priority),
        priorityWeight: PRIORITY_WEIGHT[data.priority],
      },
    });
    return ticketFromDb(row);
  },

  async list(query: ListQuery): Promise<Page<Ticket>> {
    const where: Prisma.TicketWhereInput = {
      ...(query.status ? { status: statusToDb(query.status) } : {}),
      ...(query.priority ? { priority: priorityToDb(query.priority) } : {}),
      ...(query.category ? { category: categoryToDb(query.category) } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.TicketOrderByWithRelationInput =
      query.sort === "priority"
        ? { priorityWeight: query.order }
        : { [query.sort]: query.order };
    const [total, rows] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data: rows.map(ticketFromDb),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  },

  async findById(id: string): Promise<Ticket | null> {
    const row = await prisma.ticket.findUnique({ where: { id } });
    return row ? ticketFromDb(row) : null;
  },

  async recordTransition(entry: {
    ticketId: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
    actor: string;
    observation?: string;
  }) {
    // One transaction: status change and its history row are atomic.
    const [ticketRow, historyRow] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: entry.ticketId },
        data: { status: statusToDb(entry.toStatus) },
      }),
      prisma.statusHistory.create({
        data: {
          ticketId: entry.ticketId,
          fromStatus: statusToDb(entry.fromStatus),
          toStatus: statusToDb(entry.toStatus),
          actor: entry.actor,
          observation: entry.observation ?? null,
        },
      }),
    ]);
    return {
      ticket: ticketFromDb(ticketRow),
      history: historyFromDb(historyRow),
    };
  },
};
