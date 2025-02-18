const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CTF Events API',
      version: '1.0.0',
      description: 'API documentation for CTF Events application',
    },
    servers: [
      {
        url: 'https://event.ctf.rohidevs.engineer',
        description: 'Development server',
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
    },
    tags: [
      {
        name: 'Admin',
        description: 'Admin authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User authentication endpoints',
      },
      {
        name: 'Events',
        description: 'Event management endpoints',
      },
      {
        name: 'Announcements',
        description: 'Announcement management endpoints',
      },
    ],
  },
  apis: ['./final.js'], // Path to the API docs
};

module.exports = swaggerJsdoc(options);