import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  phoneVerified: true,
  avatarUrl: true,
  role: true,
  status: true,
  wantsToBeProvider: true,
  activeMode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as Prisma.EnumUserRoleFilter['equals'];
    }

    if (status) {
      where.status = status as Prisma.EnumUserStatusFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        provider: {
          select: {
            id: true,
            verificationStatus: true,
            rating: true,
            totalReviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterId !== id && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException('Phone number already in use');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    if (requesterId !== id && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: 'Account deactivated successfully' };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });
  }

  async toggleMode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { provider: { select: { verificationStatus: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'PROVIDER') {
      throw new ForbiddenException('Only approved providers can toggle mode');
    }

    const newMode = user.activeMode === 'CLIENT' ? 'PROVIDER' : 'CLIENT';

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeMode: newMode as any },
      select: { ...USER_SELECT, activeMode: true },
    });

    return updated;
  }
}
