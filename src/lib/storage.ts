import { persistedStateSchema, type PersistedState } from "@/lib/schemas";

export const STORAGE_KEY = "latencialab:v1";

/** Lee y valida el estado guardado. Devuelve null si no existe o es inválido. */
export function loadState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = persistedStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Cuota llena o almacenamiento bloqueado: la app sigue funcionando sin persistencia.
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorar.
  }
}
