<script setup lang="ts">
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import SettingsDialog from "./components/dialogs/SettingsDialog.vue";
  import TimerPanel from "./components/panels/TimerPanel.vue";
  import { appPersistence } from "./persistence";
  import type { PersistedAppData } from "./persistence";
  import { useSettingsStore } from "./stores/settings";
  import { useSettingsWindow } from "./stores/settingsWindow";
  import { useTimerStore } from "./stores/timer";
  import { useWindowPosition } from "./stores/windowPosition";

  const props = defineProps<{ initialData: PersistedAppData }>();
  const { t, locale } = useI18n();
  const { expanded, busy: settingsWindowBusy, expand, collapse } = useSettingsWindow();

  const settingsStore = useSettingsStore({
    initialSettings: props.initialData.settings,
    locale,
    persistence: appPersistence,
  });

  const {
    alwaysOnTop,
    alwaysOnTopBusy,
    autostartBusy,
    autostartEnabled,
    closeSettings,
    draggable,
    nativeRuntime,
    openSettings,
    setLocale,
    settingsVisible,
    toggleAlwaysOnTop,
    toggleAutostart,
    toggleDraggable,
  } = settingsStore;

  const { canReset, hours, minutes, seconds, reset, running, toggle } = useTimerStore({
    initialTimer: props.initialData.timer,
    persistence: appPersistence,
    shortcutsEnabled: computed(() => !settingsVisible.value),
  });

  useWindowPosition({
    persistence: appPersistence,
    paused: computed(() => expanded.value || settingsWindowBusy.value),
  });

  // The widget is too small for the settings: the window grows while they are open.
  // Resizes are serialized so a quick open/close always ends in the requested state.
  let syncingWindow = false;
  async function syncSettingsWindow(): Promise<void> {
    if (syncingWindow) return;
    syncingWindow = true;
    try {
      while (settingsVisible.value !== expanded.value) {
        if (settingsVisible.value) {
          await expand();
          if (!expanded.value) closeSettings();
        } else {
          await collapse();
          if (expanded.value) break;
        }
      }
    } finally {
      syncingWindow = false;
    }
  }

  watch(settingsVisible, () => void syncSettingsWindow());

  function onCloseSettings(): void {
    closeSettings();
    // Also retries a collapse that failed while the settings were already closed.
    void syncSettingsWindow();
  }
</script>

<template>
  <main class="app" :aria-label="t('app.name')">
    <SettingsDialog
      v-if="expanded"
      :locale="locale"
      :native-runtime="nativeRuntime"
      :autostart-enabled="autostartEnabled"
      :autostart-busy="autostartBusy"
      @close="onCloseSettings"
      @set-locale="setLocale"
      @toggle-autostart="toggleAutostart"
    />
    <TimerPanel
      v-else
      :hours="hours"
      :minutes="minutes"
      :seconds="seconds"
      :running="running"
      :can-reset="canReset"
      :draggable="draggable"
      :always-on-top="alwaysOnTop"
      :always-on-top-busy="alwaysOnTopBusy"
      @toggle="toggle"
      @reset="reset"
      @toggle-draggable="toggleDraggable"
      @toggle-always-on-top="toggleAlwaysOnTop"
      @open-settings="openSettings"
    />
  </main>
</template>

<style scoped lang="scss">
  .app {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    isolation: isolate;
  }
</style>
