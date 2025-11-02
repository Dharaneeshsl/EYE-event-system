import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import path from 'path';

const router = express.Router();

const specPath = path.resolve(process.cwd(), 'swagger.yaml');
let swaggerDocument = {};
try {
  swaggerDocument = yaml.load(specPath);
} catch (e) {
  swaggerDocument = { openapi: '3.0.0', info: { title: 'Event System API', version: '1.0.0' } };
}

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;




