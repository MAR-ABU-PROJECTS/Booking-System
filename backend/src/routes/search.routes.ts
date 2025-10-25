// MAR ABU PROJECTS SERVICES LLC - Search and Filter Routes
import { Router } from "express";
import { query, validationResult } from "express-validator";
import { PropertyType, PropertyStatus } from "@prisma/client";
import { optionalAuth, requireAuth } from "../services/authservice";
import { asyncHandler } from "../middlewares/error.middleware";
import { AppError } from "../middlewares/error.middleware";
import { prisma } from "../server";
import { validatePagination, calculatePagination } from "../utils/helpers";

const router = Router();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// ===============================
// PROPERTY SEARCH ROUTES
// ===============================

/**
 * @route   GET /search/properties
 * @desc    Advanced property search with filters
 * @access  Public
 */
/**
 * @swagger
 * /search/properties:
 *   get:
 *     summary: Advanced property search with filters
 *     description: Search properties with text, location, price range, amenities, availability, and geospatial filters.
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Free text search across name, description, city, and address
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN, COTTAGE, BUNGALOW] # Example values, replace with PropertyType enum
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: maxGuests
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *         description: Comma-separated list of amenities
 *       - in: query
 *         name: checkIn
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: checkOut
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price, rating, distance, popularity, newest]
 *         default: popularity
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         default: 20
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Used with longitude & radius for geo search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           minimum: 0
 *         default: 50
 *         description: Radius in kilometers for geo search
 *     responses:
 *       200:
 *         description: Properties found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                           type:
 *                             type: string
 *                           baseRate:
 *                             type: number
 *                           averageRating:
 *                             type: number
 *                             example: 4.5
 *                           reviewCount:
 *                             type: integer
 *                             example: 12
 *                           bookingCount:
 *                             type: integer
 *                             example: 34
 *                           popularityScore:
 *                             type: number
 *                             example: 56.7
 *                           distance:
 *                             type: number
 *                             nullable: true
 *                             example: 12.3
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 134
 *                         pages:
 *                           type: integer
 *                           example: 7
 *                     facets:
 *                       type: object
 *                       properties:
 *                         cities:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         types:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         priceRange:
 *                           type: object
 *                           properties:
 *                             min:
 *                               type: number
 *                               example: 50
 *                             max:
 *                               type: number
 *                               example: 1200
 *                     searchParams:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Invalid query parameter(s)
 *       500:
 *         description: Internal server error
 */
