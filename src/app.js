import express from 'express';
import cors from 'cors';
import router from './routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/Swagger.js';
import cookieParser from 'cookie-parser';

import './database/index.js';

class App {
  constructor() {
    this.server = express();

    this.middlewares();
    this.router();
  }

  middlewares() {
    this.server.use(
      cors({
        origin: 'http://localhost:5173/',
        credentials: true,
      })
    );

    this.server.use(express.json());
    this.server.use(cookieParser());
  }

  router() {
    this.server.use(router);
    this.server.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }
}

export default new App().server;
``;
