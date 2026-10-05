/**
 * Puerto para el reloj de pared. La implementacion de infraestructura
 * devuelve la hora actual real; los tests y el script de seed pueden
 * inyectar una hora fija.
 */
export interface Clock {
  now(): string;
}