router.get(
  "/properties",
  optionalAuth,
  [
    query("q")
      .optional()
      .isString()
      .withMessage("Search query must be a string"),
    query("city").optional().isString(),
    query("state").optional().isString(),
    query("country").optional().isString(),
    query("type").optional().isIn(Object.values(PropertyType)),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
    query("bedrooms").optional().isInt({ min: 0 }),
    query("bathrooms").optional().isInt({ min: 0 }),
    query("maxGuests").optional().isInt({ min: 1 }),
    query("amenities").optional().isString(),
    query("checkIn").optional().isISO8601(),
    query("checkOut").optional().isISO8601(),
    query("sortBy")
      .optional()
      .isIn(["price", "rating", "distance", "popularity", "newest"]),
    query("order").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("latitude").optional().isFloat(),
    query("longitude").optional().isFloat(),
    query("radius").optional().isFloat({ min: 0 }),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const {
      q,
      city,
      state,
      country,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities,
      checkIn,
      checkOut,
      sortBy = "popularity",
      order = "desc",
      page = 1,
      limit = 20,
      latitude,
      longitude,
      radius = 50, // km
    } = req.query;

    const { page: validPage, limit: validLimit } = validatePagination(
      page,
      limit
    );

    // Build where clause
    const where: any = {
      status: PropertyStatus.ACTIVE,
    };

    // Text search
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    // Location filters
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { contains: state, mode: "insensitive" };
    if (country) where.country = { contains: country, mode: "insensitive" };

    // Property filters
    if (type) where.type = type;
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms) };
    if (bathrooms) where.bathrooms = { gte: parseInt(bathrooms) };
    if (maxGuests) where.maxGuests = { gte: parseInt(maxGuests) };

    // Price range
    if (minPrice || maxPrice) {
      where.baseRate = {};
      if (minPrice) where.baseRate.gte = parseFloat(minPrice);
      if (maxPrice) where.baseRate.lte = parseFloat(maxPrice);
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities.split(",").map((a: string) => a.trim());
      where.amenities = {
        hasEvery: amenityList,
      };
    }

    // Availability filter
    if (checkIn && checkOut) {
      where.NOT = {
        bookings: {
          some: {
            status: { in: ["PENDING", "APPROVED"] },
            OR: [
              {
                checkIn: { lte: new Date(checkOut) },
                checkOut: { gte: new Date(checkIn) },
              },
            ],
          },
        },
      };
    }

    // Geographic search
    let distanceFilter = {};
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusInDegrees = parseFloat(radius) / 111; // Rough conversion km to degrees

      distanceFilter = {
        latitude: {
          gte: lat - radiusInDegrees,
          lte: lat + radiusInDegrees,
        },
        longitude: {
          gte: lng - radiusInDegrees,
          lte: lng + radiusInDegrees,
        },
      };
      Object.assign(where, distanceFilter);
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case "price":
        orderBy = { baseRate: order };
        break;
      case "rating":
        // Will be handled in post-processing
        orderBy = { createdAt: "desc" };
        break;
      case "distance":
        // Will be handled in post-processing if lat/lng provided
        orderBy = { createdAt: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "popularity":
      default:
        // Sort by booking count
        orderBy = { createdAt: "desc" };
        break;
    }

    // Execute search
    const [properties, total, facets] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (validPage - 1) * validLimit,
        take: validLimit,
        include: {
          host: {
            select: {
              id: true,
              avatar: true,
              createdAt: true,
            },
          },
          reviews: {
            where: { approved: true },
            select: { rating: true },
          },
          bookings: {
            where: {
              status: { in: ["APPROVED", "COMPLETED"] },
              createdAt: {
                gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
              }, // Last year
            },
            select: { id: true },
          },
          _count: {
            select: {
              reviews: {
                where: { approved: true },
              },
            },
          },
        },
      }),
      prisma.property.count({ where }),
      // Get facets for filtering
      Promise.all([
        prisma.property.groupBy({
          by: ["city"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { city: true },
          orderBy: { _count: { city: "desc" } },
          take: 20,
        }),
        prisma.property.groupBy({
          by: ["type"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { type: true },
        }),
        prisma.property.aggregate({
          where: { status: PropertyStatus.ACTIVE },
          _min: { baseRate: true },
          _max: { baseRate: true },
        }),
      ]),
    ]);

    // Process properties with calculated fields
    const processedProperties = properties.map((property) => {
      const ratings = property.reviews.map((r) => r.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      // Calculate distance if lat/lng provided
      let distance = null;
      if (latitude && longitude) {
        const lat1 = parseFloat(latitude);
        const lng1 = parseFloat(longitude);
        const lat2 = property.latitude;
        const lng2 = property.longitude;

        if (lat2 && lng2) {
          // Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLng = ((lng2 - lng1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }
      }

      return {
        ...property,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property._count.reviews,
        bookingCount: property.bookings.length,
        popularityScore:
          property.bookings.length * 0.7 +
          averageRating * property._count.reviews * 0.3,
        distance: distance ? Math.round(distance * 10) / 10 : null,
        reviews: undefined,
        bookings: undefined,
        _count: undefined,
      };
    });

    // Apply sorting that requires calculated fields
    if (sortBy === "rating") {
      processedProperties.sort((a, b) => {
        return order === "desc"
          ? b.averageRating - a.averageRating
          : a.averageRating - b.averageRating;
      });
    } else if (sortBy === "distance" && latitude && longitude) {
      processedProperties.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return order === "desc"
          ? b.distance - a.distance
          : a.distance - b.distance;
      });
    } else if (sortBy === "popularity") {
      processedProperties.sort((a, b) => {
        return order === "desc"
          ? b.popularityScore - a.popularityScore
          : a.popularityScore - b.popularityScore;
      });
    }

    const [cities, types, priceRange] = facets;
    const pagination = calculatePagination(validPage, validLimit, total);

    res.json({
      success: true,
      data: {
        properties: processedProperties,
        pagination,
        facets: {
          cities: cities.map((c) => ({ name: c.city, count: c._count.city })),
          types: types.map((t) => ({ name: t.type, count: t._count.type })),
          priceRange: {
            min: priceRange._min.baseRate || 0,
            max: priceRange._max.baseRate || 1000000,
          },
        },
        searchParams: {
          q,
          city,
          state,
          country,
          type,
          minPrice,
          maxPrice,
          bedrooms,
          bathrooms,
          maxGuests,
          amenities,
          checkIn,
          checkOut,
          sortBy,
          order,
        },
      },
    });
  })
);

