# TopTimer

Chronomètre pour la barre des menus macOS : un petit widget translucide, toujours au premier plan, qui compte heures, minutes et secondes. Interface en français, anglais, italien, espagnol et allemand.

- **Démarrer / Pause** et **Remettre à zéro** depuis le widget, la barre des menus ou le clavier (**Espace**, **R**).
- **⌥⌘T** affiche ou masque TopTimer depuis n'importe quelle application.
- Le temps écoulé est conservé : à la relance, le chronomètre reprend en pause là où il s'était arrêté.
- Le widget se déplace par glisser-déposer ; le cadenas verrouille sa position, qui est mémorisée entre deux lancements.
- L'épingle garde (ou non) le widget au-dessus des autres fenêtres, sur tous les Spaces.
- Réglages (roue dentée) : langue, ouverture à la connexion, rappel des raccourcis.
- Thème clair ou sombre selon l'apparence de macOS.
- Pas d'icône dans le Dock : TopTimer vit dans la barre des menus (clic gauche : afficher/masquer ; clic droit : menu).

Construit avec [Tauri 2](https://tauri.app) (Rust), Vue 3 et TypeScript, sur la même base que TopNotes.

## Installation

```bash
npm install
```

```bash
npm run tauri build
```

L'application est produite dans `src-tauri/target/release/bundle/macos/TopTimer.app` et l'image disque dans `src-tauri/target/release/bundle/dmg/`. Glisser `TopTimer.app` dans `/Applications`.

L'app est signée localement (signature ad hoc) et n'est pas notarisée : au premier lancement d'une copie téléchargée, macOS peut demander de l'ouvrir via clic droit › Ouvrir.

Au premier lancement, TopTimer s'ajoute aux éléments ouverts à la connexion (LaunchAgent `~/Library/LaunchAgents/TopTimer.plist`, démarrage masqué). Le réglage « Ouvrir à la connexion » le désactive.

## Données

Tout reste en local.

| Élément                          | Emplacement                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Temps écoulé, réglages, position | `~/Library/Application Support/com.ths.toptimer/toptimer.json`                      |
| Fichier illisible mis de côté    | `~/Library/Application Support/com.ths.toptimer/toptimer.corrupt-<horodatage>.json` |

- Écriture atomique (fichier temporaire, `fsync`, renommage), fichier lisible par l'utilisateur seul (`0600`).
- Le temps écoulé est enregistré à chaque démarrage, pause et remise à zéro, toutes les 15 s pendant le comptage et avant de quitter.
- Si le fichier vient d'une version plus récente de TopTimer, l'app l'explique et **n'écrit rien**.
- Une position enregistrée sur un écran débranché depuis est ignorée.

En mode navigateur (`npm run dev` sans Tauri), les données vont dans le `localStorage` de la page.

## Développement

Prérequis : Node 24 (voir `.nvmrc`), Rust stable et les [prérequis Tauri pour macOS](https://tauri.app/start/prerequisites/).

```bash
npm run tauri dev
```

| Script                | Rôle                                                       |
| --------------------- | ---------------------------------------------------------- |
| `npm run dev`         | Interface seule dans le navigateur (http://localhost:1430) |
| `npm run tauri dev`   | Application native avec rechargement à chaud               |
| `npm run tauri build` | Application macOS (`.app` / `.dmg`)                        |
| `npm test`            | Tests front (`node --test`)                                |
| `npm run test:rust`   | Tests Rust (persistance, position, raccourci)              |
| `npm run lint`        | ESLint, Stylelint et Prettier                              |
| `npm run typecheck`   | `vue-tsc --noEmit`                                         |

Un hook `pre-commit` (husky + lint-staged) corrige le format des fichiers modifiés.

> **Attention :** `npm run tauri dev` utilise le même dossier de données que l'application installée, et active l'ouverture à la connexion au premier lancement. Pour tester sans y toucher, lancez le binaire avec un `HOME` temporaire :
>
> ```bash
> HOME=$(mktemp -d) src-tauri/target/debug/toptimer
> ```

Les icônes sont générées à partir des sources SVG :

```bash
npx tauri icon src-tauri/icons/app-icon.svg
```

(puis ne garder que `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns` et `icon.png`), et `npx tauri icon src-tauri/icons/tray-icon.svg --png 44` pour `icons/tray/44x44.png`.

## Structure

```
src/
  main.ts                  démarrage : charge les données puis monte l'app
  persistence.ts           lecture/écriture (Tauri ou localStorage)
  stopwatch.ts             calcul du temps écoulé à partir d'horodatages
  stores/timer.ts          chronomètre, raccourcis clavier, actions de la barre des menus
  stores/settings.ts       langue, premier plan, verrou de position, ouverture à la connexion
  stores/settingsWindow.ts agrandit la fenêtre pendant les réglages
  stores/windowPosition.ts mémorise la position du widget
  components/              widget, dialogue des réglages, composants de base
  i18n.ts                  traductions
src-tauri/src/
  lib.rs                   barre des menus, fenêtre, instance unique, raccourci global
  persistence.rs           fichier JSON atomique, protection des données
tests/                     tests node:test
```
