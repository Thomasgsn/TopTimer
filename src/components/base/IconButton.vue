<script lang="ts" setup>
  import type { Component } from "vue";

  type IconButtonVariant = "default" | "dark" | "destructive";
  type IconButtonType = "button" | "submit" | "reset";

  type IconButtonProps = {
    icon: Component;
    size?: number;
    fill?: string;
    strokeWidth?: number;
    type?: IconButtonType;
    title?: string;
    disabled?: boolean;
    label: string;
    pressed?: boolean;
    expanded?: boolean;
    variant?: IconButtonVariant;
  };

  const props = withDefaults(defineProps<IconButtonProps>(), {
    type: "button",
    size: 16,
    fill: "none",
    strokeWidth: undefined,
    title: undefined,
    disabled: false,
    pressed: undefined,
    expanded: undefined,
    variant: "default",
  });

  const emit = defineEmits<{
    click: [event: MouseEvent];
  }>();

  const BLOCK = "icon-button";
</script>

<template>
  <button
    :class="[BLOCK, { [`${BLOCK}--${props.variant}`]: props.variant !== 'default' }]"
    :disabled="disabled"
    :type="type"
    :title="title ?? label"
    :aria-label="label"
    :aria-pressed="pressed"
    :aria-expanded="expanded"
    @click="emit('click', $event)"
  >
    <component :is="icon" :size="size" :fill="fill" :stroke-width="strokeWidth" />
  </button>
</template>

<style lang="scss" scoped>
  .icon-button {
    width: 30px;
    height: 30px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 7px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    transition:
      color 140ms ease-out,
      background 140ms ease-out;
    -webkit-app-region: no-drag;

    &:hover:not(:disabled) {
      color: var(--text);
      background: var(--hover);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &--dark {
      color: var(--nav-muted);

      &:hover:not(:disabled) {
        color: var(--nav-text);
        background: rgb(255 255 255 / 10%);
      }
    }

    &--destructive {
      color: #b34f4b;
    }
  }
</style>
