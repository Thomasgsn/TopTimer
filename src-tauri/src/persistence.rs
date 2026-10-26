use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufWriter, Write},
    path::{Path, PathBuf},
    sync::{Arc, Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::State;

const SCHEMA_VERSION: u32 = 1;
const DATA_FILE_NAME: &str = "toptimer.json";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppData {
    #[serde(default = "schema_version")]
    schema_version: u32,
    #[serde(default)]
    timer: Option<TimerState>,
    #[serde(default)]
    settings: Option<Settings>,
    #[serde(default)]
    window_position: Option<WindowPosition>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            timer: None,
            settings: None,
            window_position: None,
        }
    }
}

/// The stopwatch is always restored paused: only the elapsed time is kept.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TimerState {
    elapsed_ms: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Settings {
    locale: AppLocale,
    always_on_top: bool,
    autostart_initialized: bool,
    #[serde(default = "default_draggable")]
    draggable: bool,
}

/// Top-left corner of the widget, in physical pixels.
#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct WindowPosition {
    pub(crate) x: i32,
    pub(crate) y: i32,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum AppLocale {
    Fr,
    En,
    It,
    Es,
    De,
}

#[derive(Clone)]
pub(crate) struct Persistence {
    inner: Arc<PersistenceInner>,
}

struct PersistenceInner {
    data_path: PathBuf,
    data: Mutex<AppData>,
    // Set when the data file exists but cannot be used (newer schema, read
    // error). Writes are then refused so the file is never overwritten.
    load_error: Option<String>,
}

impl Persistence {
    pub(crate) fn open(app_data_dir: PathBuf) -> io::Result<Self> {
        let data_path = app_data_dir.join(DATA_FILE_NAME);
        let (data, load_error) = match load_or_recover(&data_path) {
            Ok(data) => (data, None),
            Err(error) => (
                AppData::default(),
                Some(format!("{} ({})", error, data_path.display())),
            ),
        };
        Ok(Self {
            inner: Arc::new(PersistenceInner {
                data_path,
                data: Mutex::new(data),
                load_error,
            }),
        })
    }

    fn load(&self) -> io::Result<AppData> {
        self.ensure_loaded()?;
        Ok(self.lock_data()?.clone())
    }

    pub(crate) fn window_position(&self) -> Option<WindowPosition> {
        self.lock_data().ok()?.window_position
    }

    fn save_timer(&self, timer: TimerState) -> io::Result<()> {
        self.update(|data| data.timer = Some(timer))
    }

    fn save_settings(&self, settings: Settings) -> io::Result<()> {
        self.update(|data| data.settings = Some(settings))
    }

    fn save_window_position(&self, position: WindowPosition) -> io::Result<()> {
        self.update(|data| data.window_position = Some(position))
    }

    fn update(&self, update: impl FnOnce(&mut AppData)) -> io::Result<()> {
        self.ensure_loaded()?;
        let mut current = self.lock_data()?;
        let mut next = current.clone();
        update(&mut next);
        write_atomically(&self.inner.data_path, &next)?;
        *current = next;
        Ok(())
    }

    fn ensure_loaded(&self) -> io::Result<()> {
        match &self.inner.load_error {
            Some(error) => Err(io::Error::other(error.clone())),
            None => Ok(()),
        }
    }

    fn lock_data(&self) -> io::Result<MutexGuard<'_, AppData>> {
        self.inner
            .data
            .lock()
            .map_err(|_| io::Error::other("the persistence lock is poisoned"))
    }
}

#[tauri::command]
pub(crate) fn load_app_data(state: State<'_, Persistence>) -> Result<AppData, String> {
    state.load().map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn save_timer(
    state: State<'_, Persistence>,
    timer: TimerState,
) -> Result<(), String> {
    let persistence = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || persistence.save_timer(timer))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn save_settings(
    state: State<'_, Persistence>,
    settings: Settings,
) -> Result<(), String> {
    let persistence = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || persistence.save_settings(settings))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) async fn save_window_position(
    state: State<'_, Persistence>,
    position: WindowPosition,
) -> Result<(), String> {
    let persistence = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || persistence.save_window_position(position))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

fn schema_version() -> u32 {
    SCHEMA_VERSION
}

fn default_draggable() -> bool {
    true
}

fn load_or_recover(path: &Path) -> io::Result<AppData> {
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(AppData::default()),
        Err(error) => return Err(error),
    };

    match serde_json::from_str::<AppData>(&raw) {
        Ok(data) if data.schema_version == SCHEMA_VERSION => Ok(data),
        Ok(data) => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "unsupported TopTimer data schema {}; expected {SCHEMA_VERSION}",
                data.schema_version
            ),
        )),
        Err(error) => {
            preserve_corrupt_file(path)?;
            eprintln!("TopTimer preserved an unreadable data file: {error}");
            Ok(AppData::default())
        }
    }
}

fn preserve_corrupt_file(path: &Path) -> io::Result<()> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let corrupt_path = path.with_file_name(format!("toptimer.corrupt-{timestamp}.json"));
    fs::rename(path, corrupt_path)
}

