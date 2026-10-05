import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { openapiSpec } from "../openapi.js";

/**
 * Rutas de documentacion:
 *  - GET /api/openapi.json  contrato OpenAPI 3.0 en JSON.
 *  - GET /api/docs          UI navegable de Swagger.
 */
export function makeDocsRouter(): Router {
  const router = Router();
  router.get("/openapi.json", (_req, res) => {
    res.status(200).json(openapiSpec);
  });
  router.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  return router;
}
