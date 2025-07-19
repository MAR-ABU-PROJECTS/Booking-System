import { PrismaClient, UserRole, PropertyType, PropertyStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding MAR ABU Booking Platform database...')

  const existingUsers = await prisma.user.count()
  console.log(`👥 Users in DB before seeding: ${existingUsers}`)

  const hashedPassword = await bcrypt.hash('admin123', 12)

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@marabuprojects.com' },
    update: {},
    create: {
      email: 'admin@marabuprojects.com',
      firstName: 'MAR',
      lastName: 'ABU',
      phone: '(+234) 803 619 4871',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })
  console.log(`✅ Super Admin created: ${superAdmin.email}`)

  // Create Property Host
  const propertyHost = await prisma.user.upsert({
    where: { email: 'host@marabuprojects.com' },
    update: {},
    create: {
      email: 'host@marabuprojects.com',
      firstName: 'Property',
      lastName: 'Manager',
      phone: '(+234) 803 619 4871',
      role: UserRole.PROPERTY_HOST,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })
  console.log(`✅ Property Host created: ${propertyHost.email}`)

  // Create Customer
  const customer = await prisma.user.upsert({
    where: { email: 'adejaretaye@gmail.com' },
    update: {},
    create: {
      email: 'adejaretaye@gmail.com',
      firstName: 'Adejare',
      lastName: 'Taiwo',
      phone: '+234 816 276 1585',
      role: UserRole.CUSTOMER,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })
  console.log(`✅ Customer created: ${customer.email}`)

  const properties = [
    {
      name: 'MAR Luxury Penthouse - ABIKE PENTHOUSE',
      description: 'Visionary residential development in Oribanwa, Ibeju-Lekki Lagos, Nigeria.',
      type: PropertyType.PENTHOUSE,
      status: PropertyStatus.ACTIVE,
      address: 'Oribanwa, Ibeju-Lekki Lagos, Nigeria',
      city: 'Lagos',
      state: 'Lagos',
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 8,
      size: 280.5,
      baseRate: 285000,
      weekendPremium: 15,
      cleaningFee: 25000,
      securityDeposit: 100000,
      amenities: ['WiFi', 'Ocean View', 'Concierge', 'Gym', 'Pool', 'Parking', 'Generator', 'Air Conditioning']
    },
    {
      name: 'MAR Executive Suites - OBUDU VILLA',
      description: 'Luxury and golf-course living in Lakowe, Lagos.',
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: 'Lakowe, Ibeju Lekki, Lagos',
      city: 'Lagos',
      state: 'Lagos',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      size: 200.0,
      baseRate: 195000,
      weekendPremium: 10,
      cleaningFee: 20000,
      securityDeposit: 75000,
      amenities: ['WiFi', 'City Views', 'Fitness Center', 'Parking', 'Security', 'Generator']
    },
    {
      name: 'MAR Waterfront Residences - ZIRCON',
      description: 'Semi-detached 4-bedroom duplex in Awoyaya, Ibeju-Lekki.',
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: 'Ibeju-Lekki, Lagos Nigeria.',
      city: 'Lagos',
      state: 'Lagos',
      bedrooms: 3,
      bathrooms: 3,
      maxGuests: 6,
      size: 185.5,
      baseRate: 165000,
      weekendPremium: 12,
      cleaningFee: 18000,
      securityDeposit: 60000,
      amenities: ['WiFi', 'Waterfront', 'Private Jetty', 'Garden', 'Pool', 'Parking', 'Security']
    },
    {
      name: 'MAR Presidential Villa - WHITE-STONE',
      description: 'Modern luxury villa in Banana Island, Lagos.',
      type: PropertyType.VILLA,
      status: PropertyStatus.ACTIVE,
      address: 'Banana Island, Lagos State',
      city: 'Lagos',
      state: 'Lagos',
      bedrooms: 5,
      bathrooms: 4,
      maxGuests: 12,
      size: 450.0,
      baseRate: 450000,
      weekendPremium: 20,
      cleaningFee: 35000,
      securityDeposit: 150000,
      amenities: ['WiFi', 'Private Beach', 'Infinity Pool', 'Home Cinema', 'Wine Cellar', 'Staff Quarters', 'Gym']
    }
  ]

  for (const propertyData of properties) {
    const { amenities, ...propertyFields } = propertyData

    const property = await prisma.property.create({
      data: {
        ...propertyFields,
        hostId: propertyHost.id,
        propertyAmenities: {
          create: (amenities ?? []).map((amenity, index) => ({
            name: amenity,
            category: index < 3 ? 'Basic' : index < 6 ? 'Premium' : 'Luxury'
          }))
        }
      }
    })

    console.log(`🏠 Created property: ${property.name}`)
  }

  const systemSettings = [
    { key: 'COMPANY_NAME', value: 'MAR ABU PROJECTS SERVICES LLC', category: 'General' },
    { key: 'PRIMARY_COLOR', value: '#F6931B', category: 'Branding' },
    { key: 'SECONDARY_COLOR', value: '#000000', category: 'Branding' },
    { key: 'DEFAULT_SERVICE_FEE', value: '0.05', category: 'Payment' },
    { key: 'MIN_BOOKING_DAYS', value: '1', category: 'Booking' },
    { key: 'MAX_BOOKING_DAYS', value: '90', category: 'Booking' },
    { key: 'BOOKING_PREFIX', value: 'MAR', category: 'Booking' },
    { key: 'DEFAULT_CHECK_IN_TIME', value: '15:00', category: 'Booking' },
    { key: 'DEFAULT_CHECK_OUT_TIME', value: '11:00', category: 'Booking' },
  ]

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
    console.log(`⚙️ System setting created: ${setting.key}`)
  }

  const finalUsers = await prisma.user.count()
  console.log(`✅ Final user count: ${finalUsers}`)
  console.log('🎉 Database seeding complete!')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
