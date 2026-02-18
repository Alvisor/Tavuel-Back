import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { AvailabilitySlotDto } from './dto/create-availability.dto';
import { SearchProvidersDto, SearchSortBy } from './dto/search-providers.dto';
import { DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateProviderDto) {
    const existing = await this.prisma.provider.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Provider profile already exists');
    }

    const provider = await this.prisma.provider.create({
      data: {
        userId,
        bio: dto.bio,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Link service categories if provided
    if (dto.serviceCategoryIds?.length) {
      const categories = await this.prisma.serviceCategory.findMany({
        where: { id: { in: dto.serviceCategoryIds }, isActive: true },
        include: { services: { where: { isActive: true } } },
      });

      // Create ProviderService entries for all services in selected categories
      const providerServices = categories.flatMap((cat) =>
        cat.services.map((svc) => ({
          providerId: provider.id,
          serviceId: svc.id,
          price: svc.basePrice || 0,
        })),
      );

      if (providerServices.length > 0) {
        await this.prisma.providerService.createMany({
          data: providerServices,
        });
      }
    }

    return this.findOneWithRelations(provider.id);
  }

  async getOnboardingStatus(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        documents: { select: { type: true, status: true } },
        bankAccount: { select: { id: true } },
        availability: { select: { id: true } },
        services: { select: { id: true } },
      },
    });

    if (!provider) {
      return {
        hasProfile: false,
        profileComplete: false,
        documentsUploaded: false,
        bankAccountSet: false,
        availabilitySet: false,
        categoriesSelected: false,
        canSubmit: false,
        verificationStatus: null,
      };
    }

    const profileComplete = !!(provider.bio && provider.address);
    const categoriesSelected = provider.services.length > 0;

    const requiredDocs: DocumentType[] = [
      'CEDULA_FRONT',
      'CEDULA_BACK',
      'SELFIE_WITH_CEDULA',
      'RUT',
      'ANTECEDENTES',
      'BANK_CERTIFICATE',
    ];
    const uploadedDocTypes = provider.documents.map((d) => d.type);
    const documentsUploaded = requiredDocs.every((dt) =>
      uploadedDocTypes.includes(dt),
    );

    const bankAccountSet = !!provider.bankAccount;
    const availabilitySet = provider.availability.length > 0;

    const canSubmit =
      profileComplete &&
      categoriesSelected &&
      documentsUploaded &&
      bankAccountSet &&
      availabilitySet &&
      provider.verificationStatus === 'PENDING_DOCUMENTS';

    return {
      hasProfile: true,
      profileComplete,
      documentsUploaded,
      bankAccountSet,
      availabilitySet,
      categoriesSelected,
      canSubmit,
      verificationStatus: provider.verificationStatus,
      documentStatus: provider.documents,
    };
  }

  async uploadDocument(providerId: string, type: DocumentType, url: string) {
    // Upsert: if document of this type exists, update it
    const existing = await this.prisma.providerDocument.findFirst({
      where: { providerId, type },
    });

    if (existing) {
      return this.prisma.providerDocument.update({
        where: { id: existing.id },
        data: { url, status: 'PENDING', uploadedAt: new Date() },
      });
    }

    return this.prisma.providerDocument.create({
      data: { providerId, type, url },
    });
  }

  async getDocuments(providerId: string) {
    return this.prisma.providerDocument.findMany({
      where: { providerId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async setBankAccount(providerId: string, dto: CreateBankAccountDto) {
    const bankName =
      dto.accountType === 'NEQUI'
        ? 'Nequi'
        : dto.accountType === 'DAVIPLATA'
          ? 'Daviplata'
          : dto.bankName || '';

    return this.prisma.bankAccount.upsert({
      where: { providerId },
      update: {
        accountType: dto.accountType,
        bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        isVerified: false,
      },
      create: {
        providerId,
        accountType: dto.accountType,
        bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      },
    });
  }

  async getBankAccount(providerId: string) {
    return this.prisma.bankAccount.findUnique({ where: { providerId } });
  }

  async setAvailability(providerId: string, slots: AvailabilitySlotDto[]) {
    // Replace all availability slots
    await this.prisma.providerAvailability.deleteMany({
      where: { providerId },
    });

    if (slots.length > 0) {
      await this.prisma.providerAvailability.createMany({
        data: slots.map((slot) => ({
          providerId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    return this.prisma.providerAvailability.findMany({
      where: { providerId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getAvailability(providerId: string) {
    return this.prisma.providerAvailability.findMany({
      where: { providerId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async submitForVerification(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        documents: true,
        bankAccount: true,
        availability: true,
        services: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.verificationStatus !== 'PENDING_DOCUMENTS') {
      throw new BadRequestException(
        `Cannot submit: current status is ${provider.verificationStatus}`,
      );
    }

    // Validate completeness
    const requiredDocs: DocumentType[] = [
      'CEDULA_FRONT',
      'CEDULA_BACK',
      'SELFIE_WITH_CEDULA',
      'RUT',
      'ANTECEDENTES',
      'BANK_CERTIFICATE',
    ];
    const uploadedTypes = provider.documents.map((d) => d.type);
    const missingDocs = requiredDocs.filter((dt) => !uploadedTypes.includes(dt));

    if (missingDocs.length > 0) {
      throw new BadRequestException(
        `Missing documents: ${missingDocs.join(', ')}`,
      );
    }

    if (!provider.bankAccount) {
      throw new BadRequestException('Bank account required');
    }

    if (provider.availability.length === 0) {
      throw new BadRequestException('At least one availability slot required');
    }

    if (!provider.bio || !provider.address) {
      throw new BadRequestException('Profile bio and address required');
    }

    return this.prisma.provider.update({
      where: { id: providerId },
      data: { verificationStatus: 'DOCUMENTS_SUBMITTED' },
    });
  }

  async findOneWithRelations(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
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

    // Convert Prisma Decimal fields to JS numbers
    return {
      ...provider,
      rating: Number(provider.rating),
      latitude: provider.latitude ? Number(provider.latitude) : null,
      longitude: provider.longitude ? Number(provider.longitude) : null,
      services: provider.services.map((ps) => ({
        ...ps,
        price: Number(ps.price),
        service: {
          ...ps.service,
          basePrice: ps.service.basePrice ? Number(ps.service.basePrice) : null,
        },
      })),
    };
  }

  async findByUserId(userId: string) {
    return this.prisma.provider.findUnique({ where: { userId } });
  }

  async updateProfile(providerId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updateData: any = {};
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: updateData,
    });

    // Update service categories if provided
    if (dto.serviceCategoryIds) {
      // Remove existing provider services
      await this.prisma.providerService.deleteMany({
        where: { providerId },
      });

      if (dto.serviceCategoryIds.length > 0) {
        const categories = await this.prisma.serviceCategory.findMany({
          where: { id: { in: dto.serviceCategoryIds }, isActive: true },
          include: { services: { where: { isActive: true } } },
        });

        const providerServices = categories.flatMap((cat) =>
          cat.services.map((svc) => ({
            providerId,
            serviceId: svc.id,
            price: svc.basePrice || 0,
          })),
        );

        if (providerServices.length > 0) {
          await this.prisma.providerService.createMany({
            data: providerServices,
          });
        }
      }
    }

    return this.findOneWithRelations(updated.id);
  }

  async findPublicProfile(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        services: {
          where: { isActive: true },
          include: { service: { include: { category: true } } },
        },
        availability: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Solo retornar si esta aprobado
    if (provider.verificationStatus !== 'APPROVED') {
      throw new NotFoundException('Provider not found');
    }

    return {
      ...provider,
      rating: Number(provider.rating),
      latitude: provider.latitude ? Number(provider.latitude) : null,
      longitude: provider.longitude ? Number(provider.longitude) : null,
      services: provider.services.map((ps) => ({
        ...ps,
        price: Number(ps.price),
        service: {
          ...ps.service,
          basePrice: ps.service.basePrice ? Number(ps.service.basePrice) : null,
        },
      })),
    };
  }

  async searchProviders(dto: SearchProvidersDto) {
    const {
      query,
      categoryId,
      categorySlug,
      latitude,
      longitude,
      radiusKm = 30,
      minRating,
      sortBy = SearchSortBy.RATING,
      page = 1,
      limit = 15,
    } = dto;

    const skip = (page - 1) * limit;

    // Construir filtros de WHERE
    const where: Prisma.ProviderWhereInput = {
      // Solo proveedores aprobados
      verificationStatus: 'APPROVED',
      // Solo usuarios activos
      user: { status: 'ACTIVE' },
    };

    // Filtro de texto: buscar en nombre, apellido y bio
    if (query && query.trim()) {
      const searchTerm = query.trim();
      where.OR = [
        {
          user: {
            firstName: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          user: {
            lastName: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Filtro por categoria (por ID o por slug)
    if (categoryId || categorySlug) {
      where.services = {
        some: {
          isActive: true,
          service: {
            isActive: true,
            category: categoryId
              ? { id: categoryId, isActive: true }
              : { slug: categorySlug, isActive: true },
          },
        },
      };
    }

    // Filtro por rating minimo
    if (minRating) {
      where.rating = { gte: minRating };
    }

    // Determinar el orderBy
    let orderBy: Prisma.ProviderOrderByWithRelationInput[] = [];
    switch (sortBy) {
      case SearchSortBy.RATING:
        orderBy = [{ rating: 'desc' }, { totalReviews: 'desc' }];
        break;
      case SearchSortBy.REVIEWS:
        orderBy = [{ totalReviews: 'desc' }, { rating: 'desc' }];
        break;
      case SearchSortBy.PRICE:
        // Ordenar por precio se hace post-query
        orderBy = [{ rating: 'desc' }];
        break;
      case SearchSortBy.DISTANCE:
        // Ordenar por distancia se hace post-query con raw SQL o en memoria
        orderBy = [{ rating: 'desc' }];
        break;
      default:
        orderBy = [{ rating: 'desc' }];
    }

    // Si hay coordenadas y se quiere filtrar por radio, usar raw SQL para distancia
    const hasCoordinates = latitude != null && longitude != null;

    // Caso con distancia: usar raw SQL para la formula Haversine
    if (hasCoordinates) {
      return this._searchWithDistance(
        where,
        latitude,
        longitude,
        radiusKm,
        sortBy,
        skip,
        limit,
        page,
      );
    }

    // Caso sin distancia: consulta normal con Prisma
    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          services: {
            where: { isActive: true },
            include: {
              service: {
                include: { category: true },
              },
            },
          },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    const data = providers.map((p) => this._formatSearchResult(p, null));

    // Ordenar por precio si se pidio
    if (sortBy === SearchSortBy.PRICE) {
      data.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    }

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

  /// Busqueda con calculo de distancia via Haversine en PostgreSQL
  private async _searchWithDistance(
    where: Prisma.ProviderWhereInput,
    latitude: number,
    longitude: number,
    radiusKm: number,
    sortBy: SearchSortBy,
    skip: number,
    limit: number,
    page: number,
  ) {
    // Primero obtener los IDs que cumplen los filtros basicos
    const filteredProviders = await this.prisma.provider.findMany({
      where,
      select: { id: true },
    });

    if (filteredProviders.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const providerIds = filteredProviders.map((p) => p.id);

    // Consulta raw con formula Haversine para calcular distancia
    // y filtrar por radio
    const distanceResults: Array<{ id: string; distance_km: number }> =
      await this.prisma.$queryRaw`
        SELECT
          p.id,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${latitude}))
                * cos(radians(CAST(p.latitude AS double precision)))
                * cos(radians(CAST(p.longitude AS double precision)) - radians(${longitude}))
                + sin(radians(${latitude}))
                * sin(radians(CAST(p.latitude AS double precision)))
              ))
            )
          ) AS distance_km
        FROM providers p
        WHERE p.id = ANY(${providerIds}::uuid[])
          AND p.latitude IS NOT NULL
          AND p.longitude IS NOT NULL
          AND (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${latitude}))
                * cos(radians(CAST(p.latitude AS double precision)))
                * cos(radians(CAST(p.longitude AS double precision)) - radians(${longitude}))
                + sin(radians(${latitude}))
                * sin(radians(CAST(p.latitude AS double precision)))
              ))
            )
          ) <= ${radiusKm}
        ORDER BY distance_km ASC
      `;

    // Mapa de distancias
    const distanceMap = new Map<string, number>();
    for (const row of distanceResults) {
      distanceMap.set(row.id, Number(row.distance_km));
    }

    const filteredIds = distanceResults.map((r) => r.id);
    const total = filteredIds.length;

    // Paginar los IDs
    const paginatedIds = filteredIds.slice(skip, skip + limit);

    if (paginatedIds.length === 0) {
      return {
        data: [],
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // Obtener los proveedores completos
    const providers = await this.prisma.provider.findMany({
      where: { id: { in: paginatedIds } },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        services: {
          where: { isActive: true },
          include: {
            service: {
              include: { category: true },
            },
          },
        },
      },
    });

    // Formatear resultados y agregar distancia
    let data = providers.map((p) =>
      this._formatSearchResult(p, distanceMap.get(p.id) ?? null),
    );

    // Ordenar segun criterio
    switch (sortBy) {
      case SearchSortBy.DISTANCE:
        data.sort(
          (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
        );
        break;
      case SearchSortBy.RATING:
        data.sort((a, b) => b.rating - a.rating);
        break;
      case SearchSortBy.REVIEWS:
        data.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      case SearchSortBy.PRICE:
        data.sort(
          (a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity),
        );
        break;
    }

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

  /// Formatea un proveedor para la respuesta de busqueda
  private _formatSearchResult(provider: any, distanceKm: number | null) {
    // Obtener categorias unicas
    const categoriesMap = new Map<string, { id: string; name: string; slug: string }>();
    const prices: number[] = [];

    for (const ps of provider.services) {
      if (ps.service?.category) {
        const cat = ps.service.category;
        categoriesMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        });
      }
      if (ps.price) {
        prices.push(Number(ps.price));
      }
    }

    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    return {
      id: provider.id,
      userId: provider.userId,
      bio: provider.bio,
      rating: Number(provider.rating),
      totalReviews: provider.totalReviews,
      totalBookings: provider.totalBookings,
      address: provider.address,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      user: provider.user,
      categories: Array.from(categoriesMap.values()),
      minPrice,
      maxPrice,
      servicesCount: provider.services.length,
    };
  }
}
