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
Object.defineProperty(exports, "__esModule", { value: true });
// MAR ABU PROJECTS SERVICES LLC - Search and Filter Routes
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const authservice_1 = require("../services/authservice");
const error_middleware_1 = require("../middlewares/error.middleware");
const error_middleware_2 = require("../middlewares/error.middleware");
const server_1 = require("../server");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
};
// ===============================
// PROPERTY SEARCH ROUTES
// ===============================
/**
 * @route   GET /api/v1/search/properties
 * @desc    Advanced property search with filters
 * @access  Public
 */
router.get('/properties', (0, authservice_1.optionalAuth)(), [
    (0, express_validator_1.query)('q').optional().isString().withMessage('Search query must be a string'),
    (0, express_validator_1.query)('city').optional().isString(),
    (0, express_validator_1.query)('state').optional().isString(),
    (0, express_validator_1.query)('country').optional().isString(),
    (0, express_validator_1.query)('type').optional().isIn(Object.values(client_1.PropertyType)),
    (0, express_validator_1.query)('minPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.query)('maxPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.query)('bedrooms').optional().isInt({ min: 0 }),
    (0, express_validator_1.query)('bathrooms').optional().isInt({ min: 0 }),
    (0, express_validator_1.query)('maxGuests').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('amenities').optional().isString(),
    (0, express_validator_1.query)('checkIn').optional().isISO8601(),
    (0, express_validator_1.query)('checkOut').optional().isISO8601(),
    (0, express_validator_1.query)('sortBy').optional().isIn(['price', 'rating', 'distance', 'popularity', 'newest']),
    (0, express_validator_1.query)('order').optional().isIn(['asc', 'desc']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }),
    (0, express_validator_1.query)('latitude').optional().isFloat(),
    (0, express_validator_1.query)('longitude').optional().isFloat(),
    (0, express_validator_1.query)('radius').optional().isFloat({ min: 0 }),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q, city, state, country, type, minPrice, maxPrice, bedrooms, bathrooms, maxGuests, amenities, checkIn, checkOut, sortBy = 'popularity', order = 'desc', page = 1, limit = 20, latitude, longitude, radius = 50, // km
     } = req.query;
    const { page: validPage, limit: validLimit } = (0, helpers_1.validatePagination)(page, limit);
    // Build where clause
    const where = {
        status: client_1.PropertyStatus.ACTIVE,
    };
    // Text search
    if (q) {
        where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
        ];
    }
    // Location filters
    if (city)
        where.city = { contains: city, mode: 'insensitive' };
    if (state)
        where.state = { contains: state, mode: 'insensitive' };
    if (country)
        where.country = { contains: country, mode: 'insensitive' };
    // Property filters
    if (type)
        where.type = type;
    if (bedrooms)
        where.bedrooms = { gte: parseInt(bedrooms) };
    if (bathrooms)
        where.bathrooms = { gte: parseInt(bathrooms) };
    if (maxGuests)
        where.maxGuests = { gte: parseInt(maxGuests) };
    // Price range
    if (minPrice || maxPrice) {
        where.baseRate = {};
        if (minPrice)
            where.baseRate.gte = parseFloat(minPrice);
        if (maxPrice)
            where.baseRate.lte = parseFloat(maxPrice);
    }
    // Amenities filter
    if (amenities) {
        const amenityList = amenities.split(',').map((a) => a.trim());
        where.amenities = {
            hasEvery: amenityList,
        };
    }
    // Availability filter
    if (checkIn && checkOut) {
        where.NOT = {
            bookings: {
                some: {
                    status: { in: ['PENDING', 'APPROVED'] },
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
    let orderBy = {};
    switch (sortBy) {
        case 'price':
            orderBy = { baseRate: order };
            break;
        case 'rating':
            // Will be handled in post-processing
            orderBy = { createdAt: 'desc' };
            break;
        case 'distance':
            // Will be handled in post-processing if lat/lng provided
            orderBy = { createdAt: 'desc' };
            break;
        case 'newest':
            orderBy = { createdAt: 'desc' };
            break;
        case 'popularity':
        default:
            // Sort by booking count
            orderBy = { createdAt: 'desc' };
            break;
    }
    // Execute search
    const [properties, total, facets] = yield Promise.all([
        server_1.prisma.property.findMany({
            where,
            orderBy,
            skip: (validPage - 1) * validLimit,
            take: validLimit,
            include: {
                host: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
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
                        status: { in: ['APPROVED', 'COMPLETED'] },
                        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, // Last year
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
        server_1.prisma.property.count({ where }),
        // Get facets for filtering
        Promise.all([
            server_1.prisma.property.groupBy({
                by: ['city'],
                where: { status: client_1.PropertyStatus.ACTIVE },
                _count: { city: true },
                orderBy: { _count: { city: 'desc' } },
                take: 20,
            }),
            server_1.prisma.property.groupBy({
                by: ['type'],
                where: { status: client_1.PropertyStatus.ACTIVE },
                _count: { type: true },
            }),
            server_1.prisma.property.aggregate({
                where: { status: client_1.PropertyStatus.ACTIVE },
                _min: { baseRate: true },
                _max: { baseRate: true },
            }),
        ]),
    ]);
    // Process properties with calculated fields
    const processedProperties = properties.map(property => {
        const ratings = property.reviews.map(r => r.rating);
        const averageRating = ratings.length > 0
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
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distance = R * c;
            }
        }
        return Object.assign(Object.assign({}, property), { averageRating: Math.round(averageRating * 10) / 10, reviewCount: property._count.reviews, bookingCount: property.bookings.length, popularityScore: property.bookings.length * 0.7 + (averageRating * property._count.reviews) * 0.3, distance: distance ? Math.round(distance * 10) / 10 : null, reviews: undefined, bookings: undefined, _count: undefined });
    });
    // Apply sorting that requires calculated fields
    if (sortBy === 'rating') {
        processedProperties.sort((a, b) => {
            return order === 'desc'
                ? b.averageRating - a.averageRating
                : a.averageRating - b.averageRating;
        });
    }
    else if (sortBy === 'distance' && latitude && longitude) {
        processedProperties.sort((a, b) => {
            if (a.distance === null && b.distance === null)
                return 0;
            if (a.distance === null)
                return 1;
            if (b.distance === null)
                return -1;
            return order === 'desc' ? b.distance - a.distance : a.distance - b.distance;
        });
    }
    else if (sortBy === 'popularity') {
        processedProperties.sort((a, b) => {
            return order === 'desc'
                ? b.popularityScore - a.popularityScore
                : a.popularityScore - b.popularityScore;
        });
    }
    const [cities, types, priceRange] = facets;
    const pagination = (0, helpers_1.calculatePagination)(validPage, validLimit, total);
    res.json({
        success: true,
        data: {
            properties: processedProperties,
            pagination,
            facets: {
                cities: cities.map(c => ({ name: c.city, count: c._count.city })),
                types: types.map(t => ({ name: t.type, count: t._count.type })),
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
})));
/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get search suggestions for autocomplete
 * @access  Public
 */
router.get('/suggestions', [
    (0, express_validator_1.query)('q').isString().isLength({ min: 2 }).withMessage('Query must be at least 2 characters'),
    (0, express_validator_1.query)('type').optional().isIn(['cities', 'properties', 'all']),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q, type = 'all' } = req.query;
    const suggestions = {
        cities: [],
        properties: [],
    };
    if (type === 'cities' || type === 'all') {
        // City suggestions
        const cities = yield server_1.prisma.property.groupBy({
            by: ['city', 'state', 'country'],
            where: {
                status: client_1.PropertyStatus.ACTIVE,
                OR: [
                    { city: { contains: q, mode: 'insensitive' } },
                    { state: { contains: q, mode: 'insensitive' } },
                    { country: { contains: q, mode: 'insensitive' } },
                ],
            },
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 5,
        });
        suggestions.cities = cities.map(city => ({
            text: `${city.city}, ${city.state}, ${city.country}`,
            type: 'city',
            count: city._count.city,
        }));
    }
    if (type === 'properties' || type === 'all') {
        // Property suggestions
        const properties = yield server_1.prisma.property.findMany({
            where: {
                status: client_1.PropertyStatus.ACTIVE,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
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
        suggestions.properties = properties.map(property => {
            var _a;
            return ({
                id: property.id,
                text: property.name,
                subtitle: `${property.city}, ${property.state}`,
                type: 'property',
                propertyType: property.type,
                price: property.baseRate,
                image: ((_a = property.images) === null || _a === void 0 ? void 0 : _a[0]) || null,
            });
        });
    }
    res.json({
        success: true,
        data: suggestions,
    });
})));
/**
 * @route   GET /api/v1/search/filters
 * @desc    Get available filters for search
 * @access  Public
 */
router.get('/filters', (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [cities, types, priceRange, amenities, bedrooms, bathrooms,] = yield Promise.all([
        // Available cities
        server_1.prisma.property.groupBy({
            by: ['city', 'state'],
            where: { status: client_1.PropertyStatus.ACTIVE },
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 50,
        }),
        // Property types
        server_1.prisma.property.groupBy({
            by: ['type'],
            where: { status: client_1.PropertyStatus.ACTIVE },
            _count: { type: true },
            orderBy: { _count: { type: 'desc' } },
        }),
        // Price range
        server_1.prisma.property.aggregate({
            where: { status: client_1.PropertyStatus.ACTIVE },
            _min: { baseRate: true },
            _max: { baseRate: true },
            _avg: { baseRate: true },
        }),
        // Common amenities
        server_1.prisma.$queryRaw `
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
        server_1.prisma.property.groupBy({
            by: ['bedrooms'],
            where: { status: client_1.PropertyStatus.ACTIVE },
            _count: { bedrooms: true },
            orderBy: { bedrooms: 'asc' },
        }),
        // Bathroom options
        server_1.prisma.property.groupBy({
            by: ['bathrooms'],
            where: { status: client_1.PropertyStatus.ACTIVE },
            _count: { bathrooms: true },
            orderBy: { bathrooms: 'asc' },
        }),
    ]);
    res.json({
        success: true,
        data: {
            locations: cities.map(city => ({
                label: `${city.city}, ${city.state}`,
                value: city.city,
                count: city._count.city,
            })),
            propertyTypes: types.map(type => ({
                label: type.type,
                value: type.type,
                count: type._count.type,
            })),
            priceRange: {
                min: priceRange._min.baseRate || 0,
                max: priceRange._max.baseRate || 1000000,
                average: priceRange._avg.baseRate || 50000,
                suggestions: [
                    { label: 'Budget (Under ₦25,000)', min: 0, max: 25000 },
                    { label: 'Mid-range (₦25,000 - ₦75,000)', min: 25000, max: 75000 },
                    { label: 'Luxury (₦75,000 - ₦150,000)', min: 75000, max: 150000 },
                    { label: 'Premium (Above ₦150,000)', min: 150000, max: 1000000 },
                ],
            },
            amenities: amenities.map((amenity) => ({
                label: amenity.amenity,
                value: amenity.amenity,
                count: amenity.count,
            })),
            bedrooms: bedrooms.map(bedroom => ({
                label: bedroom.bedrooms === 0 ? 'Studio' : `${bedroom.bedrooms} bedroom${bedroom.bedrooms > 1 ? 's' : ''}`,
                value: bedroom.bedrooms,
                count: bedroom._count.bedrooms,
            })),
            bathrooms: bathrooms.map(bathroom => ({
                label: `${bathroom.bathrooms} bathroom${bathroom.bathrooms > 1 ? 's' : ''}`,
                value: bathroom.bathrooms,
                count: bathroom._count.bathrooms,
            })),
            sortOptions: [
                { label: 'Most Popular', value: 'popularity' },
                { label: 'Price: Low to High', value: 'price', order: 'asc' },
                { label: 'Price: High to Low', value: 'price', order: 'desc' },
                { label: 'Highest Rated', value: 'rating', order: 'desc' },
                { label: 'Newest', value: 'newest', order: 'desc' },
            ],
        },
    });
})));
/**
 * @route   GET /api/v1/search/popular
 * @desc    Get popular destinations and properties
 * @access  Public
 */
router.get('/popular', (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [popularCities, featuredProperties, trendingSearches,] = yield Promise.all([
        // Popular cities based on booking count
        server_1.prisma.$queryRaw `
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
        server_1.prisma.property.findMany({
            where: {
                status: client_1.PropertyStatus.ACTIVE,
                reviews: {
                    some: {
                        approved: true,
                        rating: { gte: 4 },
                    },
                },
                bookings: {
                    some: {
                        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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
                createdAt: 'desc',
            },
        }),
        // Trending searches (mock data - would be based on search analytics)
        Promise.resolve([
            { query: 'Lagos Apartments', count: 1250 },
            { query: 'Abuja Hotels', count: 980 },
            { query: 'Port Harcourt Guesthouses', count: 750 },
            { query: 'Kano Lodges', count: 680 },
            { query: 'Ibadan Villas', count: 420 },
        ]),
    ]);
    // Process featured properties
    const processedFeatured = featuredProperties.map(property => {
        const ratings = property.reviews.map(r => r.rating);
        const averageRating = ratings.length > 0
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
            popularDestinations: popularCities.map((city) => ({
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
})));
/**
 * @route   POST /api/v1/search/save
 * @desc    Save search query for user
 * @access  Protected
 */
router.post('/save', 
// requireAuth(), // Uncomment if you want to require authentication
[
    (0, express_validator_1.query)('name').isString().withMessage('Search name required'),
    (0, express_validator_1.query)('query').isObject().withMessage('Search query required'),
], validate, (0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new error_middleware_2.AppError('Authentication required to save searches', 401);
    }
    const { name, query: searchQuery } = req.body;
    const savedSearch = yield server_1.prisma.savedSearch.create({
        data: {
            userId: req.user.id,
            name,
            query: searchQuery,
            resultCount: 0, // Could be populated from the actual search
        },
    });
    res.status(201).json({
        success: true,
        message: 'Search saved successfully',
        data: savedSearch,
    });
})));
/**
 * @route   GET /api/v1/search/saved
 * @desc    Get user's saved searches
 * @access  Protected
 */
router.get('/saved', 
// requireAuth(), // Uncomment if you want to require authentication
(0, error_middleware_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        throw new error_middleware_2.AppError('Authentication required to view saved searches', 401);
    }
    const savedSearches = yield server_1.prisma.savedSearch.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
    });
    res.json({
        success: true,
        data: savedSearches,
    });
})));
exports.default = router;
