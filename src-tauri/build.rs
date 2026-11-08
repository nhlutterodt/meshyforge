fn main() {
    tauri_build::build();

    // The `tauri::test` MockRuntime harness (`tests/ipc_round_trip.rs`, see
    // docs/adr/0016) links Tauri's windowing stack, which includes `muda`'s
    // `TaskDialogIndirect` import from comctl32. That export only exists in
    // Common Controls v6. `tauri-build` embeds a v6 activation manifest into the
    // real app binary, but `cargo test` executables get no manifest, so the
    // Windows loader binds comctl32 v5 and aborts with
    // STATUS_ENTRYPOINT_NOT_FOUND before any test runs.
    //
    // Request Common Controls v6 in the *test* executables only.
    // `rustc-link-arg-tests` is scoped to targets built with `--test`, so the
    // app binary (and the manifest `tauri-build` already embeds there) is
    // unaffected.
    if cfg!(windows) {
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-tests=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'"
        );
    }
}
