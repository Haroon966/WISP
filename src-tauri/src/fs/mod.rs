pub mod content;
pub mod entries;
pub mod media;
pub mod path;
pub mod watcher;

pub use media::{prepare_media_preview, MediaPreviewPayload};
pub use content::{read_file, write_file, FilePayload};
pub use entries::{list_directory, list_subfolders, stat_file, DirEntry, FileStat};
pub use path::to_display_path;
pub use watcher::{WatcherManager};

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    pub name: String,
    pub path: String,
}
