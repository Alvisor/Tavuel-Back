import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.booking.create({ data });
  }

  async findAll(query: any) {
    // TODO: implement with pagination and status filters
    return this.prisma.booking.findMany();
  }

  async findOne(id: string) {
    return this.prisma.booking.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.booking.update({ where: { id }, data });
  }

  async cancel(id: string, reason: string) {
    // TODO: implement cancellation logic with refund handling
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async findByUser(clientId: string) {
    return this.prisma.booking.findMany({ where: { clientId } });
  }

  async findByProvider(providerId: string) {
    return this.prisma.booking.findMany({ where: { providerId } });
  }
}
