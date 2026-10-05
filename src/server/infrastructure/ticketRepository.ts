import type {
  NewTicketData,
  Ticket,
  TicketStatus,
} from "../domain/ticket";
import type { TicketRepository } from "../application/ports";
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
      },
    });
    return ticketFromDb(row);
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
