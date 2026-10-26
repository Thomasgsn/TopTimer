<script setup lang="ts">
  import NumberFlow, { NumberFlowGroup, type Format } from "@number-flow/vue";
  import { Lock, Move, Pause, Pin, PinOff, Play, RotateCcw, Settings } from "@lucide/vue";
  import { useI18n } from "vue-i18n";
  import IconButton from "../base/IconButton.vue";

  defineProps<{
    hours: number;
    minutes: number;
    seconds: number;
    running: boolean;
    canReset: boolean;
    draggable: boolean;
    alwaysOnTop: boolean;
    alwaysOnTopBusy: boolean;
  }>();

  const emit = defineEmits<{
    toggle: [];
    reset: [];
    toggleDraggable: [];
    toggleAlwaysOnTop: [];
    openSettings: [];
  }>();

  const { t } = useI18n();
  const BLOCK = "timer";
  const twoDigits: Format = { minimumIntegerDigits: 2, useGrouping: false };
</script>

<template>
  <section :class="BLOCK" :aria-label="t('app.name')">
    <!-- Below the controls: clicks on the digits or between buttons move the widget. -->
    <div v-if="draggable" :class="`${BLOCK}__drag`" data-tauri-drag-region></div>

    <p :class="`${BLOCK}__display`" role="timer" :aria-label="t('timer.elapsed')">
      <NumberFlowGroup>
        <NumberFlow :value="hours" :format="twoDigits" />
        <span :class="`${BLOCK}__separator`">:</span>
        <NumberFlow :value="minutes" :format="twoDigits" :digits="{ 1: { max: 5 } }" />
        <span :class="`${BLOCK}__separator`">:</span>
        <NumberFlow :value="seconds" :format="twoDigits" :digits="{ 1: { max: 5 } }" />
      </NumberFlowGroup>
    </p>

    <div :class="`${BLOCK}__controls`">
      <div :class="`${BLOCK}__group`">
        <IconButton
          :icon="running ? Pause : Play"
          :fill="running ? 'none' : 'currentColor'"
          :label="t(running ? 'timer.pause' : 'timer.start')"
          @click="emit('toggle')"
        />
        <IconButton
          :icon="RotateCcw"
          :label="t('timer.reset')"
          :disabled="!canReset"
          @click="emit('reset')"
        />
      </div>
      <div :class="`${BLOCK}__group`">
        <IconButton
          :icon="draggable ? Move : Lock"
          :label="t(draggable ? 'timer.lockPosition' : 'timer.unlockPosition')"
          :pressed="!draggable"
          @click="emit('toggleDraggable')"
        />
        <IconButton
          :icon="alwaysOnTop ? Pin : PinOff"
          :fill="alwaysOnTop ? 'currentColor' : 'none'"
          :label="t(alwaysOnTop ? 'timer.alwaysOnTop' : 'timer.keepOnTop')"
          :pressed="alwaysOnTop"
          :disabled="alwaysOnTopBusy"
          @click="emit('toggleAlwaysOnTop')"
        />
        <IconButton :icon="Settings" :label="t('timer.settings')" @click="emit('openSettings')" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .timer {
    position: relative;
    height: 100%;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    border: 1px solid var(--widget-border);
    border-radius: 14px;
    color: var(--text);
    background: var(--widget);
    transition: background 140ms ease-out;

    &:hover {
      background: var(--widget-hover);
    }

    &__drag {
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }

    &__display {
      position: relative;
      margin: 0;
      text-align: center;
      font-size: 28px;
      font-weight: 650;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
    }

    &__separator {
      color: var(--muted);
    }

    &__controls {
      position: relative;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
    }

    &__group {
      display: flex;
      gap: 2px;
      pointer-events: auto;
    }
  }
</style>
