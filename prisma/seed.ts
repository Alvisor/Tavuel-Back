import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
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

  // Create service categories and services
  const categories = [
    {
      name: 'Plomería',
      slug: 'plomeria',
      description: 'Servicios de plomería para el hogar',
      sortOrder: 1,
      services: [
        { name: 'Reparación de fugas', slug: 'reparacion-fugas', description: 'Reparación de fugas de agua en tuberías, grifos y conexiones', basePrice: 80000 },
        { name: 'Destape de cañerías', slug: 'destape-canerias', description: 'Destape de cañerías obstruidas en cocina, baño y desagües', basePrice: 100000 },
        { name: 'Instalación de grifería', slug: 'instalacion-griferia', description: 'Instalación y cambio de grifos, llaves y accesorios de baño', basePrice: 120000 },
        { name: 'Reparación de sanitarios', slug: 'reparacion-sanitarios', description: 'Reparación y mantenimiento de sanitarios y válvulas', basePrice: 90000 },
        { name: 'Instalación de calentador', slug: 'instalacion-calentador', description: 'Instalación y mantenimiento de calentadores de agua', basePrice: 200000 },
      ],
    },
    {
      name: 'Electricidad',
      slug: 'electricidad',
      description: 'Servicios eléctricos para el hogar',
      sortOrder: 2,
      services: [
        { name: 'Reparación de tomas', slug: 'reparacion-tomas', description: 'Reparación y cambio de tomas de corriente e interruptores', basePrice: 60000 },
        { name: 'Instalación de lámparas', slug: 'instalacion-lamparas', description: 'Instalación de lámparas, apliques y luminarias', basePrice: 70000 },
        { name: 'Revisión de cableado', slug: 'revision-cableado', description: 'Revisión y diagnóstico de cableado eléctrico', basePrice: 100000 },
        { name: 'Instalación de ventiladores', slug: 'instalacion-ventiladores', description: 'Instalación de ventiladores de techo', basePrice: 90000 },
        { name: 'Instalación de breakers', slug: 'instalacion-breakers', description: 'Instalación y cambio de breakers y tableros eléctricos', basePrice: 150000 },
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
        { name: 'Instalación de repisas', slug: 'instalacion-repisas', description: 'Instalación de repisas, estantes y soportes', basePrice: 60000 },
        { name: 'Reparación de puertas', slug: 'reparacion-puertas', description: 'Ajuste, reparación e instalación de puertas', basePrice: 90000 },
        { name: 'Instalación de cortinas', slug: 'instalacion-cortinas', description: 'Instalación de barras y cortinas', basePrice: 70000 },
      ],
    },
    {
      name: 'Pintura',
      slug: 'pintura',
      description: 'Servicios de pintura residencial',
      sortOrder: 4,
      services: [
        { name: 'Pintura de habitación', slug: 'pintura-habitacion', description: 'Pintura completa de una habitación (paredes y techo)', basePrice: 250000 },
        { name: 'Pintura de fachada', slug: 'pintura-fachada', description: 'Pintura exterior de fachada', basePrice: 400000 },
        { name: 'Resane de paredes', slug: 'resane-paredes', description: 'Resane de grietas, huecos y imperfecciones', basePrice: 100000 },
        { name: 'Impermeabilización', slug: 'impermeabilizacion', description: 'Impermeabilización de techos y paredes', basePrice: 300000 },
        { name: 'Estuco y acabados', slug: 'estuco-acabados', description: 'Aplicación de estuco veneciano y acabados decorativos', basePrice: 350000 },
      ],
    },
    {
      name: 'Aseo del hogar',
      slug: 'aseo',
      description: 'Servicios de limpieza y aseo para el hogar',
      sortOrder: 5,
      services: [
        { name: 'Aseo general', slug: 'aseo-general', description: 'Limpieza general del hogar (cocina, baños, habitaciones)', basePrice: 120000 },
        { name: 'Aseo profundo', slug: 'aseo-profundo', description: 'Limpieza profunda incluyendo muebles, electrodomésticos y rincones', basePrice: 200000 },
        { name: 'Limpieza post-obra', slug: 'limpieza-post-obra', description: 'Limpieza después de remodelación o construcción', basePrice: 250000 },
        { name: 'Limpieza de vidrios', slug: 'limpieza-vidrios', description: 'Limpieza de ventanas y superficies de vidrio', basePrice: 80000 },
        { name: 'Limpieza de tapicería', slug: 'limpieza-tapiceria', description: 'Limpieza de sofás, colchones y tapicería', basePrice: 150000 },
      ],
    },
  ];

  for (const cat of categories) {
    const { services, ...categoryData } = cat;
    const category = await prisma.serviceCategory.upsert({
      where: { slug: categoryData.slug },
      update: {},
      create: categoryData,
    });

    for (const svc of services) {
      await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {},
        create: {
          ...svc,
          categoryId: category.id,
        },
      });
    }

    console.log(`Category "${category.name}" with ${services.length} services created`);
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
