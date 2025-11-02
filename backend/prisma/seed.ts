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

  const superAdmin3 = await prisma.user.upsert({
    where: { email: "adejaretaye22@gmail.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 803 619 4871",
    },
    create: {
      email: "adejaretaye22@gmail.com",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(
    `✅ Admin created/updated: ${superAdmin3.email} - Role: ${superAdmin3.role}`
  );
  const superAdmin4 = await prisma.user.upsert({
    where: { email: "adejaretaye33@gmail.com" },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      phone: "(+234) 803 619 4871",
    },
    create: {
      email: "adejaretaye33@gmail.com",
      phone: "(+234) 803 619 4871",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(
    `✅ Admin created/updated: ${superAdmin4.email} - Role: ${superAdmin4.role}`
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

  // Shared amenities for Obudu Villa properties
  const obuduVillaAmenities = [
    "Washing Machine",
    "Refrigerator",
    "Oven",
    "Microwave",
    "Alexa Voice Control",
    "Work Space",
    "Free Parking",
    "Dining Area",
    "Balcony with View",
    "Swimming Pool Access for Two",
    "High Speed Internet",
    "24-Hour Security",
    "Golf Course Access",
    "Smart Home Automation",
  ];

  const properties = [
    {
      name: "MAR Executive Suites - OBUDU VILLA 8",
      description:
        "Escape to Obudu Villa 8, a luxurious 2-bedroom apartment tucked within Lakowe Lakes Golf & Country Estate—a grand 308-hectare sanctuary dubbed West Africa's best-kept secret. This exceptional estate blends breathtaking nature with upscale leisure: an 18-hole championship golf course, over 14 serene lakes, lush palm groves, and resort-style recreation.\n\nWhat Obudu Villa 8 Offers:\n• Stylish Accommodation: Spacious, elegant living in this master-planned community, ideal for both getaway seekers and villa owners\n• Smart Home Automation: Equipped with Alexa integration, giving you seamless voice-controlled living at your fingertips\n• Fully Furnished Interiors: Elegant furniture, tasteful décor, and high-quality appliances designed for convenience and style\n• Gated, Secure Living: Located in a serene, gated community with 24-hour professional security and seamless infrastructure\n• World-Class Golf Access: Enjoy the elite 18-hole, par-72 course by Robert O'Friel—plus a floodlit 9-hole mashie course, driving range, and golf academy\n• Resort-Style Amenities: Swim, cycle, jog, or unwind via pedal boat, yoga, or outdoor cinema\n• High Speed Internet Access: Uninterrupted connection for streaming, remote work, or hosting guests",
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: "Lakowe Lakes Golf & Country Estate, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      size: 200.0,
      baseRate: 320000,
      weekendPremium: 0,
      securityDeposit: 75000,
      amenities: obuduVillaAmenities,
    },
    {
      name: "MAR Executive Suites - OBUDU VILLA 10",
      description:
        "Escape to Obudu Villa 10, a luxurious 2-bedroom apartment tucked within Lakowe Lakes Golf & Country Estate—a grand 308-hectare sanctuary dubbed West Africa's best-kept secret. This exceptional estate blends breathtaking nature with upscale leisure: an 18-hole championship golf course, over 14 serene lakes, lush palm groves, and resort-style recreation.\n\nWhat Obudu Villa 10 Offers:\n• Stylish Accommodation: Spacious, elegant living in this master-planned community, ideal for both getaway seekers and villa owners\n• Smart Home Automation: Equipped with Alexa integration, giving you seamless voice-controlled living at your fingertips\n• Fully Furnished Interiors: Elegant furniture, tasteful décor, and high-quality appliances designed for convenience and style\n• Gated, Secure Living: Located in a serene, gated community with 24-hour professional security and seamless infrastructure\n• World-Class Golf Access: Enjoy the elite 18-hole, par-72 course by Robert O'Friel—plus a floodlit 9-hole mashie course, driving range, and golf academy\n• Resort-Style Amenities: Swim, cycle, jog, or unwind via pedal boat, yoga, or outdoor cinema\n• High Speed Internet Access: Uninterrupted connection for streaming, remote work, or hosting guests",
      type: PropertyType.SUITE,
      status: PropertyStatus.ACTIVE,
      address: "Lakowe Lakes Golf & Country Estate, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      size: 200.0,
      baseRate: 320000,
      weekendPremium: 0,
      securityDeposit: 75000,
      amenities: obuduVillaAmenities,
    },
    {
      name: "MAR Waterfront Residences - ZIRCON",
      description:
        "Located on Zircon Road, Sapphire Garden Estate, in the heart of Awoyaya, Ibeju-Lekki, Zircon is a beautifully designed 4-Bedroom Semi-Detached Duplex tailored for comfort, leisure, and connection.\n\nWhether it's a cozy family weekend, a lively hangout with friends, or an intimate private party, Zircon gives you the perfect setting. With its spacious interiors, modern finishing, and warm, homely atmosphere, it combines both comfort and functionality.\n\nZircon Offers:\n• Fully Furnished Interiors: Modern, stylish furniture and décor designed for comfort and a premium lifestyle\n• Spacious Living & Dining Area: Perfect for relaxation, small gatherings, or even work-from-home stays\n• All Rooms Ensuite: Privacy and convenience with well-fitted bathrooms in every room\n• Fully Equipped Kitchen: Comes with modern appliances like fridge, gas cooker, microwave, and utensils\n• Smart TV + Streaming Access: Stay entertained with movies, shows, and YouTube right at your fingertips\n• High-Speed WiFi: Reliable internet for work, streaming, or staying connected\n• 24/7 Power Supply: Inverter backup ensures no interruptions\n• Air-Conditioned Rooms: Cool and cozy interiors for Lagos weather\n• Ample Parking Space: Safe and secure parking for guests",
      type: PropertyType.APARTMENT,
      status: PropertyStatus.ACTIVE,
      address: "Sapphire Garden Estate, Awoyaya, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 10,
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
        "Game Area (Pool and Table Tennis)",
        "WiFi",
        "PS5",
        "Netflix and DSTV",
        "Aquarium",
        "Dining Area",
        "Free Parking",
        "Air Conditioning",
        "24/7 Power Supply",
        "Smart TV",
      ],
    },
    {
      name: "MAR Presidential Villa - WHITESTONE",
      description:
        "This is where luxury, smart living, and minimalist elegance meet. Located in the heart of Lekki, this ultra-spacious 2-bedroom shortlet is designed for those who crave comfort and luxury with sophistication.\n\nKey Features:\n• Smart home technology for seamless modern living\n• Outdoor pool for leisure and relaxation\n• Minimalist, high-end interiors with sophisticated aesthetics\n• Fully equipped kitchen with modern appliances\n• Spacious dining and lounge areas\n• Premium finishes throughout\n\nMinimum Stay: 3 nights",
      type: PropertyType.VILLA,
      status: PropertyStatus.ACTIVE,
      address: "Whitestone by Schlepp, Perchstone & Graeys Close, Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
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
        "Smart Home Technology",
        "Minimalist High-End Interiors",
      ],
    },
    {
      name: "MAR Luxury Penthouse - ABIKE PENTHOUSE",
      description:
        "Nestled within the prestigious Abike Residence, the Abike Penthouse is a stunning 2-bedroom luxury suite that reflects the very essence of Mar Abu's commitment to excellence. Built by us, owned by us.\n\nDesigned for those who appreciate refined living, this fully furnished penthouse offers a seamless blend of modern comfort, sophisticated aesthetics, and unmatched build quality.\n\nKey Features:\n• 2 spacious bedrooms with contemporary finishes\n• Tastefully curated interiors and premium furniture\n• Fully equipped kitchen with modern appliances\n• Sleek bathrooms fitted with top-grade sanitary wares\n• Elegant flow of natural light and ambient lighting\n• Private top-floor access with serene views",
      type: PropertyType.PENTHOUSE,
      status: PropertyStatus.ACTIVE,
      address: "Oribanwa Phase II, Ibeju-Lekki",
      city: "Lagos",
      state: "Lagos",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      size: 180.0,
      baseRate: 200000,
      weekendPremium: 0,
      securityDeposit: 100000,
      amenities: [
        "Contemporary Bedrooms",
        "Premium Furniture",
        "Fully Equipped Kitchen",
        "Top-Grade Sanitary Wares",
        "Natural Light",
        "Ambient Lighting",
        "Private Top-Floor Access",
        "Serene Views",
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
