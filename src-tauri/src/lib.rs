mod persistence;

use std::sync::Mutex;

use persistence::WindowPosition;
use tauri::{
    menu::{Menu, MenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const TRAY_ID: &str = "toptimer";
const MAIN_WINDOW: &str = "main";
const QUIT_REQUESTED_EVENT: &str = "toptimer://quit-requested";
const TOGGLE_TIMER_EVENT: &str = "toptimer://toggle-timer";
const RESET_TIMER_EVENT: &str = "toptimer://reset-timer";
/// Part of the widget, in physical pixels, that must stay on a screen for a saved
/// position to be restored (a display may have been unplugged since).
const MIN_VISIBLE_PIXELS: i64 = 40;

struct TrayLabels {
    show: &'static str,
    start: &'static str,
    pause: &'static str,
    reset: &'static str,
    quit: &'static str,
}

fn tray_labels(locale: &str) -> TrayLabels {
    match locale {
        "fr" => TrayLabels {
            show: "Afficher TopTimer",
            start: "Démarrer",
            pause: "Pause",
            reset: "Remettre à zéro",
            quit: "Quitter",
        },
        "it" => TrayLabels {
            show: "Mostra TopTimer",
            start: "Avvia",
            pause: "Pausa",
            reset: "Azzera",
            quit: "Esci",
        },
        "es" => TrayLabels {
            show: "Mostrar TopTimer",
            start: "Iniciar",
            pause: "Pausa",
            reset: "Poner a cero",
            quit: "Salir",
        },
        "de" => TrayLabels {
            show: "TopTimer anzeigen",
            start: "Starten",
            pause: "Pausieren",
            reset: "Zurücksetzen",
            quit: "Beenden",
        },
        _ => TrayLabels {
            show: "Show TopTimer",
            start: "Start",
            pause: "Pause",
            reset: "Reset",
            quit: "Quit",
        },
    }
}

/// What the tray menu shows: its language and whether the stopwatch is running.
struct TrayState {
    locale: String,
    running: bool,
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>, state: &TrayState) -> tauri::Result<Menu<R>> {
    let labels = tray_labels(&state.locale);

    MenuBuilder::new(app)
        .text("show", labels.show)
        .separator()
        .text(
            "toggle_timer",
            if state.running {
                labels.pause
            } else {
                labels.start
            },
        )
        .text("reset", labels.reset)
        .separator()
        .text("quit", labels.quit)
        .build()
}

fn refresh_tray_menu(app: &AppHandle, update: impl FnOnce(&mut TrayState)) -> Result<(), String> {
    let state = app.state::<Mutex<TrayState>>();
    let mut state = state.lock().map_err(|error| error.to_string())?;
    update(&mut state);
    let menu = build_tray_menu(app, &state).map_err(|error| error.to_string())?;
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "TopTimer tray icon is not available".to_string())?;

    tray.set_menu(Some(menu)).map_err(|error| error.to_string())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        window.unminimize()?;
        window.show()?;
        window.set_focus()?;
    }

    Ok(())
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        if window.is_visible()? && window.is_focused()? {
            window.hide()?;
        } else {
            show_main_window(app)?;
        }
    }

    Ok(())
}

/// Shows or hides TopTimer from any application (listed in the settings as ⌥⌘T).
fn toggle_window_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT | Modifiers::SUPER), Code::KeyT)
}

/// Screen rectangle as `(x, y, width, height)` in physical pixels.
type ScreenRect = (i32, i32, u32, u32);

fn is_on_a_screen(position: WindowPosition, size: (u32, u32), screens: &[ScreenRect]) -> bool {
    let (left, top) = (i64::from(position.x), i64::from(position.y));
    let (right, bottom) = (left + i64::from(size.0), top + i64::from(size.1));

    screens.iter().any(|&(x, y, width, height)| {
        let (screen_left, screen_top) = (i64::from(x), i64::from(y));
        let screen_right = screen_left + i64::from(width);
        let screen_bottom = screen_top + i64::from(height);
        let overlap_width = right.min(screen_right) - left.max(screen_left);
        let overlap_height = bottom.min(screen_bottom) - top.max(screen_top);
        overlap_width >= MIN_VISIBLE_PIXELS && overlap_height >= MIN_VISIBLE_PIXELS
    })
}

/// Puts the widget back where it was left, unless that place is no longer on screen.
fn restore_window_position<R: Runtime>(
    window: &WebviewWindow<R>,
    position: WindowPosition,
) -> tauri::Result<()> {
    let size = window.outer_size()?;
    let screens: Vec<ScreenRect> = window
        .available_monitors()?
        .iter()
        .map(|monitor| {
            let origin = monitor.position();
            let extent = monitor.size();
            (origin.x, origin.y, extent.width, extent.height)
        })
        .collect();

    if is_on_a_screen(position, (size.width, size.height), &screens) {
        window.set_position(PhysicalPosition::new(position.x, position.y))?;
    }

    Ok(())
}

