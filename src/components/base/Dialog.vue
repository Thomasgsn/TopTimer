<script setup lang="ts">
  import { X } from "@lucide/vue";
  import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
  import IconButton from "./IconButton.vue";

  defineProps<{
    title: string;
    eyebrow: string;
    closeLabel: string;
    actionLabel: string;
    // Fills a window sized for the dialog instead of floating over a backdrop.
    fill?: boolean;
  }>();

  const emit = defineEmits<{
    close: [];
  }>();

  const BLOCK = "dialog";
  const panel = ref<HTMLElement | null>(null);
  let previousFocus: HTMLElement | null = null;

  function focusable(): HTMLElement[] {
    return [
      ...(panel.value?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ) ?? []),
    ];
  }

  function trapTab(event: KeyboardEvent): void {
    const items = focusable();
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  onMounted(() => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void nextTick(() =>
      (panel.value?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0])?.focus(),
    );
  });
  onBeforeUnmount(() => {
    if (previousFocus?.isConnected) previousFocus.focus();
  });
</script>

<template>
  <div
    :class="[BLOCK, { [`${BLOCK}--fill`]: fill }]"
    @click="emit('close')"
    @keydown.esc.stop.prevent="emit('close')"
    @keydown.tab="trapTab"
  >
    <section
      ref="panel"
      :class="`${BLOCK}__dialog`"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.stop
    >
      <header :class="`${BLOCK}__header`">
        <div :class="`${BLOCK}__heading`">
          <span :class="`${BLOCK}__eyebrow`">{{ eyebrow }}</span>
          <h2 :class="`${BLOCK}__title`">{{ title }}</h2>
        </div>
        <IconButton :icon="X" :size="17" :label="closeLabel" @click="emit('close')" />
      </header>

      <slot />

      <footer :class="`${BLOCK}__footer`">
        <slot name="footer">
          <button :class="`${BLOCK}__done`" type="button" @click="emit('close')">
            {{ actionLabel }}
          </button>
        </slot>
      </footer>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  .dialog {
    position: absolute;
    inset: 0;
    z-index: $z-index-dialog;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(24 25 26 / 28%);
    backdrop-filter: blur(5px);

    &__dialog {
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100dvh - 24px);
      overflow: hidden auto;
      border: 1px solid rgb(20 22 24 / 11%);
      border-radius: 14px;
      background: rgb(255 255 255 / 98%);
      box-shadow: 0 24px 70px rgb(20 22 24 / 22%);
    }

    &__header {
      padding: 20px 20px 15px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--line);
    }

    &__eyebrow {
      color: var(--accent);
      font-size: 9px;
      font-weight: 720;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    &__title {
      margin: 2px 0 0;
      font-size: 20px;
      letter-spacing: -0.02em;
    }

    &__footer {
      padding: 16px 20px 20px;
      display: flex;
      justify-content: flex-end;
    }

    &__done {
      padding: 7px 13px;
      border-radius: 7px;
      color: #fff;
      background: var(--accent);
      cursor: pointer;
      font-size: 11px;
      font-weight: 680;
    }

    &--fill {
      background: transparent;
      backdrop-filter: none;
    }

    &--fill &__dialog {
      width: 100%;
      height: 100%;
      max-height: 100dvh;
      display: flex;
      flex-direction: column;
      box-shadow: none;
    }

    &--fill &__footer {
      margin-top: auto;
    }
  }

  @media (prefers-color-scheme: dark) {
    .dialog__dialog {
      color: var(--text);
      background: rgb(45 47 48 / 99%);
    }
  }
</style>
