import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ==========================================
  // 1. ADMIN USER
  // ==========================================
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tavuel.com' },
    update: {},
    create: {
      email: 'admin@tavuel.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Tavuel',
      phone: '+5730000000',
      phoneVerified: true,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // ==========================================
  // 2. SERVICE CATEGORIES & SERVICES
  // ==========================================
  const categories = [
    {
      name: 'Plomeria',
      slug: 'plomeria',
      description: 'Servicios de plomeria para el hogar',
      sortOrder: 1,
      services: [
        { name: 'Reparacion de fugas', slug: 'reparacion-fugas', description: 'Reparacion de fugas de agua en tuberias, grifos y conexiones', basePrice: 80000 },
        { name: 'Destape de canerias', slug: 'destape-canerias', description: 'Destape de canerias obstruidas en cocina, bano y desagues', basePrice: 100000 },
        { name: 'Instalacion de griferia', slug: 'instalacion-griferia', description: 'Instalacion y cambio de grifos, llaves y accesorios de bano', basePrice: 120000 },
        { name: 'Reparacion de sanitarios', slug: 'reparacion-sanitarios', description: 'Reparacion y mantenimiento de sanitarios y valvulas', basePrice: 90000 },
        { name: 'Instalacion de calentador', slug: 'instalacion-calentador', description: 'Instalacion y mantenimiento de calentadores de agua', basePrice: 200000 },
      ],
    },
    {
      name: 'Electricidad',
      slug: 'electricidad',
      description: 'Servicios electricos para el hogar',
      sortOrder: 2,
      services: [
        { name: 'Reparacion de tomas', slug: 'reparacion-tomas', description: 'Reparacion y cambio de tomas de corriente e interruptores', basePrice: 60000 },
        { name: 'Instalacion de lamparas', slug: 'instalacion-lamparas', description: 'Instalacion de lamparas, apliques y luminarias', basePrice: 70000 },
        { name: 'Revision de cableado', slug: 'revision-cableado', description: 'Revision y diagnostico de cableado electrico', basePrice: 100000 },
        { name: 'Instalacion de ventiladores', slug: 'instalacion-ventiladores', description: 'Instalacion de ventiladores de techo', basePrice: 90000 },
        { name: 'Instalacion de breakers', slug: 'instalacion-breakers', description: 'Instalacion y cambio de breakers y tableros electricos', basePrice: 150000 },
      ],
    },
    {
      name: 'Todero',
      slug: 'todero',
      description: 'Reparaciones generales y trabajos varios del hogar',
      sortOrder: 3,
      services: [
        { name: 'Reparaciones generales', slug: 'reparaciones-generales', description: 'Reparaciones menores varias en el hogar', basePrice: 70000 },
        { name: 'Montaje de muebles', slug: 'montaje-muebles', description: 'Armado y montaje de muebles (RTA, IKEA, etc.)', basePrice: 80000 },
        { name: 'Instalacion de repisas', slug: 'instalacion-repisas', description: 'Instalacion de repisas, estantes y soportes', basePrice: 60000 },
        { name: 'Reparacion de puertas', slug: 'reparacion-puertas', description: 'Ajuste, reparacion e instalacion de puertas', basePrice: 90000 },
        { name: 'Instalacion de cortinas', slug: 'instalacion-cortinas', description: 'Instalacion de barras y cortinas', basePrice: 70000 },
      ],
    },
    {
      name: 'Pintura',
      slug: 'pintura',
      description: 'Servicios de pintura residencial',
      sortOrder: 4,
      services: [
        { name: 'Pintura de habitacion', slug: 'pintura-habitacion', description: 'Pintura completa de una habitacion (paredes y techo)', basePrice: 250000 },
        { name: 'Pintura de fachada', slug: 'pintura-fachada', description: 'Pintura exterior de fachada', basePrice: 400000 },
        { name: 'Resane de paredes', slug: 'resane-paredes', description: 'Resane de grietas, huecos y imperfecciones', basePrice: 100000 },
        { name: 'Impermeabilizacion', slug: 'impermeabilizacion', description: 'Impermeabilizacion de techos y paredes', basePrice: 300000 },
        { name: 'Estuco y acabados', slug: 'estuco-acabados', description: 'Aplicacion de estuco veneciano y acabados decorativos', basePrice: 350000 },
      ],
    },
    {
      name: 'Aseo del hogar',
      slug: 'aseo',
      description: 'Servicios de limpieza y aseo para el hogar',
      sortOrder: 5,
      services: [
        { name: 'Aseo general', slug: 'aseo-general', description: 'Limpieza general del hogar (cocina, banos, habitaciones)', basePrice: 120000 },
        { name: 'Aseo profundo', slug: 'aseo-profundo', description: 'Limpieza profunda incluyendo muebles, electrodomesticos y rincones', basePrice: 200000 },
        { name: 'Limpieza post-obra', slug: 'limpieza-post-obra', description: 'Limpieza despues de remodelacion o construccion', basePrice: 250000 },
        { name: 'Limpieza de vidrios', slug: 'limpieza-vidrios', description: 'Limpieza de ventanas y superficies de vidrio', basePrice: 80000 },
        { name: 'Limpieza de tapiceria', slug: 'limpieza-tapiceria', description: 'Limpieza de sofas, colchones y tapiceria', basePrice: 150000 },
      ],
    },
  ];

  // Map to store service slugs -> service records for later use
  const serviceMap: Record<string, { id: string; basePrice: number }> = {};

  for (const cat of categories) {
    const { services, ...categoryData } = cat;
    const category = await prisma.serviceCategory.upsert({
      where: { slug: categoryData.slug },
      update: {},
      create: categoryData,
    });

    for (const svc of services) {
      const service = await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: {
          ...svc,
          categoryId: category.id,
        },
      });
      serviceMap[svc.slug] = { id: service.id, basePrice: svc.basePrice };
    }

    console.log(`Category "${category.name}" with ${services.length} services created`);
  }

  // ==========================================
  // 3. TEST CLIENT USERS
  // ==========================================
  const testPassword = await bcrypt.hash('Test1234!', 12);

  const clientsData = [
    { email: 'maria.lopez@test.com', firstName: 'Maria', lastName: 'Lopez Gutierrez', phone: '+573101000001' },
    { email: 'carlos.ramirez@test.com', firstName: 'Carlos', lastName: 'Ramirez Mora', phone: '+573101000002' },
    { email: 'laura.martinez@test.com', firstName: 'Laura', lastName: 'Martinez Cardenas', phone: '+573101000003' },
  ];

  const clients: Array<{ id: string; email: string }> = [];
  for (const c of clientsData) {
    const client = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash: testPassword,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        phoneVerified: true,
        role: 'CLIENT',
        status: 'ACTIVE',
      },
    });
    clients.push({ id: client.id, email: client.email });
  }
  console.log(`${clients.length} test client users created`);

  // ==========================================
  // 4. TEST PROVIDERS
  // ==========================================
  // Bogota area coordinates (lat ~4.6-4.75, lng ~-74.0 to -74.15)
  const providersData = [
    {
      email: 'andres.garcia@test.com',
      firstName: 'Andres',
      lastName: 'Garcia Rojas',
      phone: '+573201000001',
      bio: 'Plomero profesional con mas de 12 anos de experiencia en Bogota. Especialista en reparacion de fugas y destape de canerias. Trabajo limpio y garantizado.',
      address: 'Cra 15 #85-20, Chapinero, Bogota',
      latitude: 4.6680000,
      longitude: -74.0560000,
      serviceSlugs: ['reparacion-fugas', 'destape-canerias', 'instalacion-griferia', 'reparacion-sanitarios', 'instalacion-calentador'],
      bankName: 'Bancolombia',
      accountType: 'SAVINGS' as const,
      accountNumber: '23456789012',
      documentNumber: '1020304050',
    },
    {
      email: 'jorge.moreno@test.com',
      firstName: 'Jorge',
      lastName: 'Moreno Castillo',
      phone: '+573201000002',
      bio: 'Electricista certificado CONTE. Instalaciones residenciales y comerciales. Respuesta rapida en emergencias electricas.',
      address: 'Calle 100 #19-61, Usaquen, Bogota',
      latitude: 4.6870000,
      longitude: -74.0420000,
      serviceSlugs: ['reparacion-tomas', 'instalacion-lamparas', 'revision-cableado', 'instalacion-ventiladores', 'instalacion-breakers'],
      bankName: 'Davivienda',
      accountType: 'SAVINGS' as const,
      accountNumber: '34567890123',
      documentNumber: '1020304051',
    },
    {
      email: 'diana.torres@test.com',
      firstName: 'Diana',
      lastName: 'Torres Vargas',
      phone: '+573201000003',
      bio: 'Todera profesional. Armo muebles, instalo repisas, reparo puertas y todo lo que tu hogar necesite. Puntual y comprometida.',
      address: 'Cra 7 #45-12, Teusaquillo, Bogota',
      latitude: 4.6350000,
      longitude: -74.0670000,
      serviceSlugs: ['reparaciones-generales', 'montaje-muebles', 'instalacion-repisas', 'reparacion-puertas', 'instalacion-cortinas'],
      bankName: 'Nequi',
      accountType: 'NEQUI' as const,
      accountNumber: '3201000003',
      documentNumber: '1020304052',
    },
    {
      email: 'rafael.herrera@test.com',
      firstName: 'Rafael',
      lastName: 'Herrera Pinzon',
      phone: '+573201000004',
      bio: 'Maestro pintor con 15 anos de experiencia. Pintura residencial, fachadas, estucos y acabados decorativos. Garantia de calidad.',
      address: 'Calle 72 #10-34, Chapinero, Bogota',
      latitude: 4.6580000,
      longitude: -74.0580000,
      serviceSlugs: ['pintura-habitacion', 'pintura-fachada', 'resane-paredes', 'impermeabilizacion', 'estuco-acabados'],
      bankName: 'Banco de Bogota',
      accountType: 'CHECKING' as const,
      accountNumber: '45678901234',
      documentNumber: '1020304053',
    },
    {
      email: 'sandra.castillo@test.com',
      firstName: 'Sandra',
      lastName: 'Castillo Mendez',
      phone: '+573201000005',
      bio: 'Servicios de aseo profesional para hogares y oficinas. Limpieza profunda, post-obra y mantenimiento. Productos ecologicos.',
      address: 'Cra 68 #23-45, Kennedy, Bogota',
      latitude: 4.6200000,
      longitude: -74.1210000,
      serviceSlugs: ['aseo-general', 'aseo-profundo', 'limpieza-post-obra', 'limpieza-vidrios', 'limpieza-tapiceria'],
      bankName: 'Daviplata',
      accountType: 'DAVIPLATA' as const,
      accountNumber: '3201000005',
      documentNumber: '1020304054',
    },
    {
      email: 'miguel.perez@test.com',
      firstName: 'Miguel',
      lastName: 'Perez Aguilar',
      phone: '+573201000006',
      bio: 'Plomero y todero multifuncional. Arreglo desde una llave de agua hasta problemas de canerias complejos. 8 anos de experiencia.',
      address: 'Calle 53 #30-15, Suba, Bogota',
      latitude: 4.7080000,
      longitude: -74.0830000,
      serviceSlugs: ['reparacion-fugas', 'destape-canerias', 'reparaciones-generales', 'montaje-muebles'],
      bankName: 'Bancolombia',
      accountType: 'SAVINGS' as const,
      accountNumber: '56789012345',
      documentNumber: '1020304055',
    },
    {
      email: 'carolina.ruiz@test.com',
      firstName: 'Carolina',
      lastName: 'Ruiz Ospina',
      phone: '+573201000007',
      bio: 'Electricista profesional y tecnica en instalaciones electricas. Mantenimiento preventivo y correctivo. Trabajo seguro y certificado.',
      address: 'Cra 50 #12-80, Puente Aranda, Bogota',
      latitude: 4.6150000,
      longitude: -74.1040000,
      serviceSlugs: ['reparacion-tomas', 'instalacion-lamparas', 'revision-cableado', 'instalacion-breakers'],
      bankName: 'BBVA',
      accountType: 'SAVINGS' as const,
      accountNumber: '67890123456',
      documentNumber: '1020304056',
    },
    {
      email: 'fernando.diaz@test.com',
      firstName: 'Fernando',
      lastName: 'Diaz Soto',
      phone: '+573201000008',
      bio: 'Pintor profesional con enfoque en acabados de alta calidad. Estuco veneciano, impermeabilizacion y pintura decorativa.',
      address: 'Calle 140 #15-23, Cedritos, Bogota',
      latitude: 4.7200000,
      longitude: -74.0380000,
      serviceSlugs: ['pintura-habitacion', 'resane-paredes', 'estuco-acabados', 'impermeabilizacion'],
      bankName: 'Banco de Occidente',
      accountType: 'SAVINGS' as const,
      accountNumber: '78901234567',
      documentNumber: '1020304057',
    },
    {
      email: 'valentina.gomez@test.com',
      firstName: 'Valentina',
      lastName: 'Gomez Restrepo',
      phone: '+573201000009',
      bio: 'Aseo profesional y organizacion del hogar. Especializada en limpieza profunda y tapiceria. Certificada en manejo de productos quimicos.',
      address: 'Cra 11 #93-15, Chico, Bogota',
      latitude: 4.6780000,
      longitude: -74.0440000,
      serviceSlugs: ['aseo-general', 'aseo-profundo', 'limpieza-tapiceria'],
      bankName: 'Nequi',
      accountType: 'NEQUI' as const,
      accountNumber: '3201000009',
      documentNumber: '1020304058',
    },
    {
      email: 'luis.rojas@test.com',
      firstName: 'Luis',
      lastName: 'Rojas Bernal',
      phone: '+573201000010',
      bio: 'Todero y plomero con experiencia en proyectos residenciales. Instalaciones, reparaciones y mantenimiento general del hogar.',
      address: 'Calle 170 #60-10, Suba, Bogota',
      latitude: 4.7400000,
      longitude: -74.0720000,
      serviceSlugs: ['reparaciones-generales', 'reparacion-puertas', 'instalacion-cortinas', 'instalacion-griferia', 'reparacion-sanitarios'],
      bankName: 'Davivienda',
      accountType: 'SAVINGS' as const,
      accountNumber: '89012345678',
      documentNumber: '1020304059',
    },
  ];

  // Availability templates (dayOfWeek: 0=Monday, 6=Sunday)
  const availabilityTemplates = [
    // Full weekdays, mornings on Saturday
    [
      { dayOfWeek: 0, startTime: '07:00', endTime: '18:00' },
      { dayOfWeek: 1, startTime: '07:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '07:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '07:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '07:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '13:00' },
    ],
    // Mon-Fri afternoon/evening
    [
      { dayOfWeek: 0, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '19:00' },
    ],
    // Full week including Saturday and Sunday morning
    [
      { dayOfWeek: 0, startTime: '06:00', endTime: '17:00' },
      { dayOfWeek: 1, startTime: '06:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '06:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '06:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '06:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '14:00' },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
    ],
    // Split Mon-Fri, full Saturday
    [
      { dayOfWeek: 0, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 0, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '16:00' },
    ],
  ];

  // Document types required for providers
  const requiredDocTypes: Array<'CEDULA_FRONT' | 'CEDULA_BACK' | 'SELFIE_WITH_CEDULA' | 'RUT' | 'ANTECEDENTES'> = [
    'CEDULA_FRONT',
    'CEDULA_BACK',
    'SELFIE_WITH_CEDULA',
    'RUT',
    'ANTECEDENTES',
  ];

  const providerRecords: Array<{ id: string; userId: string; email: string }> = [];

  for (let i = 0; i < providersData.length; i++) {
    const p = providersData[i];

    // 4a. Create user account
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: testPassword,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        phoneVerified: true,
        role: 'PROVIDER',
        status: 'ACTIVE',
        activeMode: 'PROVIDER',
        wantsToBeProvider: true,
      },
    });

    // 4b. Create provider profile
    const provider = await prisma.provider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: p.bio,
        verificationStatus: 'APPROVED',
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        approvedAt: new Date('2025-12-01'),
      },
    });

    providerRecords.push({ id: provider.id, userId: user.id, email: p.email });

    // 4c. Provider services with price variation
    for (const slug of p.serviceSlugs) {
      const svc = serviceMap[slug];
      if (!svc) continue;
      // Price variation: 85% to 120% of base price, rounded to nearest 5000
      const priceFactor = 0.85 + Math.random() * 0.35;
      const price = Math.round((svc.basePrice * priceFactor) / 5000) * 5000;
      await prisma.providerService.upsert({
        where: {
          providerId_serviceId: {
            providerId: provider.id,
            serviceId: svc.id,
          },
        },
        update: {},
        create: {
          providerId: provider.id,
          serviceId: svc.id,
          price,
          isActive: true,
        },
      });
    }

    // 4d. Bank account
    await prisma.bankAccount.upsert({
      where: { providerId: provider.id },
      update: {},
      create: {
        providerId: provider.id,
        bankName: p.bankName,
        accountType: p.accountType,
        accountNumber: p.accountNumber,
        accountHolder: `${p.firstName} ${p.lastName}`,
        documentType: 'CC',
        documentNumber: p.documentNumber,
        isVerified: true,
      },
    });

    // 4e. Availability (delete existing, then recreate for idempotency)
    await prisma.providerAvailability.deleteMany({
      where: { providerId: provider.id },
    });
    const template = availabilityTemplates[i % availabilityTemplates.length];
    for (const slot of template) {
      await prisma.providerAvailability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true,
        },
      });
    }

    // 4f. Documents (delete existing, then recreate for idempotency)
    await prisma.providerDocument.deleteMany({
      where: { providerId: provider.id },
    });
    for (const docType of requiredDocTypes) {
      await prisma.providerDocument.create({
        data: {
          providerId: provider.id,
          type: docType,
          url: `https://storage.tavuel.com/providers/${provider.id}/documents/${docType.toLowerCase()}.jpg`,
          status: 'APPROVED',
          reviewedAt: new Date('2025-12-02'),
        },
      });
    }

    // 4g. Background check
    await prisma.backgroundCheck.upsert({
      where: { providerId: provider.id },
      update: {},
      create: {
        providerId: provider.id,
        status: 'PASSED',
        policeCheck: true,
        disciplinaryCheck: true,
        fiscalCheck: true,
        checkedAt: new Date('2025-12-01'),
        expiresAt: new Date('2026-12-01'),
        notes: 'Verificacion automatica aprobada',
      },
    });

    console.log(`Provider "${p.firstName} ${p.lastName}" created with ${p.serviceSlugs.length} services`);
  }

  // ==========================================
  // 5. BOOKINGS & REVIEWS
  // ==========================================
  // Create completed bookings so we can attach reviews.
  // Each review affects the provider's rating.

  // Helper to generate a random past date in the last 3 months
  function randomPastDate(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
    return d;
  }

  // Review data: [providerIndex, clientIndex, serviceSlugs[0] to pick, rating, comment, daysAgo]
  const reviewsData: Array<{
    providerIdx: number;
    clientIdx: number;
    serviceSlug: string;
    rating: number;
    comment: string;
    daysAgo: number;
    address: string;
    latitude: number;
    longitude: number;
  }> = [
    // Andres Garcia (plomero) - high ratings
    { providerIdx: 0, clientIdx: 0, serviceSlug: 'reparacion-fugas', rating: 5, comment: 'Excelente servicio, llego a tiempo y reparo la fuga rapidamente. Muy profesional.', daysAgo: 5, address: 'Cra 13 #80-12, Chapinero', latitude: 4.6650, longitude: -74.0550 },
    { providerIdx: 0, clientIdx: 1, serviceSlug: 'destape-canerias', rating: 5, comment: 'Muy buen trabajo con el destape de la caneria. Limpio y eficiente.', daysAgo: 15, address: 'Calle 90 #14-30, Chico', latitude: 4.6740, longitude: -74.0490 },
    { providerIdx: 0, clientIdx: 2, serviceSlug: 'instalacion-griferia', rating: 4, comment: 'Buen trabajo instalando la griferia nueva. Se demoro un poco mas de lo esperado pero quedo bien.', daysAgo: 30, address: 'Cra 7 #72-15, Chapinero', latitude: 4.6560, longitude: -74.0560 },
    { providerIdx: 0, clientIdx: 0, serviceSlug: 'reparacion-sanitarios', rating: 5, comment: 'Reparo el sanitario que tenia danado hace meses. Excelente!', daysAgo: 45, address: 'Cra 15 #88-10, Chapinero', latitude: 4.6700, longitude: -74.0570 },

    // Jorge Moreno (electricista) - high ratings
    { providerIdx: 1, clientIdx: 1, serviceSlug: 'reparacion-tomas', rating: 5, comment: 'Profesional al 100%. Reparo 4 tomas electricas en poco tiempo. Recomendado.', daysAgo: 8, address: 'Calle 106 #20-15, Usaquen', latitude: 4.6910, longitude: -74.0410 },
    { providerIdx: 1, clientIdx: 2, serviceSlug: 'instalacion-lamparas', rating: 4, comment: 'Buena instalacion de las lamparas. Trabajo ordenado y limpio.', daysAgo: 20, address: 'Cra 15 #100-50, Usaquen', latitude: 4.6860, longitude: -74.0440 },
    { providerIdx: 1, clientIdx: 0, serviceSlug: 'revision-cableado', rating: 5, comment: 'Reviso todo el cableado del apartamento y encontro un problema que otros no habian visto. Excelente diagnostico.', daysAgo: 40, address: 'Calle 95 #18-20, Chico', latitude: 4.6800, longitude: -74.0460 },

    // Diana Torres (todero) - medium-high ratings
    { providerIdx: 2, clientIdx: 0, serviceSlug: 'montaje-muebles', rating: 4, comment: 'Armo el closet rapidamente. Buen trabajo aunque falto un tornillo que ella misma consiguio.', daysAgo: 10, address: 'Calle 50 #8-20, Teusaquillo', latitude: 4.6380, longitude: -74.0690 },
    { providerIdx: 2, clientIdx: 1, serviceSlug: 'instalacion-repisas', rating: 5, comment: 'Las repisas quedaron perfectas. Muy detallista con las medidas y nivelacion.', daysAgo: 25, address: 'Cra 10 #42-15, Teusaquillo', latitude: 4.6320, longitude: -74.0640 },
    { providerIdx: 2, clientIdx: 2, serviceSlug: 'reparacion-puertas', rating: 3, comment: 'Cumplio con el trabajo pero llego 30 minutos tarde. La puerta quedo bien.', daysAgo: 50, address: 'Calle 45 #13-80, Teusaquillo', latitude: 4.6340, longitude: -74.0660 },

    // Rafael Herrera (pintor) - top rated
    { providerIdx: 3, clientIdx: 2, serviceSlug: 'pintura-habitacion', rating: 5, comment: 'Increible trabajo! La habitacion quedo como nueva. Colores perfectos y acabado impecable.', daysAgo: 7, address: 'Cra 9 #70-20, Chapinero', latitude: 4.6550, longitude: -74.0600 },
    { providerIdx: 3, clientIdx: 0, serviceSlug: 'resane-paredes', rating: 5, comment: 'Resano las paredes de toda la sala. Quedo perfecto, ni se nota donde estaban las grietas.', daysAgo: 22, address: 'Calle 75 #12-10, Chapinero', latitude: 4.6590, longitude: -74.0570 },
    { providerIdx: 3, clientIdx: 1, serviceSlug: 'estuco-acabados', rating: 5, comment: 'El estuco veneciano quedo espectacular. Todo el mundo pregunta quien lo hizo. Totalmente recomendado.', daysAgo: 35, address: 'Cra 15 #67-45, Chapinero', latitude: 4.6510, longitude: -74.0580 },
    { providerIdx: 3, clientIdx: 2, serviceSlug: 'impermeabilizacion', rating: 4, comment: 'Buena impermeabilizacion del techo. Ya no se filtra agua. Buen precio.', daysAgo: 55, address: 'Calle 80 #15-30, Chapinero', latitude: 4.6630, longitude: -74.0550 },

    // Sandra Castillo (aseo) - medium ratings
    { providerIdx: 4, clientIdx: 0, serviceSlug: 'aseo-general', rating: 4, comment: 'Buen aseo general del apartamento. Llego puntual y el trabajo fue satisfactorio.', daysAgo: 3, address: 'Cra 70 #25-10, Kennedy', latitude: 4.6220, longitude: -74.1200 },
    { providerIdx: 4, clientIdx: 1, serviceSlug: 'aseo-profundo', rating: 3, comment: 'El aseo profundo estuvo bien pero esperaba mas atencion en los banos. Regular.', daysAgo: 18, address: 'Calle 30 #68-50, Kennedy', latitude: 4.6180, longitude: -74.1180 },
    { providerIdx: 4, clientIdx: 2, serviceSlug: 'limpieza-tapiceria', rating: 4, comment: 'Limpio bien los sofas. Quedaron sin manchas. Buen servicio.', daysAgo: 42, address: 'Cra 65 #20-15, Kennedy', latitude: 4.6160, longitude: -74.1230 },

    // Miguel Perez (plomero/todero) - good ratings
    { providerIdx: 5, clientIdx: 1, serviceSlug: 'reparacion-fugas', rating: 4, comment: 'Reparo la fuga rapidamente. Buen precio y atencion amable.', daysAgo: 12, address: 'Calle 60 #35-20, Suba', latitude: 4.7100, longitude: -74.0850 },
    { providerIdx: 5, clientIdx: 2, serviceSlug: 'montaje-muebles', rating: 5, comment: 'Excelente! Armo 3 muebles en una manana. Muy habil y ordenado.', daysAgo: 28, address: 'Cra 30 #55-10, Suba', latitude: 4.7050, longitude: -74.0810 },
    { providerIdx: 5, clientIdx: 0, serviceSlug: 'destape-canerias', rating: 4, comment: 'Buen trabajo destapando la caneria del lavaplatos. Resolvio rapido.', daysAgo: 48, address: 'Calle 50 #28-30, Suba', latitude: 4.7020, longitude: -74.0800 },

    // Carolina Ruiz (electricista) - mixed ratings
    { providerIdx: 6, clientIdx: 0, serviceSlug: 'instalacion-lamparas', rating: 5, comment: 'Instalo 5 lamparas LED en todo el apartamento. Trabajo impecable y rapido.', daysAgo: 6, address: 'Cra 52 #15-10, Puente Aranda', latitude: 4.6170, longitude: -74.1060 },
    { providerIdx: 6, clientIdx: 2, serviceSlug: 'reparacion-tomas', rating: 4, comment: 'Reparo las tomas electricas del segundo piso. Buen trabajo.', daysAgo: 32, address: 'Calle 10 #50-20, Puente Aranda', latitude: 4.6130, longitude: -74.1020 },
    { providerIdx: 6, clientIdx: 1, serviceSlug: 'instalacion-breakers', rating: 3, comment: 'Cumplio pero tuvo que ir dos veces porque la primera vez le falto material.', daysAgo: 60, address: 'Cra 48 #18-30, Puente Aranda', latitude: 4.6190, longitude: -74.1080 },

    // Fernando Diaz (pintor) - medium ratings
    { providerIdx: 7, clientIdx: 1, serviceSlug: 'pintura-habitacion', rating: 4, comment: 'Buena pintura. El color quedo uniforme y el acabado limpio.', daysAgo: 9, address: 'Calle 142 #18-10, Cedritos', latitude: 4.7220, longitude: -74.0390 },
    { providerIdx: 7, clientIdx: 0, serviceSlug: 'resane-paredes', rating: 3, comment: 'El resane quedo aceptable pero en algunas partes se notan las imperfecciones.', daysAgo: 38, address: 'Cra 20 #138-50, Cedritos', latitude: 4.7180, longitude: -74.0400 },
    { providerIdx: 7, clientIdx: 2, serviceSlug: 'estuco-acabados', rating: 4, comment: 'El estuco quedo bonito. Buen trabajo en general.', daysAgo: 52, address: 'Calle 135 #15-20, Cedritos', latitude: 4.7150, longitude: -74.0370 },

    // Valentina Gomez (aseo) - high ratings
    { providerIdx: 8, clientIdx: 2, serviceSlug: 'aseo-general', rating: 5, comment: 'Increible! Dejo el apartamento reluciente. Muy organizada y detallista.', daysAgo: 4, address: 'Cra 13 #95-20, Chico', latitude: 4.6810, longitude: -74.0450 },
    { providerIdx: 8, clientIdx: 0, serviceSlug: 'aseo-profundo', rating: 5, comment: 'El mejor aseo profundo que he contratado. Limpio hasta debajo de los electrodomesticos.', daysAgo: 14, address: 'Calle 90 #11-40, Chico', latitude: 4.6750, longitude: -74.0460 },
    { providerIdx: 8, clientIdx: 1, serviceSlug: 'limpieza-tapiceria', rating: 4, comment: 'Los sofas quedaron muy limpios. Uso buenos productos y fue cuidadosa.', daysAgo: 36, address: 'Cra 7 #92-10, Chico', latitude: 4.6770, longitude: -74.0470 },

    // Luis Rojas (todero/plomero) - medium ratings
    { providerIdx: 9, clientIdx: 0, serviceSlug: 'reparaciones-generales', rating: 4, comment: 'Hizo varias reparaciones menores en el apartamento. Buen todero.', daysAgo: 11, address: 'Calle 175 #62-30, Suba', latitude: 4.7430, longitude: -74.0730 },
    { providerIdx: 9, clientIdx: 1, serviceSlug: 'instalacion-cortinas', rating: 3, comment: 'Las cortinas quedaron bien pero una barra quedo un poco torcida.', daysAgo: 26, address: 'Cra 58 #170-15, Suba', latitude: 4.7380, longitude: -74.0750 },
    { providerIdx: 9, clientIdx: 2, serviceSlug: 'reparacion-puertas', rating: 4, comment: 'Reparo la puerta del bano que estaba atascada. Buen trabajo y buen precio.', daysAgo: 44, address: 'Calle 165 #55-20, Suba', latitude: 4.7350, longitude: -74.0710 },
  ];

  // Track ratings per provider for summary update
  const providerRatings: Record<number, { sum: number; count: number }> = {};

  // First, delete existing seed bookings and reviews to make idempotent
  // We identify seed bookings by the description pattern
  const existingSeedBookings = await prisma.booking.findMany({
    where: { description: { startsWith: '[SEED]' } },
    select: { id: true },
  });
  if (existingSeedBookings.length > 0) {
    const seedBookingIds = existingSeedBookings.map((b) => b.id);
    // Delete in correct FK order
    await prisma.review.deleteMany({ where: { bookingId: { in: seedBookingIds } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: seedBookingIds } } });
    await prisma.evidence.deleteMany({ where: { bookingId: { in: seedBookingIds } } });
    await prisma.chatMessage.deleteMany({ where: { bookingId: { in: seedBookingIds } } });
    await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: seedBookingIds } } });
    await prisma.booking.deleteMany({ where: { id: { in: seedBookingIds } } });
    console.log(`Cleaned up ${existingSeedBookings.length} existing seed bookings`);
  }

  for (const rd of reviewsData) {
    const provider = providerRecords[rd.providerIdx];
    const client = clients[rd.clientIdx];
    const svc = serviceMap[rd.serviceSlug];
    if (!provider || !client || !svc) continue;

    const scheduledAt = randomPastDate(rd.daysAgo);
    const startedAt = new Date(scheduledAt.getTime() + 15 * 60 * 1000); // started 15 min after scheduled
    const completedAt = new Date(startedAt.getTime() + (60 + Math.floor(Math.random() * 90)) * 60 * 1000); // 1-2.5 hours

    // Price variation
    const quotedPrice = svc.basePrice * (0.9 + Math.random() * 0.2);
    const quotedMaterials = Math.random() > 0.5 ? Math.round(quotedPrice * 0.15 / 1000) * 1000 : 0;
    const totalAmount = quotedPrice + quotedMaterials;
    const commissionRate = 0.15;
    const commissionAmount = Math.round(totalAmount * commissionRate);
    const providerAmount = totalAmount - commissionAmount;

    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        providerId: provider.id,
        serviceId: svc.id,
        status: 'COMPLETED',
        address: rd.address,
        latitude: rd.latitude,
        longitude: rd.longitude,
        scheduledAt,
        description: `[SEED] Servicio de prueba - ${rd.serviceSlug}`,
        quotedPrice: Math.round(quotedPrice),
        quotedMaterials,
        estimatedDuration: 60 + Math.floor(Math.random() * 60),
        quoteNote: 'Cotizacion generada automaticamente para datos de prueba',
        startedAt,
        completedAt,
      },
    });

    // Payment for the booking
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        method: ['CREDIT_CARD', 'NEQUI', 'PSE', 'DEBIT_CARD'][Math.floor(Math.random() * 4)] as 'CREDIT_CARD' | 'NEQUI' | 'PSE' | 'DEBIT_CARD',
        status: 'CAPTURED',
        amount: Math.round(totalAmount),
        commissionRate,
        commissionAmount,
        providerAmount: Math.round(providerAmount),
        paidAt: completedAt,
        capturedAt: completedAt,
      },
    });

    // Review
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId: client.id,
        providerId: provider.id,
        rating: rd.rating,
        comment: rd.comment,
      },
    });

    // Track ratings
    if (!providerRatings[rd.providerIdx]) {
      providerRatings[rd.providerIdx] = { sum: 0, count: 0 };
    }
    providerRatings[rd.providerIdx].sum += rd.rating;
    providerRatings[rd.providerIdx].count += 1;
  }

  console.log(`${reviewsData.length} bookings with reviews created`);

  // ==========================================
  // 6. UPDATE PROVIDER RATINGS & TOTALS
  // ==========================================
  for (const [idxStr, stats] of Object.entries(providerRatings)) {
    const idx = parseInt(idxStr, 10);
    const provider = providerRecords[idx];
    if (!provider) continue;
    const avgRating = parseFloat((stats.sum / stats.count).toFixed(2));
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        rating: avgRating,
        totalReviews: stats.count,
        totalBookings: stats.count,
      },
    });
    console.log(`Provider ${providersData[idx].firstName} ${providersData[idx].lastName}: rating=${avgRating}, reviews=${stats.count}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
