"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.swaggerSpec = void 0;
// MAR ABU PROJECTS SERVICES LLC - Server Configuration
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = __importStar(require("swagger-ui-express"));
exports.swaggerUi = swaggerUi;
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
                Payment: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "Unique payment identifier",
                        },
                        bookingId: {
                            type: "string",
                            description: "Associated booking ID",
                        },
                        amount: {
                            type: "number",
                            description: "Payment amount",
                        },
                        currency: {
                            type: "string",
                            default: "NGN",
                            description: "Payment currency",
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"],
                            description: "Payment status",
                        },
                        method: {
                            type: "string",
                            enum: ["CARD", "BANK_TRANSFER", "CASH"],
                            description: "Payment method",
                        },
                        receiptUrl: {
                            type: "string",
                            nullable: true,
                            description: "Receipt filename for manual payments",
                        },
                        verifiedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                            description: "When payment was verified by admin",
                        },
                        adminNotes: {
                            type: "string",
                            nullable: true,
                            description: "Admin notes about payment verification",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Payment creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Payment last update timestamp",
                        },
                    },
                },
                ManualPaymentVerificationRequest: {
                    type: "object",
                    required: ["approved"],
                    properties: {
                        approved: {
                            type: "boolean",
                            description: "Whether to approve (true) or reject (false) the payment",
                        },
                        adminNotes: {
                            type: "string",
                            maxLength: 500,
                            description: "Optional admin notes about the verification decision",
                        },
                    },
                },
                PaymentWithBookingDetails: {
                    allOf: [
                        { $ref: "#/components/schemas/Payment" },
                        {
                            type: "object",
                            properties: {
                                booking: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        bookingCode: { type: "string" },
                                        checkInDate: { type: "string", format: "date" },
                                        checkOutDate: { type: "string", format: "date" },
                                        nights: { type: "integer" },
                                        total: { type: "number" },
                                        property: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                address: { type: "string" },
                                            },
                                        },
                                        customer: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string" },
                                                phone: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
                ApiResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            description: "Indicates if the request was successful",
                        },
                        message: {
                            type: "string",
                            description: "Response message",
                        },
                    },
                },
                ApiErrorResponse: {
                    allOf: [
                        { $ref: "#/components/schemas/ApiResponse" },
                        {
                            type: "object",
                            properties: {
                                error: {
                                    type: "string",
                                    description: "Error details",
                                },
                            },
                        },
                    ],
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/routes/**/*.ts"], // Path to API docs
};
exports.swaggerSpec = swaggerJsdoc(options);
