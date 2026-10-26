import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Ref } from "vue";
import type { PersistedTimer, Persistence } from "@/app/persistence";
import {
  elapsedAt,
  isRunning,
  pause,
  pausedStopwatch,
  splitDuration,
  start,
  type Stopwatch,
} from "../stopwatch.ts";

// Refresh often enough for the display to flip close to each full second.
const DISPLAY_INTERVAL = 200;
// While running, the elapsed time is saved regularly so a crash or a forced
// shutdown loses at most this much.
const SAVE_INTERVAL = 15_000;

interface TimerStoreOptions {
  initialTimer: PersistedTimer | null;
  persistence: Persistence;
  // Keyboard shortcuts are ignored while a dialog is open.
  shortcutsEnabled?: Readonly<Ref<boolean>>;
  quitApp?: () => Promise<void>;
}

export function useTimerStore({
  initialTimer,
  persistence,
  shortcutsEnabled = ref(true),
  quitApp = () => invoke("quit_app"),
}: TimerStoreOptions) {
  const stopwatch = ref<Stopwatch>(pausedStopwatch(initialTimer?.elapsedMs ?? 0));
  const now = ref(Date.now());
  const nativeRuntime = isTauri();

  let displayTimer: ReturnType<typeof setInterval> | undefined;
  let saveTimer: ReturnType<typeof setInterval> | undefined;
  let quitting = false;
  let removeListeners: Array<() => void> = [];

  const running = computed(() => isRunning(stopwatch.value));
  const elapsedMs = computed(() => elapsedAt(stopwatch.value, now.value));
  const parts = computed(() => splitDuration(elapsedMs.value));
  const canReset = computed(() => running.value || elapsedMs.value > 0);

  async function persistTimer(): Promise<void> {
    await persistence.saveTimer({ elapsedMs: Math.round(elapsedAt(stopwatch.value, Date.now())) });
  }

  function saveInBackground(): void {
    void persistTimer().catch((error: unknown) => {
      console.error("TopTimer could not save the elapsed time.", error);
    });
  }

  function syncTicking(): void {
    if (displayTimer) clearInterval(displayTimer);
    if (saveTimer) clearInterval(saveTimer);
    displayTimer = undefined;
    saveTimer = undefined;
    now.value = Date.now();
    if (!running.value) return;
    displayTimer = setInterval(() => {
      now.value = Date.now();
    }, DISPLAY_INTERVAL);
    saveTimer = setInterval(saveInBackground, SAVE_INTERVAL);
  }

  function changed(): void {
    syncTicking();
    saveInBackground();
    if (nativeRuntime) {
      void invoke("set_tray_running", { running: running.value }).catch(() => undefined);
    }
  }

  function toggle(): void {
    const timestamp = Date.now();
    stopwatch.value = running.value
      ? pause(stopwatch.value, timestamp)
      : start(stopwatch.value, timestamp);
    changed();
  }

  function reset(): void {
    stopwatch.value = pausedStopwatch();
    changed();
  }

  async function requestQuit(): Promise<void> {
    if (quitting) return;
    quitting = true;
    try {
      await persistTimer();
    } catch (error) {
      // Only the elapsed time would be lost: never keep the user from quitting.
      console.error("TopTimer could not save the elapsed time before quitting.", error);
    }
    await quitApp();
  }

  function isInteractive(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement && target.closest("button, input, select, textarea") !== null
    );
  }

  function handleKeyboardShortcut(event: KeyboardEvent): void {
    if (!shortcutsEnabled.value || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.repeat || isInteractive(event.target)) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggle();
    } else if (event.code === "KeyR") {
      event.preventDefault();
      reset();
    }
  }

  async function initialize(): Promise<void> {
    window.addEventListener("keydown", handleKeyboardShortcut);
    if (!nativeRuntime) return;
    const listeners = await Promise.all([
      listen("toptimer://toggle-timer", toggle).catch(() => undefined),
      listen("toptimer://reset-timer", reset).catch(() => undefined),
      listen("toptimer://quit-requested", () => void requestQuit().catch(() => undefined)).catch(
        () => undefined,
      ),
    ]);
    removeListeners = listeners.filter((remove) => remove !== undefined);
  }

  function dispose(): void {
    if (displayTimer) clearInterval(displayTimer);
    if (saveTimer) clearInterval(saveTimer);
    window.removeEventListener("keydown", handleKeyboardShortcut);
    for (const remove of removeListeners) remove();
  }

  onMounted(() => void initialize());
  onBeforeUnmount(dispose);

  return {
    canReset,
    elapsedMs,
    hours: computed(() => parts.value.hours),
    minutes: computed(() => parts.value.minutes),
    seconds: computed(() => parts.value.seconds),
    requestQuit,
    reset,
    running,
    toggle,
  };
}
