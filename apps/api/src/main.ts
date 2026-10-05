/**
 * Entry point. Importa el container, que se ocupa de leer el entorno,
 * instanciar los adaptadores y arrancar el servidor HTTP. Este archivo
 * solo existe como punto de entrada para `npm run dev` / `npm start`.
 */
import "./infrastructure/env.js";
import "./infrastructure/container.js";
