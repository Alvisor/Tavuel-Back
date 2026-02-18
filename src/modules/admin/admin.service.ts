import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  UserStatus,
  VerificationStatus,
  BookingStatus,
  PaymentStatus,
  PqrsStatus,
  PqrsPriority,
  SenderRole,
  CancelledBy,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();

    // Start of today (midnight)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    // Start of yesterday
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday);

    // 14 days ago for weekly charts
    const fourteenDaysAgo = new Date(startOfToday.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 7 days ago for daily revenue chart
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeBookingStatuses: BookingStatus[] = [
      BookingStatus.REQUESTED,
      BookingStatus.QUOTED,
      BookingStatus.ACCEPTED,
      BookingStatus.PROVIDER_EN_ROUTE,
      BookingStatus.IN_PROGRESS,
      BookingStatus.EVIDENCE_UPLOADED,
    ];

    const openPqrsStatuses: PqrsStatus[] = [
      PqrsStatus.OPEN,
      PqrsStatus.IN_REVIEW,
      PqrsStatus.WAITING_RESPONSE,
      PqrsStatus.ESCALATED,
      PqrsStatus.REOPENED,
    ];

    const pendingVerificationStatuses: VerificationStatus[] = [
      VerificationStatus.DOCUMENTS_SUBMITTED,
      VerificationStatus.UNDER_REVIEW,
    ];

    // -------------------------------------------------------
    // Run all stat queries in parallel
    // -------------------------------------------------------
    const [
      activeBookings,
      activeBookingsYesterday,
      todayRevenueAgg,
      yesterdayRevenueAgg,
      newUsersToday,
      newUsersYesterday,
      openPqrs,
      openPqrsYesterday,
      pendingVerifications,
      pendingVerificationsYesterday,
      totalUsers,
      totalProviders,
      weeklyBookingsRaw,
      statusDistribution,
      dailyRevenueRaw,
      recentBookings,
      recentVerifications,
      recentPqrsResolved,
    ] = await Promise.all([
      // --- activeBookings (today: bookings currently in active statuses) ---
      this.prisma.booking.count({
        where: { status: { in: activeBookingStatuses } },
      }),

      // --- activeBookings yesterday snapshot: bookings created before end of yesterday in active statuses ---
      // For comparison we count bookings that were in active statuses and created before yesterday's end
      this.prisma.booking.count({
        where: {
          status: { in: activeBookingStatuses },
          createdAt: { lt: endOfYesterday },
        },
      }),

      // --- todayRevenue ---
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.CAPTURED,
          paidAt: { gte: startOfToday, lt: endOfToday },
        },
      }),

      // --- yesterdayRevenue ---
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.CAPTURED,
          paidAt: { gte: startOfYesterday, lt: endOfYesterday },
        },
      }),

      // --- newUsersToday ---
      this.prisma.user.count({
        where: { createdAt: { gte: startOfToday, lt: endOfToday } },
      }),

      // --- newUsersYesterday ---
      this.prisma.user.count({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
      }),

      // --- openPqrs ---
      this.prisma.pqrsTicket.count({
        where: { status: { in: openPqrsStatuses } },
      }),

      // --- openPqrs yesterday (created before yesterday end, still open-ish) ---
      this.prisma.pqrsTicket.count({
        where: {
          status: { in: openPqrsStatuses },
          createdAt: { lt: endOfYesterday },
        },
      }),

      // --- pendingVerifications ---
      this.prisma.provider.count({
        where: { verificationStatus: { in: pendingVerificationStatuses } },
      }),

      // --- pendingVerifications yesterday ---
      this.prisma.provider.count({
        where: {
          verificationStatus: { in: pendingVerificationStatuses },
          createdAt: { lt: endOfYesterday },
        },
      }),

      // --- totalUsers ---
      this.prisma.user.count(),

      // --- totalProviders (approved) ---
      this.prisma.provider.count({
        where: { verificationStatus: VerificationStatus.APPROVED },
      }),

      // --- weeklyBookings: last 14 days grouped by date ---
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>(
        Prisma.sql`
          SELECT DATE("createdAt") AS date, COUNT(*)::bigint AS count
          FROM bookings
          WHERE "createdAt" >= ${fourteenDaysAgo}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `,
      ),

      // --- statusDistribution ---
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      // --- dailyRevenue: last 7 days ---
      this.prisma.$queryRaw<{ date: string; total: Prisma.Decimal }[]>(
        Prisma.sql`
          SELECT DATE("paidAt") AS date, SUM(amount) AS total
          FROM payments
          WHERE status = 'CAPTURED'
            AND "paidAt" >= ${sevenDaysAgo}
          GROUP BY DATE("paidAt")
          ORDER BY date ASC
        `,
      ),

      // --- recentBookings (last 5) ---
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      }),

      // --- recentVerifications (last 3 providers whose status changed) ---
      this.prisma.provider.findMany({
        take: 3,
        where: {
          verificationStatus: {
            in: [
              VerificationStatus.DOCUMENTS_SUBMITTED,
              VerificationStatus.UNDER_REVIEW,
              VerificationStatus.APPROVED,
              VerificationStatus.REJECTED,
            ],
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          verificationStatus: true,
          updatedAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),

      // --- recentPqrs resolved (last 3) ---
      this.prisma.pqrsTicket.findMany({
        take: 3,
        where: { status: PqrsStatus.RESOLVED },
        orderBy: { resolvedAt: 'desc' },
        select: {
          id: true,
          radicado: true,
          subject: true,
          resolvedAt: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // -------------------------------------------------------
    // Build stats with change deltas
    // -------------------------------------------------------
    const todayRevenue = Number(todayRevenueAgg._sum.amount ?? 0);
    const yesterdayRevenue = Number(yesterdayRevenueAgg._sum.amount ?? 0);

    const stats = {
      activeBookings: {
        value: activeBookings,
        change: activeBookings - activeBookingsYesterday,
      },
      todayRevenue: {
        value: todayRevenue,
        change: todayRevenue - yesterdayRevenue,
      },
      newUsersToday: {
        value: newUsersToday,
        change: newUsersToday - newUsersYesterday,
      },
      openPqrs: {
        value: openPqrs,
        change: openPqrs - openPqrsYesterday,
      },
      pendingVerifications: {
        value: pendingVerifications,
        change: pendingVerifications - pendingVerificationsYesterday,
      },
      totalUsers: {
        value: totalUsers,
      },
      totalProviders: {
        value: totalProviders,
      },
    };

    // -------------------------------------------------------
    // Build charts
    // -------------------------------------------------------

    // Split weekly bookings into current week (last 7 days) and previous week
    const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();
    const weeklyBookings = {
      currentWeek: weeklyBookingsRaw
        .filter((r) => new Date(r.date).getTime() >= sevenDaysAgoTimestamp)
        .map((r) => ({ date: r.date, count: Number(r.count) })),
      previousWeek: weeklyBookingsRaw
        .filter((r) => new Date(r.date).getTime() < sevenDaysAgoTimestamp)
        .map((r) => ({ date: r.date, count: Number(r.count) })),
    };

    const statusDistributionFormatted = statusDistribution.map((entry) => ({
      status: entry.status,
      count: entry._count._all,
    }));

    const dailyRevenue = dailyRevenueRaw.map((r) => ({
      date: r.date,
      total: Number(r.total),
    }));

    const charts = {
      weeklyBookings,
      statusDistribution: statusDistributionFormatted,
      dailyRevenue,
    };

    // -------------------------------------------------------
    // Build recent activity feed
    // -------------------------------------------------------
    type ActivityItem = { type: string; message: string; time: Date | null };
    const recentActivity: ActivityItem[] = [];

    for (const b of recentBookings) {
      const clientName = `${b.client.firstName} ${b.client.lastName}`;
      const serviceName = b.service?.name ?? 'servicio';
      recentActivity.push({
        type: 'booking',
        message: `${clientName} solicitó ${serviceName} (${b.status})`,
        time: b.createdAt,
      });
    }

    for (const v of recentVerifications) {
      const provName = `${v.user.firstName} ${v.user.lastName}`;
      recentActivity.push({
        type: 'verification',
        message: `Verificación de ${provName}: ${v.verificationStatus}`,
        time: v.updatedAt,
      });
    }

    for (const p of recentPqrsResolved) {
      const userName = `${p.createdBy.firstName} ${p.createdBy.lastName}`;
      recentActivity.push({
        type: 'pqrs',
        message: `PQRS ${p.radicado} de ${userName} resuelta: ${p.subject}`,
        time: p.resolvedAt ?? p.resolvedAt,
      });
    }

    // Sort by most recent first
    recentActivity.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });

    return {
      stats,
      charts,
      recentActivity,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────────────────────

  async getUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      const search = query.search;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role as any;
    }

    if (query.status) {
      where.status = query.status as UserStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: { verificationStatus: true, rating: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        provider: true,
        bookingsAsClient: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            service: true,
            provider: {
              include: { user: true },
            },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        pqrsTicketsCreated: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(userId: string, status: UserStatus, reason?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Providers
  // ─────────────────────────────────────────────────────────────

  async getProviders(query: {
    page?: number;
    limit?: number;
    search?: string;
    verificationStatus?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProviderWhereInput = {};

    if (query.search) {
      const search = query.search;
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.verificationStatus) {
      where.verificationStatus = query.verificationStatus as VerificationStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          documents: true,
          services: true,
          bankAccount: true,
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProviderDetail(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: true,
        documents: true,
        bankAccount: true,
        availability: true,
        services: {
          include: {
            service: {
              include: { category: true },
            },
          },
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            client: true,
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            client: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async updateProviderStatus(
    providerId: string,
    verificationStatus: VerificationStatus,
  ) {
    return this.prisma.provider.update({
      where: { id: providerId },
      data: { verificationStatus },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Bookings
  // ─────────────────────────────────────────────────────────────

  async getBookings(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (query.search) {
      const search = query.search;
      where.OR = [
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as BookingStatus;
    }

    if (query.startDate || query.endDate) {
      where.scheduledAt = {};
      if (query.startDate) {
        where.scheduledAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.scheduledAt.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          provider: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          service: { select: { name: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingDetail(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        provider: {
          include: { user: true },
        },
        service: {
          include: { category: true },
        },
        payment: true,
        evidences: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        review: {
          include: {
            client: true,
          },
        },
        pqrsTickets: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async getBookingTimeline(id: string) {
    return this.prisma.bookingStatusHistory.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getBookingEvidence(id: string) {
    const evidences = await this.prisma.evidence.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = {
      BEFORE: evidences.filter((e) => e.type === 'BEFORE'),
      DURING: evidences.filter((e) => e.type === 'DURING'),
      AFTER: evidences.filter((e) => e.type === 'AFTER'),
      DISPUTE: evidences.filter((e) => e.type === 'DISPUTE'),
    };

    return grouped;
  }

  async cancelBooking(bookingId: string, reason: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledBy: CancelledBy.ADMIN,
        },
      }),
      this.prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          changedBy: adminId,
          note: `Cancelado por admin: ${reason}`,
        },
      }),
    ]);
  }

  // ─────────────────────────────────────────────────────────────
  // PQRS
  // ─────────────────────────────────────────────────────────────

  async getPqrs(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    priority?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PqrsTicketWhereInput = {};

    if (query.search) {
      const search = query.search;
      where.OR = [
        { radicado: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as PqrsStatus;
    }

    if (query.type) {
      where.type = query.type as any;
    }

    if (query.priority) {
      where.priority = query.priority as PqrsPriority;
    }

    const [data, total] = await Promise.all([
      this.prisma.pqrsTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
          booking: { select: { id: true } },
        },
      }),
      this.prisma.pqrsTicket.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPqrsDetail(id: string) {
    const ticket = await this.prisma.pqrsTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { firstName: true, lastName: true } },
            attachments: true,
          },
        },
        booking: {
          include: {
            client: true,
            provider: {
              include: { user: true },
            },
            service: true,
            evidences: true,
            statusHistory: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        createdBy: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('PQRS ticket not found');
    }

    return ticket;
  }

  async assignPqrs(id: string, adminId: string) {
    return this.prisma.pqrsTicket.update({
      where: { id },
      data: {
        assignedToId: adminId,
        status: PqrsStatus.IN_REVIEW,
      },
    });
  }

  async respondPqrs(id: string, content: string, adminId: string) {
    return this.prisma.$transaction([
      this.prisma.pqrsMessage.create({
        data: {
          ticketId: id,
          senderId: adminId,
          senderRole: SenderRole.ADMIN,
          content,
        },
      }),
      this.prisma.pqrsTicket.update({
        where: { id },
        data: { status: PqrsStatus.WAITING_RESPONSE },
      }),
    ]);
  }

  async resolvePqrs(
    id: string,
    body: { resolutionType: string; refundAmount?: number; resolution: string },
  ) {
    return this.prisma.pqrsTicket.update({
      where: { id },
      data: {
        status: PqrsStatus.RESOLVED,
        resolution: body.resolution,
        resolutionType: body.resolutionType as any,
        refundAmount: body.refundAmount ?? undefined,
        resolvedAt: new Date(),
      },
    });
  }

  async escalatePqrs(id: string, reason: string) {
    const ticket = await this.prisma.pqrsTicket.update({
      where: { id },
      data: {
        status: PqrsStatus.ESCALATED,
        priority: PqrsPriority.HIGH,
      },
    });

    // Create a system message with the escalation reason
    // Use the assignedToId or createdById as sender for the system note
    const senderId = ticket.assignedToId ?? ticket.createdById;
    await this.prisma.pqrsMessage.create({
      data: {
        ticketId: id,
        senderId,
        senderRole: SenderRole.ADMIN,
        content: `[ESCALADO] ${reason}`,
      },
    });

    return ticket;
  }

  // ─────────────────────────────────────────────────────────────
  // Categories & Services
  // ─────────────────────────────────────────────────────────────

  async getCategories() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { services: true },
    });
  }

  async createCategory(body: { name: string; slug: string; description: string }) {
    return this.prisma.serviceCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
      },
    });
  }

  async updateCategory(
    id: string,
    body: { name?: string; description?: string; sortOrder?: number },
  ) {
    return this.prisma.serviceCategory.update({
      where: { id },
      data: body,
    });
  }

  async toggleCategory(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  async createService(
    categoryId: string,
    body: { name: string; slug: string; description: string; basePrice?: number },
  ) {
    return this.prisma.service.create({
      data: {
        categoryId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        basePrice: body.basePrice ?? undefined,
      },
    });
  }

  async updateService(
    id: string,
    body: { name?: string; description?: string; basePrice?: number; isActive?: boolean },
  ) {
    return this.prisma.service.update({
      where: { id },
      data: body,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // System Config
  // ─────────────────────────────────────────────────────────────

  async getSystemConfig() {
    // SystemConfig model may not exist yet in the Prisma schema.
    // Use try/catch and return defaults if the table doesn't exist.
    try {
      const configs = await this.prisma.$queryRaw<
        { key: string; value: string }[]
      >(Prisma.sql`SELECT key, value FROM system_configs`);

      const result: Record<string, string> = {};
      for (const c of configs) {
        result[c.key] = c.value;
      }
      return result;
    } catch {
      // Table doesn't exist yet — return sensible defaults
      return {
        commission_rate: '0.15',
        min_booking_advance_hours: '2',
        max_booking_advance_days: '30',
      };
    }
  }

  async updateSystemConfig(data: Record<string, string>) {
    try {
      const entries = Object.entries(data);
      for (const [key, value] of entries) {
        await this.prisma.$executeRaw(
          Prisma.sql`
            INSERT INTO system_configs (id, key, value, "updatedAt")
            VALUES (gen_random_uuid(), ${key}, ${value}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${value}, "updatedAt" = NOW()
          `,
        );
      }
      return { message: 'Config updated', data };
    } catch {
      // Table doesn't exist yet — handle gracefully
      return {
        message: 'SystemConfig table not available yet. Config not persisted.',
        data,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Admin Management
  // ─────────────────────────────────────────────────────────────

  async createAdmin(body: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    return this.prisma.user.create({
      data: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash,
        role: 'ADMIN',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Payments
  // ─────────────────────────────────────────────────────────────

  async getPayments(query: { page?: number; limit?: number; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status as PaymentStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              client: { select: { firstName: true, lastName: true } },
              provider: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              service: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Reports
  // ─────────────────────────────────────────────────────────────

  async getRevenueReport(query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const dailyRevenueRaw = await this.prisma.$queryRaw<
      { date: string; total: Prisma.Decimal }[]
    >(
      Prisma.sql`
        SELECT DATE("paidAt") AS date, SUM(amount) AS total
        FROM payments
        WHERE status = 'CAPTURED'
          AND "paidAt" >= ${startDate}
          AND "paidAt" <= ${endDate}
        GROUP BY DATE("paidAt")
        ORDER BY date ASC
      `,
    );

    const totalsRaw = await this.prisma.$queryRaw<
      { total_revenue: Prisma.Decimal; total_commission: Prisma.Decimal }[]
    >(
      Prisma.sql`
        SELECT
          COALESCE(SUM(amount), 0) AS total_revenue,
          COALESCE(SUM("commissionAmount"), 0) AS total_commission
        FROM payments
        WHERE status = 'CAPTURED'
          AND "paidAt" >= ${startDate}
          AND "paidAt" <= ${endDate}
      `,
    );

    const dailyRevenue = dailyRevenueRaw.map((r) => ({
      date: r.date,
      total: Number(r.total),
    }));

    return {
      dailyRevenue,
      totalRevenue: Number(totalsRaw[0]?.total_revenue ?? 0),
      totalCommission: Number(totalsRaw[0]?.total_commission ?? 0),
    };
  }

  async getBookingsReport(query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const [statusCounts, dailyBookingsRaw, totalBookings] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      this.prisma.$queryRaw<{ date: string; count: bigint }[]>(
        Prisma.sql`
          SELECT DATE("createdAt") AS date, COUNT(*)::bigint AS count
          FROM bookings
          WHERE "createdAt" >= ${startDate}
            AND "createdAt" <= ${endDate}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `,
      ),

      this.prisma.booking.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      statusCounts: statusCounts.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      dailyBookings: dailyBookingsRaw.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      totalBookings,
    };
  }

  async getProvidersReport(query: { startDate?: string; endDate?: string }) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const topProvidersRaw = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        bookings: bigint;
        revenue: Prisma.Decimal;
        rating: Prisma.Decimal;
      }[]
    >(
      Prisma.sql`
        SELECT
          p.id,
          CONCAT(u."firstName", ' ', u."lastName") AS name,
          COUNT(b.id)::bigint AS bookings,
          COALESCE(SUM(pay.amount), 0) AS revenue,
          p.rating
        FROM providers p
        JOIN users u ON u.id = p."userId"
        LEFT JOIN bookings b ON b."providerId" = p.id
          AND b."createdAt" >= ${startDate}
          AND b."createdAt" <= ${endDate}
        LEFT JOIN payments pay ON pay."bookingId" = b.id
          AND pay.status = 'CAPTURED'
        GROUP BY p.id, u."firstName", u."lastName", p.rating
        ORDER BY bookings DESC
        LIMIT 10
      `,
    );

    const totalActiveProviders = await this.prisma.provider.count({
      where: { verificationStatus: VerificationStatus.APPROVED },
    });

    return {
      topProviders: topProvidersRaw.map((p) => ({
        id: p.id,
        name: p.name,
        bookings: Number(p.bookings),
        revenue: Number(p.revenue),
        rating: Number(p.rating),
      })),
      totalActiveProviders,
    };
  }
}