#[tauri::command]
fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let window = app
        .get_webview_window(MAIN_WINDOW)
        .ok_or_else(|| "TopTimer main window is not available".to_string())?;

    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;

    // macOS applies the window level asynchronously, so an immediate read can
    // return the previous state. Report the state accepted by the setter.
    Ok(enabled)
}

#[tauri::command]
fn set_tray_locale(app: AppHandle, locale: String) -> Result<(), String> {
    refresh_tray_menu(&app, |state| state.locale = locale)
}

#[tauri::command]
fn set_tray_running(app: AppHandle, running: bool) -> Result<(), String> {
    refresh_tray_menu(&app, |state| state.running = running)
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first. Two processes would each keep their own
        // stopwatch and overwrite each other's saves, so a second launch only
        // reveals the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_main_window(app);
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            let persistence = persistence::Persistence::open(app.path().app_data_dir()?)?;
            let saved_position = persistence.window_position();
            app.manage(persistence);

            #[cfg(target_os = "macos")]
            app.handle()
                .set_activation_policy(tauri::ActivationPolicy::Accessory)?;

            let tray_state = TrayState {
                locale: "en".to_string(),
                running: false,
            };
            let menu = build_tray_menu(app.handle(), &tray_state)?;
            app.manage(Mutex::new(tray_state));
            let tray_icon =
                tauri::image::Image::from_bytes(include_bytes!("../icons/tray/44x44.png"))?;
            let mut tray = TrayIconBuilder::with_id(TRAY_ID)
                .icon(tray_icon)
                .tooltip("TopTimer")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        let _ = show_main_window(app);
                    }
                    "toggle_timer" => {
                        let _ = app.emit(TOGGLE_TIMER_EVENT, ());
                    }
                    "reset" => {
                        let _ = app.emit(RESET_TIMER_EVENT, ());
                    }
                    "quit" => {
                        let _ = app.emit(QUIT_REQUESTED_EVENT, ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = toggle_main_window(tray.app_handle());
                    }
                });

            #[cfg(target_os = "macos")]
            {
                tray = tray.icon_as_template(true);
            }

            tray.build(app)?;

            // Another application may already own the shortcut: keep running without it.
            if let Err(error) = app.global_shortcut().on_shortcut(
                toggle_window_shortcut(),
                |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = toggle_main_window(app);
                    }
                },
            ) {
                eprintln!("TopTimer could not register its global shortcut: {error}");
            }

            for window in app.webview_windows().values() {
                window.set_always_on_top(true)?;
            }

            if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
                if let Some(position) = saved_position {
                    if let Err(error) = restore_window_position(&window, position) {
                        eprintln!("TopTimer could not restore its position: {error}");
                    }
                }

                if std::env::args().any(|argument| argument == "--hidden") {
                    window.hide()?;
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            persistence::load_app_data,
            persistence::save_settings,
            persistence::save_timer,
            persistence::save_window_position,
            quit_app,
            set_always_on_top,
            set_tray_locale,
            set_tray_running
        ])
        .run(tauri::generate_context!())
        .expect("error while running TopTimer");
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAIN_SCREEN: ScreenRect = (0, 0, 2880, 1800);
    const WIDGET: (u32, u32) = (400, 200);

    #[test]
    fn the_global_shortcut_is_option_command_t() {
        let expected: Shortcut = "alt+super+KeyT".parse().unwrap();
        assert_eq!(toggle_window_shortcut(), expected);
    }

    #[test]
    fn a_position_on_screen_is_restored() {
        let position = WindowPosition { x: 2400, y: 40 };
        assert!(is_on_a_screen(position, WIDGET, &[MAIN_SCREEN]));
    }

    #[test]
    fn a_position_on_an_unplugged_display_is_ignored() {
        let position = WindowPosition { x: 3200, y: 300 };
        assert!(!is_on_a_screen(position, WIDGET, &[MAIN_SCREEN]));
        assert!(is_on_a_screen(
            position,
            WIDGET,
            &[MAIN_SCREEN, (2880, 0, 3840, 2160)]
        ));
    }

    #[test]
    fn a_widget_barely_on_screen_is_not_restored_there() {
        let position = WindowPosition { x: -380, y: 100 };
        assert!(!is_on_a_screen(position, WIDGET, &[MAIN_SCREEN]));
    }
}
