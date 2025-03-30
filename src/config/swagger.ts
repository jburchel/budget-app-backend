import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0', // Specify the OpenAPI version
    info: {
      title: 'Envelope Budget App API',
      version: '1.0.0',
      description: 'API documentation for the Envelope Budgeting Application backend.',
      contact: {
        name: 'API Support', // Optional
        // url: 'http://www.example.com/support', // Optional
        // email: 'support@example.com', // Optional
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`, // Adjust if your base URL is different
        description: 'Development server',
      },
      // Add other servers like staging or production here if needed
    ],
    // Define components like security schemes (e.g., for JWT)
    components: {
        securitySchemes: {
            bearerAuth: { // Arbitrary name for the scheme
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT', // Optional, for documentation purposes
            }
        }
    },
  },
  // Path to the API docs (routes files + controller files if needed)
  apis: [
    './src/auth/routes/*.ts',
    './src/user/routes/*.ts',
    './src/budget/routes/*.ts',
    './src/account/routes/*.ts',
    './src/transaction/routes/*.ts',
    './src/plaid/routes/*.ts',
    './src/reporting/routes/*.ts',
    './src/goal/routes/*.ts'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec; 