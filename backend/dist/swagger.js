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
const path_1 = __importDefault(require("path"));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "MAR ABU PROJECTS SERVICES LLC API",
            version: "1.0.0",
            description: "API documentation for MAR ABU booking platform",
        },
        servers: [
            {
                url: "https://booking-system-n26e.onrender.com/api/v1",
                description: "Development server",
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
        },
    },
    apis: [
        // Use absolute paths to avoid issues
        path_1.default.join(__dirname, process.env.NODE_ENV === "production"
            ? "../dist/routes/**/*.js"
            : "./routes/**/*.ts"),
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
