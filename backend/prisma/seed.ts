import {
  PrismaClient,
  UserRole,
  PropertyType,
  PropertyStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MAR ABU Booking Platform database...");

  const existingUsers = await prisma.user.count();
  console.log(`👥 Users in DB before seeding: ${existingUsers}`);

  const hashedPassword = await bcrypt.hash("admin123", 12);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@marabuprojects.com" },
    update: {},
    create: {
      email: "admin@marabuprojects.com",
      firstName: "MAR",
      lastName: "ABU",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Admin created: ${superAdmin.email}`);

  // // Create Property Host
  // const propertyHost = await prisma.user.upsert({
  //   where: { email: 'host@marabuprojects.com' },
  //   update: {},
  //   create: {
  //     email: 'host@marabuprojects.com',
  //     firstName: 'Property',
  //     lastName: 'Manager',
  //     phone: '(+234) 803 619 4871',
  //     role: UserRole.PROPERTY_HOST,
  //     status: 'ACTIVE',
  //     password: hashedPassword,
  //     emailVerified: new Date(),
  //   },
  // })
  // console.log(`✅ Property Host created: ${propertyHost.email}`)

  // Create Customer
  const customer = await prisma.user.upsert({
    where: { email: "adejaretaye@gmail.com" },
    update: {},
    create: {
      email: "adejaretaye@gmail.com",
      firstName: "Adejare",
      lastName: "Taiwo",
      phone: "+234 816 276 1585",
      role: UserRole.CUSTOMER,
      status: "ACTIVE",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Customer created: ${customer.email}`);

  const properties = [
    {
      name: "MAR Executive Suites - OBUDU VILLA",
      description:
        "Escape to Obudu Villa, a luxurious 2 bedroom apartment tucked within Lakowe Lakes Golf & Country Estate—a grand 308-hectare sanctuary dubbed West Africa’s best-kept secret. This exceptional estate blends breathtaking nature with upscale leisure: an 18-hole championship golf course, over 14 serene lakes, lush palm groves, and resort-style recreation.\n\nWhat Obudu Villa Offers:\n• Stylish Accommodation: Spacious, elegant living in a master-planned community, ideal for getaways and villa owners.\n• Smart home automation: Alexa integration for seamless voice-controlled living.\n• Fully furnished interiors with upscale appliances: Elegant furniture, tasteful décor, and high-quality appliances.\n• Gated, Secure Living: Serene, gated community with 24-hour professional security.\n• World-Class Golf Access: Elite 18-hole, par-72 course, plus floodlit 9-hole mashie course, driving range, and golf academy.\n• Resort-Style Amenities: Swim, cycle, jog, pedal boat, yoga, outdoor cinema, bonfires, open-air movies.\n• High speed internet access: Uninterrupted connection for streaming, remote work, or hosting guests.",
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: "Lakowe Lakes Golf & Country Estate, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      size: 200.0,
      baseRate: 320000,
      weekendPremium: 0,
      cleaningFee: 20000,
      securityDeposit: 75000,
      amenities: [
        "Stylish Accommodation",
        "Smart Home Automation",
        "Fully Furnished Interiors",
        "Gated Secure Living",
        "World-Class Golf Access",
        "Resort-Style Amenities",
        "High Speed Internet",
        "Parking",
        "Security",
        "Generator",
      ],
    },
    {
      name: "MAR Waterfront Residences - ZIRCON",
      description:
        "Located on Zircon Road, Sapphire Garden Estate, Awoyaya, Ibeju-Lekki, Zircon is a beautifully designed 4-Bedroom Semi-Detached Duplex tailored for comfort, leisure, and connection. Perfect for family weekends, hangouts, or private parties, Zircon combines spacious interiors, modern finishing, and a warm, homely atmosphere.\n\nZircon offers:\n• Fully Furnished Interiors – Modern, stylish furniture and décor.\n• Spacious Living & Dining Area – For relaxation, gatherings, or work-from-home.\n• All Rooms Ensuite – Privacy and convenience.\n• Fully Equipped Kitchen – Fridge, gas cooker, microwave, utensils.\n• Smart TV + Streaming Access – Movies, shows, YouTube.\n• High-Speed WiFi – Reliable internet.\n• 24/7 Power Supply (Inverter Backup).\n• Air-Conditioned Rooms.\n• Ample Parking Space.",
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: "Sapphire Garden Estate, Awoyaya, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 8,
      size: 185.5,
      baseRate: 160000,
      weekendPremium: 0,
      cleaningFee: 18000,
      securityDeposit: 60000,
      amenities: [
        "Fully Furnished Interiors",
        "Spacious Living & Dining Area",
        "All Rooms Ensuite",
        "Fully Equipped Kitchen",
        "Smart TV + Streaming",
        "High-Speed WiFi",
        "24/7 Power Supply",
        "Air-Conditioned Rooms",
        "Ample Parking Space",
        "Security",
      ],
    },
    {
      name: "MAR Presidential Villa - WHITE-STONE",
      description:
        "Where luxury, smart living, and minimalist elegance meet. Located in the heart of Lekki, this ultra-spacious 2-bedroom shortlet is designed for those who crave comfort and sophistication.\n\n• Smart home technology\n• Outdoor pool for leisure\n• Minimalist, high-end interiors",
      type: PropertyType.VILLA,
      status: PropertyStatus.ACTIVE,
      address: "Whitestone by Schlepp, Perchstone & Graeys Close, Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      size: 250.0,
      baseRate: 350000,
      weekendPremium: 0,
      cleaningFee: 35000,
      securityDeposit: 150000,
      amenities: [
        "Smart Home Technology",
        "Outdoor Pool",
        "Minimalist High-End Interiors",
        "WiFi",
        "Parking",
        "Security",
      ],
    },
    {
      name: "MAR Luxury Penthouse - ABIKE PENTHOUSE",
      description:
        "Nestled within the prestigious Abike Residence, the Abike Penthouse is a stunning 2-bedroom luxury suite that reflects Mar Abu’s commitment to excellence. Designed for those who appreciate refined living, this fully furnished penthouse offers modern comfort, sophisticated aesthetics, and unmatched build quality.\n\nKey Features:\n• 2 spacious bedrooms with contemporary finishes\n• Tastefully curated interiors and premium furniture\n• Fully equipped kitchen with modern appliances\n• Sleek bathrooms fitted with top-grade sanitary wares\n• Elegant flow of natural light and ambient lighting\n• Private top-floor access with serene views",
      type: PropertyType.PENTHOUSE,
      status: PropertyStatus.ACTIVE,
      address: "Oribanwa Phase II, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      size: 180.0,
      baseRate: 200000,
      weekendPremium: 0,
      cleaningFee: 25000,
      securityDeposit: 100000,
      amenities: [
        "Contemporary Bedrooms",
        "Premium Furniture",
        "Fully Equipped Kitchen",
        "Sleek Bathrooms",
        "Natural Light",
        "Private Top-Floor Access",
        "WiFi",
        "Parking",
        "Security",
      ],
    },
  ];

  for (const propertyData of properties) {
    const { amenities, ...propertyFields } = propertyData;

    const property = await prisma.property.upsert({
      where: { name: propertyFields.name },
      update: {
        ...propertyFields,
        hostId: superAdmin.id,
        propertyAmenities: {
          create: (amenities ?? []).map((amenity, index) => ({
            name: amenity,
            category: index < 3 ? "Basic" : index < 6 ? "Premium" : "Luxury",
          })),
        },
      },
      create: {
        ...propertyFields,
        hostId: superAdmin.id,
        propertyAmenities: {
          create: (amenities ?? []).map((amenity, index) => ({
            name: amenity,
            category: index < 3 ? "Basic" : index < 6 ? "Premium" : "Luxury",
          })),
        },
      },
    });

    console.log(`🏠 Created property: ${property.name}`);
  }

  const systemSettings = [
    {
      key: "COMPANY_NAME",
      value: "MAR ABU PROJECTS SERVICES LLC",
      category: "General",
    },
    { key: "PRIMARY_COLOR", value: "#F6931B", category: "Branding" },
    { key: "SECONDARY_COLOR", value: "#000000", category: "Branding" },
    { key: "DEFAULT_SERVICE_FEE", value: "0.05", category: "Payment" },
    { key: "MIN_BOOKING_DAYS", value: "1", category: "Booking" },
    { key: "MAX_BOOKING_DAYS", value: "90", category: "Booking" },
    { key: "BOOKING_PREFIX", value: "MAR", category: "Booking" },
    { key: "DEFAULT_CHECK_IN_TIME", value: "15:00", category: "Booking" },
    { key: "DEFAULT_CHECK_OUT_TIME", value: "11:00", category: "Booking" },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
    console.log(`⚙️ System setting created: ${setting.key}`);
  }

  const finalUsers = await prisma.user.count();
  console.log(`✅ Final user count: ${finalUsers}`);
  console.log("🎉 Database seeding complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
