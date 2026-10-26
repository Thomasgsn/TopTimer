<script setup lang="ts">
  import { CalendarDays, Keyboard, Languages } from "@lucide/vue";
  import { useI18n } from "vue-i18n";
  import { localeNames, supportedLocales, type AppLocale } from "@/app/i18n";
  import Dialog from "../base/Dialog.vue";

  defineProps<{
    locale: string;
    nativeRuntime: boolean;
    autostartEnabled: boolean;
    autostartBusy: boolean;
  }>();

  const emit = defineEmits<{
    close: [];
    setLocale: [locale: AppLocale];
    toggleAutostart: [];
  }>();

  const { t } = useI18n();
  const BLOCK = "settings";

  function onLocaleChange(event: Event): void {
    emit("setLocale", (event.target as HTMLSelectElement).value as AppLocale);
  }
</script>

<template>
  <Dialog
    :title="t('settings.title')"
    :eyebrow="t('settings.general')"
    :close-label="t('nav.close')"
    :action-label="t('settings.done')"
    fill
    @close="emit('close')"
  >
    <div :class="BLOCK">
      <div :class="`${BLOCK}__row`">
        <div :class="`${BLOCK}__icon`"><Languages :size="17" /></div>
        <div :class="`${BLOCK}__copy`">
          <label :class="`${BLOCK}__label`" for="locale-select">
            {{ t("settings.language") }}
          </label>
          <p :class="`${BLOCK}__help`">{{ t("settings.languageHelp") }}</p>
        </div>
        <select
          id="locale-select"
          :class="`${BLOCK}__select`"
          :value="locale"
          @change="onLocaleChange"
        >
          <option v-for="language in supportedLocales" :key="language" :value="language">
            {{ localeNames[language] }}
          </option>
        </select>
      </div>

      <div :class="`${BLOCK}__row`">
        <div :class="`${BLOCK}__icon`"><CalendarDays :size="17" /></div>
        <div :class="`${BLOCK}__copy`">
          <span :class="`${BLOCK}__label`">{{ t("settings.launchAtLogin") }}</span>
          <p :class="`${BLOCK}__help`">{{ t("settings.launchAtLoginHelp") }}</p>
          <small v-if="!nativeRuntime" :class="`${BLOCK}__native-only`">
            {{ t("settings.nativeOnly") }}
          </small>
        </div>
        <button
          :class="[`${BLOCK}__switch`, { [`${BLOCK}__switch--active`]: autostartEnabled }]"
          type="button"
          role="switch"
          :aria-label="t('settings.launchAtLogin')"
          :aria-checked="autostartEnabled"
          :disabled="!nativeRuntime || autostartBusy"
          @click="emit('toggleAutostart')"
        >
          <span :class="`${BLOCK}__switch-thumb`"></span>
        </button>
      </div>

      <div :class="[`${BLOCK}__row`, `${BLOCK}__row--stacked`]">
        <div :class="`${BLOCK}__icon`"><Keyboard :size="17" /></div>
        <div :class="`${BLOCK}__copy`">
          <span :class="`${BLOCK}__label`">{{ t("settings.shortcuts") }}</span>
          <p :class="`${BLOCK}__help`">{{ t("settings.shortcutsHelp") }}</p>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
  .settings {
    &__row {
      min-height: 88px;
      margin: 0 20px;
      padding: 15px 0;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      align-items: center;
      gap: 11px;
      border-bottom: 1px solid var(--line);
    }

    &__row--stacked {
      align-items: start;
      border-bottom: 0;
    }

    &__icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      color: var(--accent);
      background: var(--accent-soft);
    }

    &__label {
      color: var(--text);
      font-size: 12px;
      font-weight: 680;
    }

    &__help {
      margin: 3px 0 0;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.45;
    }

    &__native-only {
      display: block;
      margin-top: 3px;
      color: var(--accent);
      font-size: 9px;
    }

    &__select {
      max-width: 128px;
      padding: 6px 26px 6px 9px;
      border: 1px solid var(--line);
      border-radius: 7px;
      color: var(--text);
      background: var(--list);
      font-size: 11px;
    }

    &__switch {
      position: relative;
      width: 34px;
      height: 20px;
      padding: 2px;
      border-radius: 999px;
      background: #c8c8c5;
      cursor: pointer;
      transition: background 140ms ease-out;

      &--active {
        background: var(--accent);
      }

      &:disabled {
        opacity: 0.45;
        cursor: default;
      }
    }

    &__switch-thumb {
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgb(20 22 24 / 20%);
      transition: transform 140ms ease-out;

      .settings__switch--active & {
        transform: translateX(14px);
      }
    }
  }

  @media (prefers-color-scheme: dark) {
    .settings__select {
      background: #363839;
    }
  }
</style>
