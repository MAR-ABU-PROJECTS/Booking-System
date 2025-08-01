"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🌱 Seeding MAR ABU Booking Platform database...");
        const existingUsers = yield prisma.user.count();
        console.log(`👥 Users in DB before seeding: ${existingUsers}`);
        const hashedPassword = yield bcryptjs_1.default.hash("admin123", 12);
        // Create Super Admin
        const superAdmin = yield prisma.user.upsert({
            where: { email: "admin@marabuprojects.com" },
            update: {},
            create: {
                email: "admin@marabuprojects.com",
                firstName: "MAR",
                lastName: "ABU",
                phone: "(+234) 803 619 4871",
                role: client_1.UserRole.ADMIN,
                status: "ACTIVE",
                password: hashedPassword,
                emailVerified: new Date(),
            },
        });
        console.log(`✅ Super Admin created: ${superAdmin.email}`);
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
        const customer = yield prisma.user.upsert({
            where: { email: "adejaretaye@gmail.com" },
            update: {},
            create: {
                email: "adejaretaye@gmail.com",
                firstName: "Adejare",
                lastName: "Taiwo",
                phone: "+234 816 276 1585",
                role: client_1.UserRole.CUSTOMER,
                status: "ACTIVE",
                password: hashedPassword,
                emailVerified: new Date(),
            },
        });
        console.log(`✅ Customer created: ${customer.email}`);
        const properties = [
            {
                name: "MAR Luxury Penthouse - ABIKE PENTHOUSE",
                description: "Visionary residential development in Oribanwa, Ibeju-Lekki Lagos, Nigeria.",
                type: client_1.PropertyType.PENTHOUSE,
                status: client_1.PropertyStatus.ACTIVE,
                address: "Oribanwa, Ibeju-Lekki Lagos, Nigeria",
                city: "Lagos",
                state: "Lagos",
                bedrooms: 4,
                bathrooms: 3,
                maxGuests: 8,
                size: 280.5,
                baseRate: 285000,
                weekendPremium: 15,
                cleaningFee: 25000,
                securityDeposit: 100000,
                amenities: [
                    "WiFi",
                    "Ocean View",
                    "Concierge",
                    "Gym",
                    "Pool",
                    "Parking",
                    "Generator",
                    "Air Conditioning",
                ],
            },
            {
                name: "MAR Executive Suites - OBUDU VILLA",
                description: "Luxury and golf-course living in Lakowe, Lagos.",
                type: client_1.PropertyType.SUITE,
                status: client_1.PropertyStatus.ACTIVE,
                address: "Lakowe, Ibeju Lekki, Lagos",
                city: "Lagos",
                state: "Lagos",
                bedrooms: 3,
                bathrooms: 2,
                maxGuests: 6,
                size: 200.0,
                baseRate: 195000,
                weekendPremium: 10,
                cleaningFee: 20000,
                securityDeposit: 75000,
                amenities: [
                    "WiFi",
                    "City Views",
                    "Fitness Center",
                    "Parking",
                    "Security",
                    "Generator",
                ],
            },
            {
                name: "MAR Waterfront Residences - ZIRCON",
                description: "Semi-detached 4-bedroom duplex in Awoyaya, Ibeju-Lekki.",
                type: client_1.PropertyType.APARTMENT,
                status: client_1.PropertyStatus.ACTIVE,
                address: "Ibeju-Lekki, Lagos Nigeria.",
                city: "Lagos",
                state: "Lagos",
                bedrooms: 3,
                bathrooms: 3,
                maxGuests: 6,
                size: 185.5,
                baseRate: 165000,
                weekendPremium: 12,
                cleaningFee: 18000,
                securityDeposit: 60000,
                amenities: [
                    "WiFi",
                    "Waterfront",
                    "Private Jetty",
                    "Garden",
                    "Pool",
                    "Parking",
                    "Security",
                ],
            },
            {
                name: "MAR Presidential Villa - WHITE-STONE",
                description: "Modern luxury villa in Banana Island, Lagos.",
                type: client_1.PropertyType.VILLA,
                status: client_1.PropertyStatus.ACTIVE,
                address: "Banana Island, Lagos State",
                city: "Lagos",
                state: "Lagos",
                bedrooms: 5,
                bathrooms: 4,
                maxGuests: 12,
                size: 450.0,
                baseRate: 450000,
                weekendPremium: 20,
                cleaningFee: 35000,
                securityDeposit: 150000,
                amenities: [
                    "WiFi",
                    "Private Beach",
                    "Infinity Pool",
                    "Home Cinema",
                    "Wine Cellar",
                    "Staff Quarters",
                    "Gym",
                ],
            },
        ];
        for (const propertyData of properties) {
            const { amenities } = propertyData, propertyFields = __rest(propertyData, ["amenities"]);
            const property = yield prisma.property.create({
                data: Object.assign(Object.assign({}, propertyFields), { hostId: superAdmin.id, propertyAmenities: {
                        create: (amenities !== null && amenities !== void 0 ? amenities : []).map((amenity, index) => ({
                            name: amenity,
                            category: index < 3 ? "Basic" : index < 6 ? "Premium" : "Luxury",
                        })),
                    } }),
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
            yield prisma.systemSetting.upsert({
                where: { key: setting.key },
                update: {},
                create: setting,
            });
            console.log(`⚙️ System setting created: ${setting.key}`);
        }
        const finalUsers = yield prisma.user.count();
        console.log(`✅ Final user count: ${finalUsers}`);
        console.log("🎉 Database seeding complete!");
    });
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));
