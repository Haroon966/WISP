// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
fn linux_graphics_workarounds() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");

    // ponytail: compositing disable fixes blank windows but can hang/crash WebKitGTK — opt-in only
    let compositing = std::env::var_os("WISP_WEBKIT_DISABLE_COMPOSITING");
    let enable = compositing.as_ref().and_then(|v| v.to_str()).is_some_and(|v| {
        matches!(v, "1" | "true" | "yes")
    });
    if enable {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
}

fn main() {
    // ponytail: WebKitGTK on Linux often paints only backgroundColor (blank/black window)
    #[cfg(target_os = "linux")]
    linux_graphics_workarounds();
    wisp_lib::run()
}
