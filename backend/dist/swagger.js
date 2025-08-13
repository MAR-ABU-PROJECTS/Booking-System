"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.swaggerSpec = void 0;
// MAR ABU PROJECTS SERVICES LLC - Server Configuration
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Booking System API",
            version: "1.0.0",
            description: "MAR ABU PROJECTS SERVICES LLC - Booking System API",
        },
        servers: [
            {
                url: "http://localhost:5050/api/v1",
                description: "Development server (Local)",
            },
            {
                url: "https://booking-system-n26e.onrender.com/api/v1",
                description: "Production server (Render)",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Booking: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "Unique booking identifier",
                        },
                        propertyId: {
                            type: "string",
                            description: "Property ID",
                        },
                        userId: {
                            type: "string",
                            description: "User ID",
                        },
                        checkIn: {
                            type: "string",
                            format: "date",
                            description: "Check-in date",
                        },
                        checkOut: {
                            type: "string",
                            format: "date",
                            description: "Check-out date",
                        },
                        guests: {
                            type: "integer",
                            description: "Number of guests",
                        },
                        totalAmount: {
                            type: "number",
                            description: "Total booking amount",
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
                            description: "Booking status",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp",
                        },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        role: {
                            type: "string",
                            enum: ["CUSTOMER", "ADMIN"],
                        },
                    },
                },
                Property: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        pricePerNight: { type: "number" },
                        location: { type: "string" },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts"], // Path to API docs
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