fn write_atomically(path: &Path, data: &AppData) -> io::Result<()> {
    let directory = path
        .parent()
        .ok_or_else(|| io::Error::other("the data path has no parent directory"))?;
    fs::create_dir_all(directory)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary_path = path.with_file_name(format!(
        ".{DATA_FILE_NAME}.{}-{timestamp}.tmp",
        std::process::id()
    ));

    let result = (|| {
        let file = secure_temporary_file(&temporary_path)?;
        let mut writer = BufWriter::new(file);
        serde_json::to_writer(&mut writer, data).map_err(io::Error::other)?;
        writer.flush()?;
        let file = writer
            .into_inner()
            .map_err(|error| io::Error::other(error.to_string()))?;
        file.sync_all()?;
        fs::rename(&temporary_path, path)?;
        sync_directory(directory)?;
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }
    result
}

fn secure_temporary_file(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);

    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }

    options.open(path)
}

#[cfg(unix)]
fn sync_directory(directory: &Path) -> io::Result<()> {
    File::open(directory)?.sync_all()
}

#[cfg(not(unix))]
fn sync_directory(_directory: &Path) -> io::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestDirectory(PathBuf);

    // Tests run in parallel and macOS clocks are only microsecond precise, so a
    // timestamp alone can give two tests the same directory.
    static NEXT_DIRECTORY: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

    impl TestDirectory {
        fn new() -> Self {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos();
            let index = NEXT_DIRECTORY.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "toptimer-persistence-test-{}-{timestamp}-{index}",
                std::process::id()
            ));
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn settings() -> Settings {
        Settings {
            locale: AppLocale::Fr,
            always_on_top: false,
            autostart_initialized: true,
            draggable: false,
        }
    }

    #[test]
    fn missing_storage_starts_empty() {
        let directory = TestDirectory::new();
        let persistence = Persistence::open(directory.0.clone()).unwrap();

        assert_eq!(persistence.load().unwrap(), AppData::default());
        assert_eq!(persistence.window_position(), None);
    }

    #[test]
    fn updates_are_durable_and_merged() {
        let directory = TestDirectory::new();
        let persistence = Persistence::open(directory.0.clone()).unwrap();
        persistence
            .save_timer(TimerState { elapsed_ms: 90_500 })
            .unwrap();
        persistence.save_settings(settings()).unwrap();
        persistence
            .save_window_position(WindowPosition { x: -40, y: 120 })
            .unwrap();

        let reopened = Persistence::open(directory.0.clone()).unwrap();
        assert_eq!(
            reopened.load().unwrap(),
            AppData {
                schema_version: SCHEMA_VERSION,
                timer: Some(TimerState { elapsed_ms: 90_500 }),
                settings: Some(settings()),
                window_position: Some(WindowPosition { x: -40, y: 120 }),
            }
        );
        assert_eq!(
            reopened.window_position(),
            Some(WindowPosition { x: -40, y: 120 })
        );
    }

    #[test]
    fn malformed_storage_is_preserved_before_recovery() {
        let directory = TestDirectory::new();
        fs::create_dir_all(&directory.0).unwrap();
        fs::write(directory.0.join(DATA_FILE_NAME), "not json").unwrap();

        let persistence = Persistence::open(directory.0.clone()).unwrap();
        assert_eq!(persistence.load().unwrap(), AppData::default());

        let recovery_files = fs::read_dir(&directory.0)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().contains(".corrupt-"))
            .count();
        assert_eq!(recovery_files, 1);
    }

    #[test]
    fn data_from_a_newer_version_is_reported_and_never_overwritten() {
        let directory = TestDirectory::new();
        fs::create_dir_all(&directory.0).unwrap();
        let newer = r#"{"schemaVersion":2,"timer":{"elapsedMs":1},"futureField":true}"#;
        fs::write(directory.0.join(DATA_FILE_NAME), newer).unwrap();

        let persistence = Persistence::open(directory.0.clone()).unwrap();
        let error = persistence.load().unwrap_err().to_string();
        assert!(error.contains("schema 2"), "{error}");
        assert!(persistence
            .save_timer(TimerState { elapsed_ms: 0 })
            .is_err());
        assert!(persistence.save_settings(settings()).is_err());
        assert_eq!(
            fs::read_to_string(directory.0.join(DATA_FILE_NAME)).unwrap(),
            newer
        );
    }

    #[test]
    fn settings_without_a_drag_preference_keep_the_widget_movable() {
        let settings: Settings = serde_json::from_str(
            r#"{"locale":"fr","alwaysOnTop":true,"autostartInitialized":true}"#,
        )
        .unwrap();
        assert!(settings.draggable);
    }

    #[test]
    fn the_data_file_is_private_to_the_user() {
        use std::os::unix::fs::PermissionsExt;

        let directory = TestDirectory::new();
        let persistence = Persistence::open(directory.0.clone()).unwrap();
        persistence
            .save_timer(TimerState { elapsed_ms: 1 })
            .unwrap();

        let mode = fs::metadata(directory.0.join(DATA_FILE_NAME))
            .unwrap()
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600);
    }
}
