import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    // TODO: integrate with payment gateway
    return this.prisma.payment.create({ data });
  }

  async findAll(query: any) {
    // TODO: implement with pagination and filters
    return this.prisma.payment.findMany();
  }

  async findOne(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.payment.findMany({ where: { bookingId } });
  }

  async processRefund(id: string, amount: number) {
    // TODO: implement refund through payment gateway
    return { message: 'Refund processed' };
  }

  async handleWebhook(payload: any) {
    // TODO: implement payment gateway webhook handler
    return { received: true };
  }
}
