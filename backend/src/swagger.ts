// MAR ABU PROJECTS SERVICES LLC - Server Configuration
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";

const options: swaggerJsdoc.Options = {
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
    path.join(
      __dirname,
      process.env.NODE_ENV === "production"
        ? "../dist/routes/**/*.js"
        : "./routes/**/*.ts"
    ),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
