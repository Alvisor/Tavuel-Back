import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateReviewDto) {
    // Validate booking exists and belongs to client
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== clientId) {
      throw new BadRequestException('You can only review your own bookings');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed bookings');
    }

    // Check no existing review
    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      throw new ConflictException('Review already exists for this booking');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        clientId,
        providerId: booking.providerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        client: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Update provider rating and totalReviews
    const aggregation = await this.prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        rating: aggregation._avg.rating || 0,
        totalReviews: aggregation._count.rating,
      },
    });

    return review;
  }

  async findByProvider(providerId: string, query: ReviewQueryDto) {
    const { page = 1, limit = 10, sortBy = 'recent' } = query;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      sortBy === 'rating'
        ? { rating: 'desc' }
        : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { providerId },
        include: {
          client: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { providerId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProviderStats(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { rating: true, totalReviews: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Distribution by stars
    const distribution = await Promise.all(
      [5, 4, 3, 2, 1].map(async (stars) => {
        const count = await this.prisma.review.count({
          where: { providerId, rating: stars },
        });
        return { stars, count };
      }),
    );

    return {
      averageRating: Number(provider.rating),
      totalReviews: provider.totalReviews,
      distribution,
    };
  }

  async findByClient(clientId: string) {
    return this.prisma.review.findMany({
      where: { clientId },
      include: {
        provider: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        booking: {
          select: { id: true, address: true, scheduledAt: true },
          include: { service: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
