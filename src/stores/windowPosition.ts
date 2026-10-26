import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Ref } from "vue";
import type { Persistence } from "@/app/persistence";

// macOS reports every step of a drag: only the place where the widget is left is saved.
const SAVE_DELAY = 400;

interface WindowPositionOptions {
  persistence: Persistence;
  // While true (settings open), moves are temporary and not remembered.
  paused?: Readonly<Ref<boolean>>;
}

/** Remembers where the widget is left; the native side restores it at launch. */
export function useWindowPosition({ persistence, paused = ref(false) }: WindowPositionOptions) {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let removeListener: (() => void) | undefined;
  let disposed = false;

  async function initialize(): Promise<void> {
    if (!isTauri()) return;
    const unlisten = await getCurrentWindow()
      .onMoved(({ payload: position }) => {
        if (paused.value) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          void persistence
            .saveWindowPosition({ x: position.x, y: position.y })
            .catch((error: unknown) => {
              console.error("TopTimer could not save its position.", error);
            });
        }, SAVE_DELAY);
      })
      .catch(() => undefined);
    if (disposed) unlisten?.();
    else removeListener = unlisten;
  }

  onMounted(() => void initialize());
  onBeforeUnmount(() => {
    disposed = true;
    clearTimeout(saveTimer);
    removeListener?.();
  });
}
