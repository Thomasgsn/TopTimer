import { isTauri } from "@tauri-apps/api/core";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import type { PhysicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { readonly, ref } from "vue";

/** Window size while the settings are shown; the widget itself is 200 × 100. */
export const SETTINGS_WIDTH = 380;
export const SETTINGS_HEIGHT = 420;

interface WindowFrame {
  size: PhysicalSize;
  position: PhysicalPosition;
}

interface ScreenArea {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * Moves a window of the given size the least possible so it fits in the screen
 * area: the widget may sit in a corner where the settings would overflow.
 */
export function fitInArea(
  position: { x: number; y: number },
  size: { width: number; height: number },
  area: ScreenArea,
): { x: number; y: number } {
  const maxX = area.position.x + area.size.width - size.width;
  const maxY = area.position.y + area.size.height - size.height;
  return {
    x: Math.max(area.position.x, Math.min(position.x, maxX)),
    y: Math.max(area.position.y, Math.min(position.y, maxY)),
  };
}

export function useSettingsWindow() {
  const expanded = ref(false);
  const busy = ref(false);
  const nativeWindow = isTauri() ? getCurrentWindow() : null;
  let widgetFrame: WindowFrame | null = null;

  async function restoreFrame(): Promise<void> {
    if (!nativeWindow || !widgetFrame) return;
    await nativeWindow.setSize(widgetFrame.size);
    await nativeWindow.setPosition(widgetFrame.position);
  }

  async function expand(): Promise<void> {
    if (busy.value || expanded.value) return;
    busy.value = true;
    try {
      if (nativeWindow) {
        const [size, position, scaleFactor, monitor] = await Promise.all([
          nativeWindow.innerSize(),
          nativeWindow.outerPosition(),
          nativeWindow.scaleFactor(),
          currentMonitor(),
        ]);
        widgetFrame = { size, position };
        const settingsSize = new LogicalSize(SETTINGS_WIDTH, SETTINGS_HEIGHT);
        await nativeWindow.setSize(settingsSize);
        if (monitor) {
          const fitted = fitInArea(
            position,
            settingsSize.toPhysical(scaleFactor),
            monitor.workArea,
          );
          if (fitted.x !== position.x || fitted.y !== position.y) {
            await nativeWindow.setPosition(new PhysicalPosition(fitted.x, fitted.y));
          }
        }
      }
      expanded.value = true;
    } catch (error) {
      console.error("TopTimer could not open its settings.", error);
      try {
        await restoreFrame();
        widgetFrame = null;
      } catch (restoreError) {
        // Keep the settings reachable so they can be closed if a partial resize cannot be undone.
        expanded.value = true;
        console.error("TopTimer could not restore the widget.", restoreError);
      }
    } finally {
      busy.value = false;
    }
  }

  async function collapse(): Promise<void> {
    if (busy.value || !expanded.value) return;
    busy.value = true;
    try {
      await restoreFrame();
      expanded.value = false;
      widgetFrame = null;
    } catch (error) {
      console.error("TopTimer could not restore the widget.", error);
    } finally {
      busy.value = false;
    }
  }

  return { expanded: readonly(expanded), busy: readonly(busy), expand, collapse };
}
