import { PrismaClient, UserRole, PropertyType, PropertyStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding MAR ABU Booking Platform database...')

  // Create Super Admin User
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@marabu.com' },
    update: {},
    create: {
      email: 'admin@marabu.com',
      firstName: 'MAR ABU',
      lastName: 'Administrator',
      phone: '+234-801-MAR-ADMIN',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  // Create Property Host
  const propertyHost = await prisma.user.upsert({
    where: { email: 'host@marabu.com' },
    update: {},
    create: {
      email: 'host@marabu.com',
      firstName: 'Property',
      lastName: 'Manager',
      phone: '+234-801-MAR-HOST',
      role: UserRole.PROPERTY_HOST,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  // Create Sample Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Customer',
      phone: '+234-803-123-4567',
      role: UserRole.CUSTOMER,
      status: 'ACTIVE',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  // Create MAR ABU Properties (based on your mockups)
  const properties = [
    {
      name: 'MAR Luxury Penthouse - Victoria Island',
      description: 'Experience unparalleled luxury in this 4-bedroom penthouse featuring floor-to-ceiling windows, premium Italian marble finishes, and breathtaking views of Lagos lagoon.',
      type: PropertyType.PENTHOUSE,
      status: PropertyStatus.ACTIVE,
      address: 'Victoria Island, Lagos State',
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
      name: 'MAR Executive Suites - Ikoyi Heights',
      description: 'Elegantly appointed 3-bedroom executive suite in prestigious Ikoyi, featuring modern architectural design and premium appliances.',
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: 'Ikoyi, Lagos State',
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
      name: 'MAR Waterfront Residences - Lekki Phase 1',
      description: 'Stunning waterfront residence offering direct lagoon access, modern architectural design, and premium fixtures.',
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: 'Lekki Phase 1, Lagos State',
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
      name: 'MAR Presidential Villa - Banana Island',
      description: 'The epitome of luxury living - a 5-bedroom presidential villa featuring private beach access, infinity pool, and home cinema.',
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
    },
    {
      name: 'MAR Corporate Towers - Wuse 2, Abuja',
      description: 'Sophisticated 2-bedroom corporate apartment in prestigious Wuse 2, designed for business executives and diplomats.',
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: 'Wuse 2, Abuja, FCT',
      city: 'Abuja',
      state: 'FCT',
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      size: 120.0,
      baseRate: 125000,
      weekendPremium: 8,
      cleaningFee: 15000,
      securityDeposit: 50000,
      amenities: ['WiFi', 'Business Center', 'Meeting Rooms', 'Airport Transfer', 'Concierge', 'Parking']
    }
  ]

  // Create properties with amenities
  for (const propertyData of properties) {
    const { amenities, ...propertyFields } = propertyData
    
    const property = await prisma.property.create({
      data: {
        ...propertyFields,
        hostId: propertyHost.id,
        amenities: {
          create: amenities.map((amenity, index) => ({
            name: amenity,
            category: index < 3 ? 'Basic' : index < 6 ? 'Premium' : 'Luxury'
          }))
        }
      }
    })

    console.log(`✅ Created property: ${property.name}`)
  }

  // Create System Settings
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
      create: setting
    })
  }

  console.log('✅ System settings created')
  console.log('🎉 MAR ABU Booking Platform database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })