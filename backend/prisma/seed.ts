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

  const hashedPassword = await bcrypt.hash("M@r@BuP#L3tMeIn$2024", 12);

  // Create Super Admin - Force role update if user exists
  const superAdmin = await prisma.user.upsert({
    where: { email: "marabuprojects@yahoo.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 803 619 4871",
    },
    create: {
      email: "marabuprojects@yahoo.com",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(
    `✅ Admin created/updated: ${superAdmin.email} - Role: ${superAdmin.role}`
  );

  const superAdmin1 = await prisma.user.upsert({
    where: { email: "support@marabuprojects.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 803 619 4871",
    },
    create: {
      email: "support@marabuprojects.com",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(
    `✅ Admin created/updated: ${superAdmin1.email} - Role: ${superAdmin1.role}`
  );

  const superAdmin2 = await prisma.user.upsert({
    where: { email: "atandaremilekun@gmail.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 803 619 4871",
    },
    create: {
      email: "atandaremilekun@gmail.com",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(
    `✅ Admin created/updated: ${superAdmin2.email} - Role: ${superAdmin2.role}`
  );

  const Admin = await prisma.user.upsert({
    where: { email: "soputa42@gmail.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 802 998 4701",
    },
    create: {
      email: "soputa42@gmail.com",
      phone: "(+234) 802 998 4701",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Admin created/updated: ${Admin.email} - Role: ${Admin.role}`);

  const properties = [
    {
      name: "MAR Executive Suites - OBUDU VILLA",
      description:
        "Escape to Obudu Villa, a luxurious 2 bedroom apartment tucked within Lakowe Lakes Golf & Country Estate—a grand 308-hectare sanctuary dubbed West Africa's best-kept secret. This exceptional estate blends breathtaking nature with upscale leisure.\n\nWhat Obudu Villa Offers:\n• Smart home automation with Alexa voice control for seamless living\n• Fully equipped modern kitchen with washing machine, refrigerator, oven, and microwave\n• Dedicated workspace perfect for remote work or study\n• Elegant balcony with a scenic view\n• Access to swimming pool for two guests\n• High-speed internet for streaming and work\n• Free parking in a secure, gated community\n• Spacious dining area for entertaining",
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: "Lakowe Lakes Golf & Country Estate, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 3, // 2 bathrooms + guest toilet
      maxGuests: 6, // No restrictions but need a reasonable default
      size: 200.0,
      baseRate: 320000,
      weekendPremium: 0,
      securityDeposit: 75000,
      amenities: [
        "Washing Machine",
        "Refrigerator",
        "Oven",
        "Microwave",
        "Alexa Voice Control",
        "Work Space",
        "Free Parking",
        "Dining Area",
        "Balcony with View",
        "Swimming Pool Access",
        "High Speed Internet",
        "Security",
        "Generator",
      ],
    },
    {
      name: "MAR Waterfront Residences - ZIRCON",
      description:
        "Located on Zircon Road, Sapphire Garden Estate, Awoyaya, Ibeju-Lekki, Zircon is a beautifully designed 4-Bedroom Semi-Detached Duplex tailored for comfort, leisure, and connection. Perfect for family weekends, hangouts, or private parties.\n\nZircon offers:\n• Modern kitchen equipped with microwave, oven, washing machine, and refrigerator\n• Entertainment zone with pool table and table tennis\n• Cutting-edge gaming with PS5\n• Premium entertainment package including Netflix and DSTV\n• Luxurious master bathroom featuring bathtub\n• Stunning aquarium feature\n• Swimming pool access\n• Spacious dining area and free parking",
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: "Sapphire Garden Estate, Awoyaya, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 4,
      bathrooms: 5, // 4 toilets plus visitor's toilet
      maxGuests: 10, // No restrictions but need a reasonable default
      size: 185.5,
      baseRate: 160000,
      weekendPremium: 0,
      securityDeposit: 60000,
      amenities: [
        "Microwave",
        "Oven",
        "Washing Machine",
        "Refrigerator",
        "Bathtub (Master Bathroom)",
        "Game Area",
        "WiFi",
        "PS5",
        "Netflix and DSTV",
        "Aquarium",
        "Dining Area",
        "Free Parking",
        "Swimming Pool",
        "Air Conditioning",
        "24/7 Power Supply",
      ],
    },
    {
      name: "MAR Presidential Villa - WHITE-STONE",
      description:
        "Where luxury, smart living, and minimalist elegance meet. Located in the heart of Lekki, this ultra-spacious 2-bedroom shortlet is designed for those who crave comfort and sophistication.\n\n• Fully equipped kitchen with washing machine, refrigerator, microwave, and oven\n• Elegant outer lounge area for relaxation\n• Private swimming pool\n• Spacious dining area for entertaining\n• Stunning balcony with city views\n• Minimalist, high-end interiors",
      type: PropertyType.VILLA,
      status: PropertyStatus.ACTIVE,
      address: "Whitestone by Schlepp, Perchstone & Graeys Close, Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6, // No restrictions but need a reasonable default
      size: 250.0,
      baseRate: 350000,
      weekendPremium: 0,
      securityDeposit: 150000,
      amenities: [
        "Outer Lounge Area",
        "Dining Area",
        "Washing Machine",
        "Refrigerator",
        "Microwave",
        "Oven",
        "Swimming Pool",
        "Balcony with City View",
        "WiFi",
        "Security",
        "Minimalist High-End Interiors",
      ],
    },
    {
      name: "MAR Luxury Penthouse - ABIKE PENTHOUSE",
      description:
        "Nestled within the prestigious Abike Residence, the Abike Penthouse is a stunning 2-bedroom luxury suite that reflects Mar Abu's commitment to excellence. Designed for those who appreciate refined living, this fully furnished penthouse offers modern comfort, sophisticated aesthetics, and unmatched build quality.\n\nKey Features:\n• 2 spacious bedrooms with contemporary finishes\n• Tastefully curated interiors and premium furniture\n• Fully equipped kitchen with modern appliances\n• Sleek bathrooms fitted with top-grade sanitary wares\n• Elegant flow of natural light and ambient lighting\n• Private top-floor access with serene views",
      type: PropertyType.PENTHOUSE,
      status: PropertyStatus.ACTIVE,
      address: "Oribanwa Phase II, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6, // No restrictions but need a reasonable default
      size: 180.0,
      baseRate: 200000,
      weekendPremium: 0,
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
    { key: "DEFAULT_CAUTION_FEE", value: "0.05", category: "Payment" },
    { key: "MIN_BOOKING_DAYS", value: "1", category: "Booking" },
    { key: "MAX_BOOKING_DAYS", value: "90", category: "Booking" },
    { key: "BOOKING_PREFIX", value: "MAR", category: "Booking" },
    { key: "DEFAULT_CHECK_IN_TIME", value: "14:00", category: "Booking" },
    { key: "DEFAULT_CHECK_OUT_TIME", value: "12:00", category: "Booking" },
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