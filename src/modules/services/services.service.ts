import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.service.create({ data });
  }

  async findAll(query: any) {
    // TODO: implement with pagination, category filters, geo search
    return this.prisma.service.findMany();
  }

  async findOne(id: string) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.service.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }

  async findByProvider(providerId: string) {
    return this.prisma.service.findMany({ where: { providerId } });
  }
}
