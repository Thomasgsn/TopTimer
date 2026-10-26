import { invoke, isTauri } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { onMounted, readonly, ref } from "vue";
import type { AppLocale } from "@/app/i18n";
import type { PersistedSettings, Persistence } from "@/app/persistence";

interface LocaleRef {
  value: string;
}

interface SettingsStoreOptions {
  initialSettings: PersistedSettings | null;
  locale: LocaleRef;
  persistence: Persistence;
}

export function useSettingsStore({ initialSettings, locale, persistence }: SettingsStoreOptions) {
  const settingsVisible = ref(false);
  const autostartEnabled = ref(false);
  const autostartBusy = ref(false);
  const alwaysOnTop = ref(initialSettings?.alwaysOnTop ?? true);
  const alwaysOnTopBusy = ref(false);
  const draggable = ref(initialSettings?.draggable ?? true);
  const nativeRuntime = isTauri();
  let autostartInitialized = initialSettings?.autostartInitialized ?? false;

  async function persistSettings(): Promise<void> {
    await persistence.saveSettings({
      locale: locale.value as AppLocale,
      alwaysOnTop: alwaysOnTop.value,
      autostartInitialized,
      draggable: draggable.value,
    });
  }

  async function toggleDraggable(): Promise<void> {
    draggable.value = !draggable.value;
    await persistSettings().catch((error: unknown) => {
      console.error("TopTimer could not save the position lock.", error);
    });
  }

  function openSettings(): void {
    settingsVisible.value = true;
  }

  function closeSettings(): void {
    settingsVisible.value = false;
  }

  async function setLocale(nextLocale: AppLocale): Promise<void> {
    locale.value = nextLocale;
    document.documentElement.lang = nextLocale;
    const writes: Promise<unknown>[] = [persistSettings()];
    if (nativeRuntime) writes.push(invoke("set_tray_locale", { locale: nextLocale }));
    await Promise.all(writes).catch((error: unknown) => {
      console.error("TopTimer could not save the selected language.", error);
    });
  }

  async function initializeAutostart(): Promise<void> {
    if (!nativeRuntime) return;
    try {
      if (!autostartInitialized) {
        await enable();
        autostartInitialized = true;
        await persistSettings();
      }
      autostartEnabled.value = await isEnabled();
    } catch {
      autostartEnabled.value = false;
    }
  }

  async function toggleAutostart(): Promise<void> {
    if (!nativeRuntime || autostartBusy.value) return;
    autostartBusy.value = true;
    try {
      if (autostartEnabled.value) await disable();
      else await enable();
      autostartEnabled.value = await isEnabled();
      autostartInitialized = true;
      await persistSettings();
    } catch (error) {
      console.error("TopTimer could not update the autostart preference.", error);
    } finally {
      autostartBusy.value = false;
    }
  }

  async function initializeAlwaysOnTop(): Promise<void> {
    const preferredState = initialSettings?.alwaysOnTop ?? true;

    if (!nativeRuntime) {
      alwaysOnTop.value = preferredState;
      return;
    }

    try {
      alwaysOnTop.value = await invoke<boolean>("set_always_on_top", { enabled: preferredState });
    } catch {
      alwaysOnTop.value = true;
    }
  }

  async function toggleAlwaysOnTop(): Promise<void> {
    if (alwaysOnTopBusy.value) return;
    alwaysOnTopBusy.value = true;
    const nextState = !alwaysOnTop.value;

    try {
      alwaysOnTop.value = nativeRuntime
        ? await invoke<boolean>("set_always_on_top", { enabled: nextState })
        : nextState;
      await persistSettings();
    } catch (error) {
      // Keep the last confirmed state if the native window rejects the change.
      console.error("TopTimer could not update the always-on-top preference.", error);
    } finally {
      alwaysOnTopBusy.value = false;
    }
  }

  async function initialize(): Promise<void> {
    if (initialSettings?.locale) locale.value = initialSettings.locale;
    document.documentElement.lang = locale.value;
    await initializeAlwaysOnTop();

    if (nativeRuntime) {
      await invoke("set_tray_locale", { locale: locale.value }).catch(() => undefined);
      await initializeAutostart();
    } else if (!initialSettings) {
      await persistSettings().catch((error: unknown) => {
        console.error("TopTimer could not initialize browser settings.", error);
      });
    }
  }

  onMounted(() => void initialize());

  return {
    alwaysOnTop: readonly(alwaysOnTop),
    alwaysOnTopBusy: readonly(alwaysOnTopBusy),
    autostartBusy: readonly(autostartBusy),
    autostartEnabled: readonly(autostartEnabled),
    closeSettings,
    draggable: readonly(draggable),
    nativeRuntime,
    openSettings,
    setLocale,
    settingsVisible: readonly(settingsVisible),
    toggleAlwaysOnTop,
    toggleAutostart,
    toggleDraggable,
  };
}