/**
 * @route   GET /search/suggestions
 * @desc    Get search suggestions for autocomplete
 * @access  Public
 */
/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions for autocomplete
 *     description: Returns autocomplete suggestions for cities and/or properties based on a query string.
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: The search query string (must be at least 2 characters).
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [cities, properties, all]
 *           default: all
 *         description: The type of suggestions to return (cities, properties, or all).
 *     responses:
 *       200:
 *         description: Suggestions successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                             example: "Lagos, Lagos State, Nigeria"
 *                           type:
 *                             type: string
 *                             example: "city"
 *                           count:
 *                             type: integer
 *                             example: 12
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "prop_12345"
 *                           text:
 *                             type: string
 *                             example: "Seaside Villa"
 *                           subtitle:
 *                             type: string
 *                             example: "Lagos, Lagos State"
 *                           type:
 *                             type: string
 *                             example: "property"
 *                           propertyType:
 *                             type: string
 *                             example: "apartment"
 *                           price:
 *                             type: number
 *                             example: 250
 *                           image:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/property.jpg"
 *       400:
 *         description: Invalid query parameter(s)
 *       500:
 *         description: Internal server error
 */
router.get(
  "/suggestions",
  [
    query("q")
      .isString()
      .isLength({ min: 2 })
      .withMessage("Query must be at least 2 characters"),
    query("type").optional().isIn(["cities", "properties", "all"]),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    const { q, type = "all" } = req.query;

    const suggestions: any = {
      cities: [],
      properties: [],
    };

    if (type === "cities" || type === "all") {
      // City suggestions
      const cities = await prisma.property.groupBy({
        by: ["city", "state", "country"],
        where: {
          status: PropertyStatus.ACTIVE,
          OR: [
            { city: { contains: q, mode: "insensitive" } },
            { state: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        },
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 5,
      });

      suggestions.cities = cities.map((city) => ({
        text: `${city.city}, ${city.state}, ${city.country}`,
        type: "city",
        count: city._count.city,
      }));
    }

    if (type === "properties" || type === "all") {
      // Property suggestions
      const properties = await prisma.property.findMany({
        where: {
          status: PropertyStatus.ACTIVE,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          type: true,
          baseRate: true,
          images: true,
        },
        take: 5,
      });

      suggestions.properties = properties.map((property) => ({
        id: property.id,
        text: property.name,
        subtitle: `${property.city}, ${property.state}`,
        type: "property",
        propertyType: property.type,
        price: property.baseRate,
        image: property.images?.[0] || null,
      }));
    }

    res.json({
      success: true,
      data: suggestions,
    });
  })
);

/**
 * @route   GET /search/filters
 * @desc    Get available filters for search
 * @access  Public
 */
/**
 * @swagger
 * /properties/filters:
 *   get:
 *     summary: Get available property filters
 *     description: Returns filter options for properties, including cities, types, price ranges, amenities, bedrooms, bathrooms, and sorting options.
 *     tags:
 *       - Properties
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Lagos, Lagos State"
 *                           value:
 *                             type: string
 *                             example: "Lagos"
 *                           count:
 *                             type: integer
 *                             example: 120
 *                     propertyTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Apartment"
 *                           value:
 *                             type: string
 *                             example: "Apartment"
 *                           count:
 *                             type: integer
 *                             example: 50
 *                     priceRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 15000
 *                         max:
 *                           type: number
 *                           example: 250000
 *                         average:
 *                           type: number
 *                           example: 75000
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               label:
 *                                 type: string
 *                                 example: "Budget (Under ₦25,000)"
 *                               min:
 *                                 type: number
 *                                 example: 0
 *                               max:
 *                                 type: number
 *                                 example: 25000
 *                     amenities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Pool"
 *                           value:
 *                             type: string
 *                             example: "Pool"
 *                           count:
 *                             type: integer
 *                             example: 25
 *                     bedrooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "2 bedrooms"
 *                           value:
 *                             type: integer
 *                             example: 2
 *                           count:
 *                             type: integer
 *                             example: 40
 *                     bathrooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "1 bathroom"
 *                           value:
 *                             type: integer
 *                             example: 1
 *                           count:
 *                             type: integer
 *                             example: 30
 *                     sortOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Price: Low to High"
 *                           value:
 *                             type: string
 *                             example: "price"
 *                           order:
 *                             type: string
 *                             example: "asc"
 */
router.get(
  "/filters",
  asyncHandler(async (req: any, res: any) => {
    const [cities, types, priceRange, amenities, bedrooms, bathrooms] =
      await Promise.all([
        // Available cities
        prisma.property.groupBy({
          by: ["city", "state"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { city: true },
          orderBy: { _count: { city: "desc" } },
          take: 50,
        }),

        // Property types
        prisma.property.groupBy({
          by: ["type"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { type: true },
          orderBy: { _count: { type: "desc" } },
        }),

        // Price range
        prisma.property.aggregate({
          where: { status: PropertyStatus.ACTIVE },
          _min: { baseRate: true },
          _max: { baseRate: true },
          _avg: { baseRate: true },
        }),

        // Common amenities
        prisma.$queryRaw`
        SELECT 
          unnest(amenities) as amenity,
          COUNT(*) as count
        FROM property 
        WHERE status = 'ACTIVE' 
        AND amenities IS NOT NULL
        GROUP BY unnest(amenities)
        ORDER BY count DESC
        LIMIT 20
      `,

        // Bedroom options
        prisma.property.groupBy({
          by: ["bedrooms"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { bedrooms: true },
          orderBy: { bedrooms: "asc" },
        }),

        // Bathroom options
        prisma.property.groupBy({
          by: ["bathrooms"],
          where: { status: PropertyStatus.ACTIVE },
          _count: { bathrooms: true },
          orderBy: { bathrooms: "asc" },
        }),
      ]);

    res.json({
      success: true,
      data: {
        locations: cities.map((city) => ({
          label: `${city.city}, ${city.state}`,
          value: city.city,
          count: city._count.city,
        })),
        propertyTypes: types.map((type) => ({
          label: type.type,
          value: type.type,
          count: type._count.type,
        })),
        priceRange: {
          min: priceRange._min.baseRate || 0,
          max: priceRange._max.baseRate || 1000000,
          average: priceRange._avg.baseRate || 50000,
          suggestions: [
            { label: "Budget (Under ₦25,000)", min: 0, max: 25000 },
            { label: "Mid-range (₦25,000 - ₦75,000)", min: 25000, max: 75000 },
            { label: "Luxury (₦75,000 - ₦150,000)", min: 75000, max: 150000 },
            { label: "Premium (Above ₦150,000)", min: 150000, max: 1000000 },
          ],
        },
        amenities: (amenities as any[]).map((amenity: any) => ({
          label: amenity.amenity,
          value: amenity.amenity,
          count: amenity.count,
        })),
        bedrooms: bedrooms.map((bedroom) => ({
          label:
            bedroom.bedrooms === 0
              ? "Studio"
              : `${bedroom.bedrooms} bedroom${bedroom.bedrooms > 1 ? "s" : ""}`,
          value: bedroom.bedrooms,
          count: bedroom._count.bedrooms,
        })),
        bathrooms: bathrooms.map((bathroom) => ({
          label: `${bathroom.bathrooms} bathroom${bathroom.bathrooms > 1 ? "s" : ""}`,
          value: bathroom.bathrooms,
          count: bathroom._count.bathrooms,
        })),
        sortOptions: [
          { label: "Most Popular", value: "popularity" },
          { label: "Price: Low to High", value: "price", order: "asc" },
          { label: "Price: High to Low", value: "price", order: "desc" },
          { label: "Highest Rated", value: "rating", order: "desc" },
          { label: "Newest", value: "newest", order: "desc" },
        ],
      },
    });
  })
);

/**
 * @route   GET /search/popular
 * @desc    Get popular destinations and properties
 * @access  Public
 */
/**
 * @swagger
 * /search/filters:
 *   get:
 *     summary: Get available filters for search
 *     description: Returns available filters such as locations, property types, price ranges, amenities, bedrooms, and bathrooms for property search.
 *     tags:
 *       - Search
 *     responses:
 *       200:
 *         description: Filters successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Lagos, Lagos State"
 *                           value:
 *                             type: string
 *                             example: "Lagos"
 *                           count:
 *                             type: integer
 *                             example: 25
 *                     propertyTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Apartment"
 *                           value:
 *                             type: string
 *                             example: "apartment"
 *                           count:
 *                             type: integer
 *                             example: 120
 *                     priceRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 10000
 *                         max:
 *                           type: number
 *                           example: 500000
 *                         average:
 *                           type: number
 *                           example: 75000
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               label:
 *                                 type: string
 *                                 example: "Mid-range (₦25,000 - ₦75,000)"
 *                               min:
 *                                 type: number
 *                                 example: 25000
 *                               max:
 *                                 type: number
 *                                 example: 75000
 *                     amenities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "WiFi"
 *                           value:
 *                             type: string
 *                             example: "WiFi"
 *                           count:
 *                             type: integer
 *                             example: 340
 *                     bedrooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "2 bedrooms"
 *                           value:
 *                             type: integer
 *                             example: 2
 *                           count:
 *                             type: integer
 *                             example: 80
 *                     bathrooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "1 bathroom"
 *                           value:
 *                             type: integer
 *                             example: 1
 *                           count:
 *                             type: integer
 *                             example: 95
 *                     sortOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                             example: "Price: Low to High"
 *                           value:
 *                             type: string
 *                             example: "price"
 *                           order:
 *                             type: string
 *                             example: "asc"
 *       500:
 *         description: Internal server error
 */
router.get(
  "/popular",
  asyncHandler(async (req: any, res: any) => {
    const [popularCities, featuredProperties, trendingSearches] =
      await Promise.all([
        // Popular cities based on booking count
        prisma.$queryRaw`
        SELECT 
          p.city,
          p.state,
          COUNT(b.id) as booking_count,
          COUNT(DISTINCT p.id) as property_count,
          AVG(p.base_rate) as avg_price
        FROM property p
        LEFT JOIN booking b ON p.id = b.property_id 
          AND b.created_at >= ${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)}
        WHERE p.status = 'ACTIVE'
        GROUP BY p.city, p.state
        HAVING COUNT(DISTINCT p.id) >= 3
        ORDER BY booking_count DESC, property_count DESC
        LIMIT 8
      `,

        // Featured properties (high rated with recent bookings)
        prisma.property.findMany({
          where: {
            status: PropertyStatus.ACTIVE,
            reviews: {
              some: {
                approved: true,
                rating: { gte: 4 },
              },
            },
            bookings: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
          take: 6,
          include: {
            reviews: {
              where: { approved: true },
              select: { rating: true },
            },
            _count: {
              select: {
                reviews: { where: { approved: true } },
                bookings: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        // Trending searches (mock data - would be based on search analytics)
        Promise.resolve([
          { query: "Lagos Apartments", count: 1250 },
          { query: "Abuja Hotels", count: 980 },
          { query: "Port Harcourt Guesthouses", count: 750 },
          { query: "Kano Lodges", count: 680 },
          { query: "Ibadan Villas", count: 420 },
        ]),
      ]);

    // Process featured properties
    const processedFeatured = featuredProperties.map((property) => {
      const ratings = property.reviews.map((r) => r.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      return {
        id: property.id,
        name: property.name,
        city: property.city,
        state: property.state,
        type: property.type,
        baseRate: property.baseRate,
        images: property.images,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property._count.reviews,
        bookingCount: property._count.bookings,
      };
    });

    res.json({
      success: true,
      data: {
        popularDestinations: (popularCities as Array<any>).map((city: any) => ({
          name: `${city.city}, ${city.state}`,
          city: city.city,
          state: city.state,
          propertyCount: city.property_count,
          bookingCount: city.booking_count,
          averagePrice: Math.round(city.avg_price || 0),
        })),
        featuredProperties: processedFeatured,
        trendingSearches,
      },
    });
  })
);

/**
 * @route   POST /search/save
 * @desc    Save search query for user
 * @access  Protected
 */
/**
 * @swagger
 * /search/save:
 *   post:
 *     summary: Save search query for user
 *     description: Allows an authenticated user to save a search query with a custom name.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - query
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Apartment Search"
 *               query:
 *                 type: object
 *                 example: { "location": "Lagos", "priceRange": "50000-100000", "bedrooms": 2 }
 *     responses:
 *       201:
 *         description: Search saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Search saved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "search_12345"
 *                     userId:
 *                       type: string
 *                       example: "user_abc123"
 *                     name:
 *                       type: string
 *                       example: "My Apartment Search"
 *                     query:
 *                       type: object
 *                       example: { "location": "Lagos", "priceRange": "50000-100000", "bedrooms": 2 }
 *                     resultCount:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: Bad request - Invalid or missing parameters
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.post(
  "/save",
  // requireAuth(), // Uncomment if you want to require authentication
  [
    query("name").isString().withMessage("Search name required"),
    query("query").isObject().withMessage("Search query required"),
  ],
  validate,
  asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw new AppError("Authentication required to save searches", 401);
    }

    const { name, query: searchQuery } = req.body;

    // const savedSearch = await prisma.savedSearch.create({
    //   data: {
    //     userId: req.user.id,
    //     name,
    //     query: searchQuery,
    //     resultCount: 0, // Could be populated from the actual search
    //   },
    // })

    // res.status(201).json({
    //   success: true,
    //   message: 'Search saved successfully',
    //   data: savedSearch,
    // })
  })
);

/**
 * @route   GET /search/saved
 * @desc    Get user's saved searches
 * @access  Protected
 */
/**
 * @swagger
 * /search/saved:
 *   get:
 *     summary: Get user's saved searches
 *     description: Retrieve all saved search queries for the authenticated user.
 *     tags:
 *       - Search
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved searches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "search_12345"
 *                       userId:
 *                         type: string
 *                         example: "user_67890"
 *                       name:
 *                         type: string
 *                         example: "My Lagos Apartment Search"
 *                       query:
 *                         type: object
 *                         example: { "location": "Lagos", "priceRange": "500-1000" }
 *                       resultCount:
 *                         type: integer
 *                         example: 15
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-08-16T10:15:30.000Z"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get(
  "/saved",
  requireAuth(),
  asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw new AppError("Authentication required to view saved searches", 401);
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: savedSearches,
    });
  })
);

export default router;
