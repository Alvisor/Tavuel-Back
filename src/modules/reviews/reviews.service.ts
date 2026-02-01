import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.review.create({ data });
  }

  async findAll(query: any) {
    // TODO: implement with pagination and filters
    return this.prisma.review.findMany();
  }

  async findOne(id: string) {
    return this.prisma.review.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.review.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }

  async findByProvider(providerId: string) {
    return this.prisma.review.findMany({ where: { providerId } });
  }

  async findByService(serviceId: string) {
    return this.prisma.review.findMany({ where: { serviceId } });
  }
}
