import type { UserDirectory } from "../../../domain/ports.js";
import type { UserRepository } from "../../../application/ports/index.js";

/**
 * Adapta un `UserRepository` (que conoce `passwordHash`) a la interfaz
 * `UserDirectory` (que solo expone resumenes). Lo usa el composition
 * root para inyectar el adaptador en los casos de uso que no necesitan
 * credenciales.
 */
export function asUserDirectory(repo: UserRepository): UserDirectory {
  return {
    async findById(id) {
      const user = await repo.findById(id);
      return user === null
        ? null
        : { id: user.id, name: user.name, email: user.email };
    },
    async list() {
      return repo.list();
    },
  };
}
