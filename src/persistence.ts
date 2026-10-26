import { invoke, isTauri } from "@tauri-apps/api/core";
import type { AppLocale } from "./i18n";

const SCHEMA_VERSION = 1;
const DATA_STORAGE_KEY = "toptimer.data.v1";

const validLocales = new Set<AppLocale>(["fr", "en", "it", "es", "de"]);

export interface PersistedTimer {
  elapsedMs: number;
}

export interface PersistedSettings {
  locale: AppLocale;
  alwaysOnTop: boolean;
  autostartInitialized: boolean;
  // Optional in stored data: the widget can be moved unless the user locked it.
  draggable: boolean;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface PersistedAppData {
  schemaVersion: number;
  timer: PersistedTimer | null;
  settings: PersistedSettings | null;
  windowPosition: WindowPosition | null;
}

export interface Persistence {
  load(): Promise<PersistedAppData>;
  saveTimer(timer: PersistedTimer): Promise<void>;
  saveSettings(settings: PersistedSettings): Promise<void>;
  saveWindowPosition(position: WindowPosition): Promise<void>;
}

function emptyAppData(): PersistedAppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    timer: null,
    settings: null,
    windowPosition: null,
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function normalizeTimer(value: unknown): PersistedTimer | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedTimer>;
  return isNonNegativeInteger(candidate.elapsedMs) ? { elapsedMs: candidate.elapsedMs } : null;
}

function normalizeSettings(value: unknown): PersistedSettings | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedSettings>;
  if (
    !validLocales.has(candidate.locale as AppLocale) ||
    typeof candidate.alwaysOnTop !== "boolean" ||
    typeof candidate.autostartInitialized !== "boolean"
  ) {
    return null;
  }

  return {
    locale: candidate.locale as AppLocale,
    alwaysOnTop: candidate.alwaysOnTop,
    autostartInitialized: candidate.autostartInitialized,
    draggable: typeof candidate.draggable === "boolean" ? candidate.draggable : true,
  };
}

function normalizeWindowPosition(value: unknown): WindowPosition | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WindowPosition>;
  return Number.isSafeInteger(candidate.x) && Number.isSafeInteger(candidate.y)
    ? { x: candidate.x as number, y: candidate.y as number }
    : null;
}

export function normalizeAppData(value: unknown): PersistedAppData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedAppData>;
  if (candidate.schemaVersion !== SCHEMA_VERSION) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    timer: normalizeTimer(candidate.timer),
    settings: normalizeSettings(candidate.settings),
    windowPosition: normalizeWindowPosition(candidate.windowPosition),
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

abstract class SerializedPersistence implements Persistence {
  protected data = emptyAppData();
  private writeQueue: Promise<void> = Promise.resolve();

  abstract load(): Promise<PersistedAppData>;

  saveTimer(timer: PersistedTimer): Promise<void> {
    const snapshot = { ...timer };
    return this.enqueue(async () => {
      await this.writeTimer(snapshot);
      this.data = { ...this.data, timer: snapshot };
    });
  }

  saveSettings(settings: PersistedSettings): Promise<void> {
    const snapshot = { ...settings };
    return this.enqueue(async () => {
      await this.writeSettings(snapshot);
      this.data = { ...this.data, settings: snapshot };
    });
  }

  saveWindowPosition(position: WindowPosition): Promise<void> {
    const snapshot = { ...position };
    return this.enqueue(async () => {
      await this.writeWindowPosition(snapshot);
      this.data = { ...this.data, windowPosition: snapshot };
    });
  }

  protected abstract writeTimer(timer: PersistedTimer): Promise<void>;
  protected abstract writeSettings(settings: PersistedSettings): Promise<void>;
  protected abstract writeWindowPosition(position: WindowPosition): Promise<void>;

  private enqueue(write: () => Promise<void>): Promise<void> {
    const operation = this.writeQueue.then(write);
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }
}

class NativePersistence extends SerializedPersistence {
  async load(): Promise<PersistedAppData> {
    const loaded = normalizeAppData(await invoke<unknown>("load_app_data"));
    if (!loaded) throw new Error("The native persistence layer returned invalid app data.");
    this.data = loaded;
    return this.data;
  }

  protected writeTimer(timer: PersistedTimer): Promise<void> {
    return invoke("save_timer", { timer });
  }

  protected writeSettings(settings: PersistedSettings): Promise<void> {
    return invoke("save_settings", { settings });
  }

  protected writeWindowPosition(position: WindowPosition): Promise<void> {
    return invoke("save_window_position", { position });
  }
}

export class BrowserPersistence extends SerializedPersistence {
  async load(): Promise<PersistedAppData> {
    const storedValue = localStorage.getItem(DATA_STORAGE_KEY);
    if (storedValue === null) return this.data;

    const parsed = parseJson(storedValue);
    const schemaVersion = (parsed as { schemaVersion?: unknown } | null)?.schemaVersion;
    if (typeof schemaVersion === "number" && schemaVersion !== SCHEMA_VERSION) {
      // Never replace data written by another version of TopTimer.
      throw new Error(
        `unsupported TopTimer data schema ${schemaVersion}; expected ${SCHEMA_VERSION}`,
      );
    }
    const stored = normalizeAppData(parsed);
    if (stored) {
      this.data = stored;
    } else {
      // Keep the unreadable value aside and start from empty data.
      localStorage.setItem(`${DATA_STORAGE_KEY}.corrupt-${Date.now()}`, storedValue);
      localStorage.removeItem(DATA_STORAGE_KEY);
    }
    return this.data;
  }

  protected writeTimer(timer: PersistedTimer): Promise<void> {
    this.write({ ...this.data, timer });
    return Promise.resolve();
  }

  protected writeSettings(settings: PersistedSettings): Promise<void> {
    this.write({ ...this.data, settings });
    return Promise.resolve();
  }

  protected writeWindowPosition(position: WindowPosition): Promise<void> {
    this.write({ ...this.data, windowPosition: position });
    return Promise.resolve();
  }

  private write(data: PersistedAppData): void {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  }
}

export const appPersistence: Persistence = isTauri()
  ? new NativePersistence()
  : new BrowserPersistence();
