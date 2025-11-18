export interface DeletionBlockingEntity {
  id: string;
  name: string;
  type: "CLIENT" | "BAIL" | "PROPERTY";
  link: string;
}

export interface DeletionError {
  message: string;
  blockingEntities: DeletionBlockingEntity[];
}

// Classe d'erreur personnalisée pour les erreurs de suppression
// Utilise une approche compatible avec la sérialisation Next.js
export class DeletionBlockedError extends Error {
  blockingEntities: DeletionBlockingEntity[];

  constructor(message: string, blockingEntities: DeletionBlockingEntity[] = []) {
    super(message);
    this.name = "DeletionBlockedError";
    this.blockingEntities = blockingEntities;
    
    // Assure que l'erreur est correctement sérialisée
    Object.setPrototypeOf(this, DeletionBlockedError.prototype);
    
    // Ajouter les propriétés directement sur l'objet pour la sérialisation
    (this as any).blockingEntities = blockingEntities;
  }

  // Méthode pour sérialiser l'erreur - utilisée par JSON.stringify
  toJSON() {
    return {
      message: this.message,
      blockingEntities: this.blockingEntities,
      name: this.name,
    };
  }
}

// Helper pour créer une erreur sérialisable pour Next.js
export function createDeletionError(message: string, blockingEntities: DeletionBlockingEntity[] = []): Error {
  const error = new Error(message) as any;
  error.name = "DeletionBlockedError";
  error.blockingEntities = blockingEntities;
  // S'assurer que la propriété est enumerable pour la sérialisation
  Object.defineProperty(error, 'blockingEntities', {
    value: blockingEntities,
    enumerable: true,
    writable: true,
    configurable: true,
  });
  return error;
}

