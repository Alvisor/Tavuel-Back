import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.provider.create({ data });
  }

  async findAll(query: any) {
    // TODO: implement with pagination, filters, and geo search
    return this.prisma.provider.findMany();
  }

  async findOne(id: string) {
    return this.prisma.provider.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.provider.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.provider.delete({ where: { id } });
  }

  async findByUserId(userId: string) {
    return this.prisma.provider.findUnique({ where: { userId } });
  }
}
