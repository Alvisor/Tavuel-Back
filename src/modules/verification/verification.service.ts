import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.verificationStatus = status;
    } else {
      // By default show submitted/under review
      where.verificationStatus = {
        in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
            },
          },
          documents: true,
          bankAccount: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        documents: true,
        bankAccount: true,
        availability: { orderBy: { dayOfWeek: 'asc' } },
        services: { include: { service: { include: { category: true } } } },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async approve(providerId: string, reviewerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { documents: true, bankAccount: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (
      provider.verificationStatus !== 'DOCUMENTS_SUBMITTED' &&
      provider.verificationStatus !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        `Cannot approve: current status is ${provider.verificationStatus}`,
      );
    }

    // Approve all documents
    await this.prisma.providerDocument.updateMany({
      where: { providerId, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    // Verify bank account
    if (provider.bankAccount) {
      await this.prisma.bankAccount.update({
        where: { providerId },
        data: { isVerified: true },
      });
    }

    // Update provider status and user role
    const [updatedProvider] = await Promise.all([
      this.prisma.provider.update({
        where: { id: providerId },
        data: {
          verificationStatus: 'APPROVED',
          approvedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: provider.userId },
        data: { role: 'PROVIDER' },
      }),
    ]);

    return updatedProvider;
  }

  async reject(providerId: string, reviewerId: string, reason: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (
      provider.verificationStatus !== 'DOCUMENTS_SUBMITTED' &&
      provider.verificationStatus !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        `Cannot reject: current status is ${provider.verificationStatus}`,
      );
    }

    return this.prisma.provider.update({
      where: { id: providerId },
      data: { verificationStatus: 'REJECTED' },
    });
  }

  async getStatusByProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        verificationStatus: true,
        approvedAt: true,
        documents: { select: { type: true, status: true, rejectionReason: true } },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }
}
