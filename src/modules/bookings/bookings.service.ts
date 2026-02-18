import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BookingStatus, CancelledBy, Prisma } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Mapa de transiciones validas de estado
const VALID_TRANSITIONS: Record<string, BookingStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PROVIDER_EN_ROUTE', 'CANCELLED'],
  PROVIDER_EN_ROUTE: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['EVIDENCE_UPLOADED', 'COMPLETED', 'CANCELLED'],
  EVIDENCE_UPLOADED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Incluir relaciones comunes para respuestas
  private readonly bookingInclude = {
    client: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    },
    provider: {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    },
    service: {
      include: {
        category: {
          select: { id: true, name: true, slug: true, iconUrl: true },
        },
      },
    },
    category: {
      select: { id: true, name: true, slug: true, iconUrl: true },
    },
    statusHistory: {
      orderBy: { createdAt: 'desc' as const },
      take: 10,
    },
  };

  async create(clientId: string, dto: CreateBookingDto) {
    const isDirectBooking = !!dto.providerId && !!dto.serviceId;
    const isOpenRequest = !dto.providerId && !!dto.categoryId;

    if (!isDirectBooking && !isOpenRequest) {
      throw new BadRequestException(
        'Provide (providerId + serviceId) for a direct booking, or categoryId for an open request',
      );
    }

    // Validar fecha
    const scheduledAt = new Date(dto.scheduledAt);
    const minTime = new Date(Date.now() + 60 * 60 * 1000);
    if (scheduledAt < minTime) {
      throw new BadRequestException(
        'Scheduled time must be at least 1 hour in the future',
      );
    }
    const maxTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (scheduledAt > maxTime) {
      throw new BadRequestException(
        'Cannot schedule more than 30 days in advance',
      );
    }

    if (isDirectBooking) {
      return this.createDirectBooking(clientId, dto, scheduledAt);
    } else {
      return this.createOpenRequest(clientId, dto, scheduledAt);
    }
  }

  private async createDirectBooking(
    clientId: string,
    dto: CreateBookingDto,
    scheduledAt: Date,
  ) {
    // Validar que el proveedor exista y este aprobado
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
      include: { user: { select: { id: true } } },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Provider is not approved to receive bookings');
    }

    if (provider.userId === clientId) {
      throw new BadRequestException('Cannot book your own services');
    }

    // Validar que el servicio exista y el proveedor lo ofrezca
    const providerService = await this.prisma.providerService.findUnique({
      where: {
        providerId_serviceId: {
          providerId: dto.providerId!,
          serviceId: dto.serviceId!,
        },
      },
    });

    if (!providerService || !providerService.isActive) {
      throw new BadRequestException('Provider does not offer this service');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          clientId,
          providerId: dto.providerId!,
          serviceId: dto.serviceId!,
          scheduledAt,
          description: dto.description,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: BookingStatus.REQUESTED,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          fromStatus: null,
          toStatus: BookingStatus.REQUESTED,
          changedBy: clientId,
          note: dto.notes || null,
        },
      });

      return newBooking;
    });

    return this.findOne(booking.id);
  }

  private async createOpenRequest(
    clientId: string,
    dto: CreateBookingDto,
    scheduledAt: Date,
  ) {
    // Validar que la categoria exista
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new BadRequestException('Category not found or inactive');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          clientId,
          categoryId: dto.categoryId!,
          scheduledAt,
          description: dto.description,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: BookingStatus.REQUESTED,
          quotedPrice: dto.budget ?? null,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          fromStatus: null,
          toStatus: BookingStatus.REQUESTED,
          changedBy: clientId,
          note: dto.notes || null,
        },
      });

      return newBooking;
    });

    return this.findOne(booking.id);
  }

  async findAllForClient(clientId: string, query: BookingQueryDto) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { clientId };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) {
        where.scheduledAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.scheduledAt.lte = new Date(dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.bookingInclude,
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

  async findAllForProvider(providerId: string, query: BookingQueryDto) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { providerId };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) {
        where.scheduledAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.scheduledAt.lte = new Date(dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.bookingInclude,
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

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        ...this.bookingInclude,
        review: true,
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // ── Open Requests ──────────────────────────────

  async findOpenRequests(providerId: string, query: BookingQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Buscar las categorias del proveedor
    const providerServices = await this.prisma.providerService.findMany({
      where: { providerId, isActive: true },
      include: { service: { select: { categoryId: true } } },
    });

    const categoryIds = [
      ...new Set(providerServices.map((ps) => ps.service.categoryId)),
    ];

    if (categoryIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const where: Prisma.BookingWhereInput = {
      providerId: null,
      status: BookingStatus.REQUESTED,
      categoryId: { in: categoryIds },
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.bookingInclude,
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

  async claimOpenRequest(bookingId: string, providerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== null) {
      throw new BadRequestException('This request has already been claimed');
    }

    if (booking.status !== BookingStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot claim a booking with status ${booking.status}`,
      );
    }

    // Verificar que el proveedor no sea el mismo cliente
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.userId === booking.clientId) {
      throw new BadRequestException('Cannot claim your own request');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          providerId,
          status: BookingStatus.ACCEPTED,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.REQUESTED,
          toStatus: BookingStatus.ACCEPTED,
          changedBy: provider.userId,
          note: 'Provider claimed open request',
        },
      });

      return this.findOne(bookingId);
    });
  }

  // ── Busy Slots ─────────────────────────────────

  async getBusySlots(providerId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        providerId,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            BookingStatus.ACCEPTED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.PROVIDER_EN_ROUTE,
          ],
        },
      },
      select: {
        scheduledAt: true,
        estimatedDuration: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Retornar slots ocupados con duracion estimada (default 2h)
    return bookings.map((b) => {
      const start = b.scheduledAt;
      const durationMs = (b.estimatedDuration || 120) * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);
      return { start, end };
    });
  }

  // ── Status Transitions ─────────────────────────

  async acceptBooking(bookingId: string, providerId: string) {
    const booking = await this.findBookingForProvider(bookingId, providerId);

    this.validateTransition(booking.status, BookingStatus.ACCEPTED);

    const result = await this.updateBookingStatus(
      bookingId,
      BookingStatus.ACCEPTED,
      booking.provider!.userId,
      booking.status,
    );

    // Cancelar otros bookings pendientes en conflicto de horario
    await this.cancelConflictingBookings(bookingId, providerId, booking.scheduledAt);

    return result;
  }

  async rejectBooking(bookingId: string, providerId: string, reason?: string) {
    const booking = await this.findBookingForProvider(bookingId, providerId);

    // Solo se puede rechazar si esta en REQUESTED o QUOTED
    if (
      booking.status !== BookingStatus.REQUESTED &&
      booking.status !== BookingStatus.QUOTED
    ) {
      throw new BadRequestException(
        `Cannot reject a booking with status ${booking.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason || 'Rejected by provider',
          cancelledBy: CancelledBy.PROVIDER,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          changedBy: booking.provider!.userId,
          note: reason || 'Rejected by provider',
        },
      });

      return this.findOne(updated.id);
    });
  }

  async startService(bookingId: string, providerId: string) {
    const booking = await this.findBookingForProvider(bookingId, providerId);

    this.validateTransition(booking.status, BookingStatus.IN_PROGRESS);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.IN_PROGRESS,
          changedBy: booking.provider!.userId,
        },
      });

      return this.findOne(updated.id);
    });
  }

  async completeService(bookingId: string, providerId: string) {
    const booking = await this.findBookingForProvider(bookingId, providerId);

    this.validateTransition(booking.status, BookingStatus.COMPLETED);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Incrementar total de reservas del proveedor
      await tx.provider.update({
        where: { id: providerId },
        data: { totalBookings: { increment: 1 } },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.COMPLETED,
          changedBy: booking.provider!.userId,
        },
      });

      return this.findOne(updated.id);
    });
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: { select: { userId: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verificar que el usuario sea el cliente o el proveedor de la reserva
    const isClient = booking.clientId === userId;
    const isProvider = booking.provider?.userId === userId;

    if (!isClient && !isProvider) {
      throw new ForbiddenException('You are not part of this booking');
    }

    // Validar que la reserva se pueda cancelar
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel a booking with status ${booking.status}`,
      );
    }

    const cancelledBy = isClient ? CancelledBy.CLIENT : CancelledBy.PROVIDER;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason || 'Cancelled by user',
          cancelledBy,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: BookingStatus.CANCELLED,
          changedBy: userId,
          note: reason || null,
        },
      });

      return this.findOne(updated.id);
    });
  }

  // ────────────────────────────────────────────────
  // Metodos internos
  // ────────────────────────────────────────────────

  /// Cancela bookings pendientes del mismo proveedor en horario conflictivo (±2h).
  private async cancelConflictingBookings(
    acceptedBookingId: string,
    providerId: string,
    scheduledAt: Date,
  ) {
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const rangeStart = new Date(scheduledAt.getTime() - twoHoursMs);
    const rangeEnd = new Date(scheduledAt.getTime() + twoHoursMs);

    const conflicting = await this.prisma.booking.findMany({
      where: {
        id: { not: acceptedBookingId },
        providerId,
        status: BookingStatus.REQUESTED,
        scheduledAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { id: true, clientId: true },
    });

    if (conflicting.length === 0) return;

    const reason = 'El proveedor aceptó otra solicitud en este horario';

    // Buscar el userId del proveedor para changedBy
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });

    for (const booking of conflicting) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: reason,
            cancelledBy: CancelledBy.SYSTEM,
          },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.REQUESTED,
            toStatus: BookingStatus.CANCELLED,
            changedBy: provider?.userId || booking.clientId,
            note: reason,
          },
        });
      });

      // Notificar al cliente afectado
      await this.notificationsService.create({
        userId: booking.clientId,
        type: 'BOOKING_UPDATE',
        title: 'Solicitud cancelada',
        body: reason,
        data: { bookingId: booking.id },
      });
    }
  }

  /// Busca una reserva y valida que pertenezca al proveedor dado.
  private async findBookingForProvider(bookingId: string, providerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: { select: { id: true, userId: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.providerId !== providerId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    return booking;
  }

  /// Valida que una transicion de estado sea permitida.
  private validateTransition(
    currentStatus: BookingStatus,
    targetStatus: BookingStatus,
  ) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  /// Actualiza el estado de la reserva con historial (para transiciones simples).
  private async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    changedBy: string,
    fromStatus: BookingStatus,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: newStatus },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus,
          toStatus: newStatus,
          changedBy,
          note: note || null,
        },
      });

      return this.findOne(bookingId);
    });
  }
}
