import { createI18n } from "vue-i18n";

export const supportedLocales = ["fr", "en", "it", "es", "de"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const localeNames: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  it: "Italiano",
  es: "Español",
  de: "Deutsch",
};

export function resolveLocale(locale?: string | null): AppLocale {
  const shortLocale = locale?.toLowerCase().split("-")[0];
  return supportedLocales.includes(shortLocale as AppLocale) ? (shortLocale as AppLocale) : "en";
}

const messages = {
  fr: {
    app: {
      name: "TopTimer",
      loadFailedTitle: "TopTimer n’a pas pu lire ses données",
      loadFailedHelp:
        "Vos données n’ont pas été modifiées. Elles ont peut-être été créées par une version plus récente de TopTimer : mettez l’application à jour, puis relancez-la.",
    },
    timer: {
      elapsed: "Temps écoulé",
      start: "Démarrer",
      pause: "Pause",
      reset: "Remettre à zéro",
      lockPosition: "Verrouiller la position",
      unlockPosition: "Déverrouiller la position",
      alwaysOnTop: "Toujours au premier plan",
      keepOnTop: "Garder au premier plan",
      settings: "Réglages",
    },
    nav: {
      close: "Fermer",
    },
    settings: {
      title: "Réglages",
      general: "Général",
      language: "Langue",
      languageHelp: "La langue change immédiatement dans toute l’application.",
      launchAtLogin: "Ouvrir à la connexion",
      launchAtLoginHelp:
        "Lance TopTimer discrètement dans la barre des menus quand votre Mac démarre.",
      nativeOnly: "Ce réglage sera disponible dans l’application macOS.",
      shortcuts: "Raccourcis clavier",
      shortcutsHelp:
        "⌥⌘T affiche ou masque TopTimer depuis n’importe quelle application. Espace démarre ou met en pause, R remet à zéro.",
      done: "Terminé",
    },
  },
  en: {
    app: {
      name: "TopTimer",
      loadFailedTitle: "TopTimer could not read its data",
      loadFailedHelp:
        "Your data has not been changed. It may have been created by a newer version of TopTimer: update the app, then open it again.",
    },
    timer: {
      elapsed: "Elapsed time",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      lockPosition: "Lock position",
      unlockPosition: "Unlock position",
      alwaysOnTop: "Always on top",
      keepOnTop: "Keep on top",
      settings: "Settings",
    },
    nav: {
      close: "Close",
    },
    settings: {
      title: "Settings",
      general: "General",
      language: "Language",
      languageHelp: "The language changes immediately throughout the app.",
      launchAtLogin: "Open at login",
      launchAtLoginHelp: "Start TopTimer quietly in the menu bar when your Mac starts.",
      nativeOnly: "This setting will be available in the macOS app.",
      shortcuts: "Keyboard shortcuts",
      shortcutsHelp: "⌥⌘T shows or hides TopTimer from any app. Space starts or pauses, R resets.",
      done: "Done",
    },
  },
  it: {
    app: {
      name: "TopTimer",
      loadFailedTitle: "TopTimer non è riuscito a leggere i suoi dati",
      loadFailedHelp:
        "I tuoi dati non sono stati modificati. Potrebbero essere stati creati da una versione più recente di TopTimer: aggiorna l’app e riaprila.",
    },
    timer: {
      elapsed: "Tempo trascorso",
      start: "Avvia",
      pause: "Pausa",
      reset: "Azzera",
      lockPosition: "Blocca la posizione",
      unlockPosition: "Sblocca la posizione",
      alwaysOnTop: "Sempre in primo piano",
      keepOnTop: "Mantieni in primo piano",
      settings: "Impostazioni",
    },
    nav: {
      close: "Chiudi",
    },
    settings: {
      title: "Impostazioni",
      general: "Generali",
      language: "Lingua",
      languageHelp: "La lingua cambia immediatamente in tutta l’app.",
      launchAtLogin: "Apri al login",
      launchAtLoginHelp: "Avvia TopTimer discretamente nella barra dei menu all’avvio del Mac.",
      nativeOnly: "Questa impostazione sarà disponibile nell’app macOS.",
      shortcuts: "Scorciatoie da tastiera",
      shortcutsHelp:
        "⌥⌘T mostra o nasconde TopTimer da qualsiasi app. Spazio avvia o mette in pausa, R azzera.",
      done: "Fine",
    },
  },
  es: {
    app: {
      name: "TopTimer",
      loadFailedTitle: "TopTimer no ha podido leer sus datos",
      loadFailedHelp:
        "Tus datos no se han modificado. Puede que los haya creado una versión más reciente de TopTimer: actualiza la aplicación y vuelve a abrirla.",
    },
    timer: {
      elapsed: "Tiempo transcurrido",
      start: "Iniciar",
      pause: "Pausa",
      reset: "Poner a cero",
      lockPosition: "Bloquear la posición",
      unlockPosition: "Desbloquear la posición",
      alwaysOnTop: "Siempre visible",
      keepOnTop: "Mantener visible",
      settings: "Ajustes",
    },
    nav: {
      close: "Cerrar",
    },
    settings: {
      title: "Ajustes",
      general: "General",
      language: "Idioma",
      languageHelp: "El idioma cambia inmediatamente en toda la aplicación.",
      launchAtLogin: "Abrir al iniciar sesión",
      launchAtLoginHelp: "Inicia TopTimer discretamente en la barra de menús al arrancar el Mac.",
      nativeOnly: "Este ajuste estará disponible en la aplicación macOS.",
      shortcuts: "Atajos de teclado",
      shortcutsHelp:
        "⌥⌘T muestra u oculta TopTimer desde cualquier aplicación. Espacio inicia o pausa, R pone a cero.",
      done: "Listo",
    },
  },
  de: {
    app: {
      name: "TopTimer",
      loadFailedTitle: "TopTimer konnte seine Daten nicht lesen",
      loadFailedHelp:
        "Deine Daten wurden nicht verändert. Sie wurden möglicherweise von einer neueren TopTimer-Version erstellt: Aktualisiere die App und öffne sie erneut.",
    },
    timer: {
      elapsed: "Verstrichene Zeit",
      start: "Starten",
      pause: "Pausieren",
      reset: "Zurücksetzen",
      lockPosition: "Position sperren",
      unlockPosition: "Position entsperren",
      alwaysOnTop: "Immer im Vordergrund",
      keepOnTop: "Im Vordergrund halten",
      settings: "Einstellungen",
    },
    nav: {
      close: "Schließen",
    },
    settings: {
      title: "Einstellungen",
      general: "Allgemein",
      language: "Sprache",
      languageHelp: "Die Sprache ändert sich sofort in der gesamten App.",
      launchAtLogin: "Bei Anmeldung öffnen",
      launchAtLoginHelp: "TopTimer startet beim Hochfahren des Macs unauffällig in der Menüleiste.",
      nativeOnly: "Diese Einstellung ist in der macOS-App verfügbar.",
      shortcuts: "Tastaturkurzbefehle",
      shortcutsHelp:
        "⌥⌘T blendet TopTimer in jeder App ein oder aus. Leertaste startet oder pausiert, R setzt zurück.",
      done: "Fertig",
    },
  },
};

const browserLocale = typeof navigator === "undefined" ? "en" : navigator.language;

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(browserLocale),
  fallbackLocale: "en",
  messages,
});
