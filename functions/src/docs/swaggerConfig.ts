import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ASK Bot Admin API',
      version: '1.0.0',
      description: 'API documentation for the ASK WhatsApp Bot Admin Endpoints.',
    },
    servers: [
      {
        url: 'http://localhost:3000/admin',
        description: 'Local Admin Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {} // Will be injected dynamically below
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/admin/adminRouter.ts', './src/admin/routes/*.ts', './src/admin/adminApp.ts'], // Read JSDoc comments from these files
};

export const swaggerSpec = swaggerJsdoc(options);

// Dynamically inject generated TS JSON schemas into Swagger components
try {
  // Use require so it can be resolved at runtime relative to the output folder
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, 'generatedSchemas.json');
  if (fs.existsSync(schemaPath)) {
    let schemaRaw = fs.readFileSync(schemaPath, 'utf8');
    // Convert JSON schema definitions to OpenAPI component schemas
    schemaRaw = schemaRaw.replace(/#\/definitions\//g, '#/components/schemas/');
    const parsedSchemas = JSON.parse(schemaRaw);
    const spec = swaggerSpec as any;
    if (parsedSchemas.definitions && spec.components) {
      spec.components.schemas = {
        ...spec.components.schemas,
        ...parsedSchemas.definitions
      };
    }
  } else {
    console.warn('Swagger Warning: generatedSchemas.json not found. Run npm run prebuild.');
  }
} catch (error) {
  console.error('Error injecting dynamic Swagger schemas:', error);
}
