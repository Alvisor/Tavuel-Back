import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.notification.create({ data });
  }

  async findAll(userId: string, query: any) {
    return this.prisma.notification.findMany({ where: { userId } });
  }

  async findOne(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async remove(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
