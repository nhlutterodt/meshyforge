# Third-Party Notices

**Generated file — do not edit by hand.** Regenerate with
`npm run notices:write`; verify with `npm run notices:check`. CI runs the
same check and fails on drift.

This file discharges obligations O-1, O-2, O-3 and O-5 recorded in
[`docs/legal-metadata-baseline.md`](docs/legal-metadata-baseline.md) §4.

## Scope and known limitations

- **Rust graph: 579 packages**, read from `cargo metadata` **without platform filtering**.
  That is deliberate: the output is a superset covering every target
  `release.yml` builds, so the file is identical whichever OS regenerates it.
  Over-attribution is not a licence violation; under-attribution is.
- **npm graph: 435 packages**, production only (`dev` entries excluded).
  This is the lockfile production set, a superset of what the bundler imports.
- Licence texts are harvested from artefacts on disk (the Cargo registry
  cache and `node_modules`), matched by content signature rather than
  filename, and never transcribed by hand.
- **Licence text not found on the generating machine for:** `0BSD`, `Unlicense`. These still appear in the index with their upstream URL, and
  the appendix says so explicitly rather than omitting them.
- **Identifiers with no known signature** (listed with URL only): `LGPL-2.1-or-later`, `NOASSERTION`, `Python-2.0`.

## Rust packages (crates.io)

Runtime and build dependencies of the Rust backend.

| Package | Version | Licence | Source |
|---|---|---|---|
| `adler2` | 2.0.1 | 0BSD OR MIT OR Apache-2.0 | https://github.com/oyvindln/adler2 |
| `aes` | 0.8.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/block-ciphers |
| `ahash` | 0.8.12 | MIT OR Apache-2.0 | https://github.com/tkaitchuck/ahash |
| `aho-corasick` | 1.1.5 | Unlicense OR MIT | https://github.com/BurntSushi/aho-corasick |
| `alloc-no-stdlib` | 2.0.4 | BSD-3-Clause | https://github.com/dropbox/rust-alloc-no-stdlib |
| `alloc-stdlib` | 0.2.4 | BSD-3-Clause | https://github.com/dropbox/rust-alloc-no-stdlib |
| `android_log-sys` | 0.3.2 | MIT OR Apache-2.0 | https://github.com/rust-mobile/android_log-sys-rs |
| `android_logger` | 0.15.1 | MIT OR Apache-2.0 | https://github.com/rust-mobile/android_logger-rs |
| `android_system_properties` | 0.1.6 | MIT OR Apache-2.0 | https://github.com/nical/android_system_properties |
| `anyhow` | 1.0.104 | MIT OR Apache-2.0 | https://github.com/dtolnay/anyhow |
| `async-broadcast` | 0.7.2 | MIT OR Apache-2.0 | https://github.com/smol-rs/async-broadcast |
| `async-channel` | 2.5.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-channel |
| `async-executor` | 1.14.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-executor |
| `async-fs` | 2.2.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-fs |
| `async-io` | 2.6.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-io |
| `async-lock` | 3.4.2 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-lock |
| `async-process` | 2.5.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-process |
| `async-recursion` | 1.1.1 | MIT OR Apache-2.0 | https://github.com/dcchut/async-recursion |
| `async-signal` | 0.2.14 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-signal |
| `async-task` | 4.7.1 | Apache-2.0 OR MIT | https://github.com/smol-rs/async-task |
| `async-trait` | 0.1.92 | MIT OR Apache-2.0 | https://github.com/dtolnay/async-trait |
| `atk` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `atk-sys` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `atomic-waker` | 1.1.2 | Apache-2.0 OR MIT | https://github.com/smol-rs/atomic-waker |
| `autocfg` | 1.5.1 | Apache-2.0 OR MIT | https://github.com/cuviper/autocfg |
| `base64` | 0.21.7 | MIT OR Apache-2.0 | https://github.com/marshallpierce/rust-base64 |
| `base64` | 0.22.1 | MIT OR Apache-2.0 | https://github.com/marshallpierce/rust-base64 |
| `bit-set` | 0.8.0 | Apache-2.0 OR MIT | https://github.com/contain-rs/bit-set |
| `bit-vec` | 0.8.0 | Apache-2.0 OR MIT | https://github.com/contain-rs/bit-vec |
| `bitflags` | 1.3.2 | MIT/Apache-2.0 | https://github.com/bitflags/bitflags |
| `bitflags` | 2.13.1 | MIT OR Apache-2.0 | https://github.com/bitflags/bitflags |
| `block-buffer` | 0.10.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| `block-padding` | 0.3.3 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| `block2` | 0.6.2 | MIT | https://github.com/madsmtm/objc2 |
| `blocking` | 1.7.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/blocking |
| `brotli` | 8.0.4 | BSD-3-Clause AND MIT | https://github.com/dropbox/rust-brotli |
| `brotli-decompressor` | 5.0.3 | BSD-3-Clause/MIT | https://github.com/dropbox/rust-brotli-decompressor |
| `bs58` | 0.5.1 | MIT/Apache-2.0 | https://github.com/Nullus157/bs58-rs |
| `bumpalo` | 3.20.3 | MIT OR Apache-2.0 | https://github.com/fitzgen/bumpalo |
| `bytemuck` | 1.25.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/Lokathor/bytemuck |
| `byteorder` | 1.5.0 | Unlicense OR MIT | https://github.com/BurntSushi/byteorder |
| `bytes` | 1.12.1 | MIT | https://github.com/tokio-rs/bytes |
| `cairo-rs` | 0.18.5 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `cairo-sys-rs` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `camino` | 1.2.5 | MIT OR Apache-2.0 | https://github.com/camino-rs/camino |
| `cargo_metadata` | 0.19.2 | MIT | https://github.com/oli-obk/cargo_metadata |
| `cargo_toml` | 0.22.3 | Apache-2.0 OR MIT | https://gitlab.com/lib.rs/cargo_toml |
| `cargo-platform` | 0.1.9 | MIT OR Apache-2.0 | https://github.com/rust-lang/cargo |
| `cbc` | 0.1.2 | MIT OR Apache-2.0 | https://github.com/RustCrypto/block-modes |
| `cc` | 1.4.4 | MIT OR Apache-2.0 | https://github.com/rust-lang/cc-rs |
| `cesu8` | 1.1.0 | Apache-2.0/MIT | https://github.com/emk/cesu8-rs |
| `cfb` | 0.7.3 | MIT | https://github.com/mdsteele/rust-cfb |
| `cfg_aliases` | 0.2.2 | MIT | https://github.com/katharostech/cfg_aliases |
| `cfg-expr` | 0.15.8 | MIT OR Apache-2.0 | https://github.com/EmbarkStudios/cfg-expr |
| `cfg-if` | 1.0.4 | MIT OR Apache-2.0 | https://github.com/rust-lang/cfg-if |
| `chacha20` | 0.10.1 | MIT OR Apache-2.0 | https://github.com/RustCrypto/stream-ciphers |
| `chrono` | 0.4.45 | MIT OR Apache-2.0 | https://github.com/chronotope/chrono |
| `cipher` | 0.4.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/traits |
| `combine` | 4.6.7 | MIT | https://github.com/Marwes/combine |
| `concurrent-queue` | 2.5.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/concurrent-queue |
| `cookie` | 0.18.2 | MIT OR Apache-2.0 | https://github.com/SergioBenitez/cookie-rs |
| `core-foundation` | 0.10.1 | MIT OR Apache-2.0 | https://github.com/servo/core-foundation-rs |
| `core-foundation` | 0.9.4 | MIT OR Apache-2.0 | https://github.com/servo/core-foundation-rs |
| `core-foundation-sys` | 0.8.7 | MIT OR Apache-2.0 | https://github.com/servo/core-foundation-rs |
| `core-graphics` | 0.25.0 | MIT OR Apache-2.0 | https://github.com/servo/core-foundation-rs |
| `core-graphics-types` | 0.2.0 | MIT OR Apache-2.0 | https://github.com/servo/core-foundation-rs |
| `cpufeatures` | 0.2.17 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| `cpufeatures` | 0.3.0 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| `crc32fast` | 1.5.1 | MIT OR Apache-2.0 | https://github.com/srijs/rust-crc32fast |
| `crossbeam-channel` | 0.5.16 | MIT OR Apache-2.0 | https://github.com/crossbeam-rs/crossbeam |
| `crossbeam-utils` | 0.8.22 | MIT OR Apache-2.0 | https://github.com/crossbeam-rs/crossbeam |
| `crypto-common` | 0.1.7 | MIT OR Apache-2.0 | https://github.com/RustCrypto/traits |
| `cssparser` | 0.36.0 | MPL-2.0 | https://github.com/servo/rust-cssparser |
| `cssparser-macros` | 0.6.1 | MPL-2.0 | https://github.com/servo/rust-cssparser |
| `ctor` | 0.8.0 | Apache-2.0 OR MIT | https://github.com/mmastrac/rust-ctor |
| `ctor-proc-macro` | 0.0.7 | Apache-2.0 OR MIT | https://github.com/mmastrac/rust-ctor |
| `darling` | 0.23.0 | MIT | https://github.com/TedDriggs/darling |
| `darling_core` | 0.23.0 | MIT | https://github.com/TedDriggs/darling |
| `darling_macro` | 0.23.0 | MIT | https://github.com/TedDriggs/darling |
| `dbus` | 0.9.12 | Apache-2.0/MIT | https://github.com/diwic/dbus-rs |
| `dbus-secret-service` | 4.1.0 | MIT OR Apache-2.0 | https://github.com/brotskydotcom/dbus-secret-service.git |
| `defmt` | 1.1.1 | MIT OR Apache-2.0 | https://github.com/knurling-rs/defmt |
| `defmt-macros` | 1.1.1 | MIT OR Apache-2.0 | https://github.com/knurling-rs/defmt |
| `defmt-parser` | 1.0.0 | MIT OR Apache-2.0 | https://github.com/knurling-rs/defmt |
| `deranged` | 0.5.8 | MIT OR Apache-2.0 | https://github.com/jhpratt/deranged |
| `derive_more` | 2.1.1 | MIT | https://github.com/JelteF/derive_more |
| `derive_more-impl` | 2.1.1 | MIT | https://github.com/JelteF/derive_more |
| `digest` | 0.10.7 | MIT OR Apache-2.0 | https://github.com/RustCrypto/traits |
| `dirs` | 6.0.0 | MIT OR Apache-2.0 | https://github.com/soc/dirs-rs |
| `dirs-sys` | 0.5.0 | MIT OR Apache-2.0 | https://github.com/dirs-dev/dirs-sys-rs |
| `dispatch2` | 0.3.1 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `displaydoc` | 0.2.7 | MIT OR Apache-2.0 | https://github.com/yaahc/displaydoc |
| `dlopen2` | 0.8.2 | MIT | https://github.com/OpenByteDev/dlopen2 |
| `dlopen2_derive` | 0.4.3 | MIT | https://github.com/OpenByteDev/dlopen2 |
| `dom_query` | 0.27.0 | MIT | https://github.com/niklak/dom_query |
| `dpi` | 0.1.2 | Apache-2.0 AND MIT | https://github.com/rust-windowing/winit |
| `dtoa` | 1.0.11 | MIT OR Apache-2.0 | https://github.com/dtolnay/dtoa |
| `dtoa-short` | 0.3.5 | MPL-2.0 | https://github.com/upsuper/dtoa-short |
| `dtor` | 0.3.0 | Apache-2.0 OR MIT | https://github.com/mmastrac/rust-ctor |
| `dtor-proc-macro` | 0.0.6 | Apache-2.0 OR MIT | https://github.com/mmastrac/rust-ctor |
| `dunce` | 1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 | https://gitlab.com/kornelski/dunce |
| `dyn-clone` | 1.0.20 | MIT OR Apache-2.0 | https://github.com/dtolnay/dyn-clone |
| `embed_plist` | 1.2.2 | MIT OR Apache-2.0 | https://github.com/nvzqz/embed-plist-rs |
| `embed-resource` | 3.0.11 | MIT | https://github.com/nabijaczleweli/rust-embed-resource |
| `encoding_rs` | 0.8.35 | (Apache-2.0 OR MIT) AND BSD-3-Clause | https://github.com/hsivonen/encoding_rs |
| `endi` | 1.1.1 | MIT | https://github.com/zeenix/endi |
| `enumflags2` | 0.7.12 | MIT OR Apache-2.0 | https://github.com/meithecatte/enumflags2 |
| `enumflags2_derive` | 0.7.12 | MIT OR Apache-2.0 | https://github.com/meithecatte/enumflags2 |
| `env_filter` | 0.1.4 | MIT OR Apache-2.0 | https://github.com/rust-cli/env_logger |
| `equivalent` | 1.0.2 | Apache-2.0 OR MIT | https://github.com/indexmap-rs/equivalent |
| `erased-serde` | 0.4.10 | MIT OR Apache-2.0 | https://github.com/dtolnay/erased-serde |
| `errno` | 0.3.14 | MIT OR Apache-2.0 | https://github.com/lambda-fairy/rust-errno |
| `event-listener` | 5.4.2 | Apache-2.0 OR MIT | https://github.com/smol-rs/event-listener |
| `event-listener-strategy` | 0.5.4 | Apache-2.0 OR MIT | https://github.com/smol-rs/event-listener-strategy |
| `fallible-iterator` | 0.3.0 | MIT/Apache-2.0 | https://github.com/sfackler/rust-fallible-iterator |
| `fallible-streaming-iterator` | 0.1.9 | MIT/Apache-2.0 | https://github.com/sfackler/fallible-streaming-iterator |
| `fastrand` | 2.5.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/fastrand |
| `fdeflate` | 0.3.7 | MIT OR Apache-2.0 | https://github.com/image-rs/fdeflate |
| `fern` | 0.7.1 | MIT | https://github.com/daboross/fern |
| `field-offset` | 0.3.6 | MIT OR Apache-2.0 | https://github.com/Diggsey/rust-field-offset |
| `find-msvc-tools` | 0.1.11 | MIT OR Apache-2.0 | https://github.com/rust-lang/cc-rs |
| `flate2` | 1.1.9 | MIT OR Apache-2.0 | https://github.com/rust-lang/flate2-rs |
| `fnv` | 1.0.7 | Apache-2.0 / MIT | https://github.com/servo/rust-fnv |
| `foldhash` | 0.2.0 | Zlib | https://github.com/orlp/foldhash |
| `foreign-types` | 0.5.0 | MIT/Apache-2.0 | https://github.com/sfackler/foreign-types |
| `foreign-types-macros` | 0.2.4 | MIT/Apache-2.0 | https://github.com/sfackler/foreign-types |
| `foreign-types-shared` | 0.3.1 | MIT/Apache-2.0 | https://github.com/sfackler/foreign-types |
| `form_urlencoded` | 1.2.2 | MIT OR Apache-2.0 | https://github.com/servo/rust-url |
| `futures-channel` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-core` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-executor` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-io` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-lite` | 2.6.1 | Apache-2.0 OR MIT | https://github.com/smol-rs/futures-lite |
| `futures-macro` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-sink` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-task` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `futures-util` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/futures-rs |
| `gdk` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gdk-pixbuf` | 0.18.5 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `gdk-pixbuf-sys` | 0.18.0 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `gdk-sys` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gdkwayland-sys` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gdkx11` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gdkx11-sys` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `generic-array` | 0.14.7 | MIT | https://github.com/fizyk20/generic-array.git |
| `getrandom` | 0.2.17 | MIT OR Apache-2.0 | https://github.com/rust-random/getrandom |
| `getrandom` | 0.3.4 | MIT OR Apache-2.0 | https://github.com/rust-random/getrandom |
| `getrandom` | 0.4.3 | MIT OR Apache-2.0 | https://github.com/rust-random/getrandom |
| `gio` | 0.18.4 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `gio-sys` | 0.18.1 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `glib` | 0.18.5 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `glib-macros` | 0.18.5 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `glib-sys` | 0.18.1 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `glob` | 0.3.4 | MIT OR Apache-2.0 | https://github.com/rust-lang/glob |
| `gobject-sys` | 0.18.0 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `gtk` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gtk-sys` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `gtk3-macros` | 0.18.2 | MIT | https://github.com/gtk-rs/gtk3-rs |
| `h2` | 0.4.19 | MIT | https://github.com/hyperium/h2 |
| `hashbrown` | 0.12.3 | MIT OR Apache-2.0 | https://github.com/rust-lang/hashbrown |
| `hashbrown` | 0.14.5 | MIT OR Apache-2.0 | https://github.com/rust-lang/hashbrown |
| `hashbrown` | 0.17.1 | MIT OR Apache-2.0 | https://github.com/rust-lang/hashbrown |
| `hashlink` | 0.9.1 | MIT OR Apache-2.0 | https://github.com/kyren/hashlink |
| `heck` | 0.4.1 | MIT OR Apache-2.0 | https://github.com/withoutboats/heck |
| `heck` | 0.5.0 | MIT OR Apache-2.0 | https://github.com/withoutboats/heck |
| `hermit-abi` | 0.5.2 | MIT OR Apache-2.0 | https://github.com/hermit-os/hermit-rs |
| `hex` | 0.4.3 | MIT OR Apache-2.0 | https://github.com/KokaKiwi/rust-hex |
| `hkdf` | 0.12.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/KDFs/ |
| `hmac` | 0.12.1 | MIT OR Apache-2.0 | https://github.com/RustCrypto/MACs |
| `html5ever` | 0.38.0 | MIT OR Apache-2.0 | https://github.com/servo/html5ever |
| `http` | 1.5.0 | MIT OR Apache-2.0 | https://github.com/hyperium/http |
| `http-body` | 1.1.0 | MIT | https://github.com/hyperium/http-body |
| `http-body-util` | 0.1.5 | MIT | https://github.com/hyperium/http-body |
| `http-range` | 0.1.5 | MIT | https://github.com/bancek/rust-http-range.git |
| `httparse` | 1.10.1 | MIT OR Apache-2.0 | https://github.com/seanmonstar/httparse |
| `httpdate` | 1.0.3 | MIT OR Apache-2.0 | https://github.com/pyfisch/httpdate |
| `hyper` | 1.11.0 | MIT | https://github.com/hyperium/hyper |
| `hyper-rustls` | 0.27.9 | Apache-2.0 OR ISC OR MIT | https://github.com/rustls/hyper-rustls |
| `hyper-util` | 0.1.20 | MIT | https://github.com/hyperium/hyper-util |
| `iana-time-zone` | 0.1.65 | MIT OR Apache-2.0 | https://github.com/strawlab/iana-time-zone |
| `iana-time-zone-haiku` | 0.1.2 | MIT OR Apache-2.0 | https://github.com/strawlab/iana-time-zone |
| `ico` | 0.5.0 | MIT | https://github.com/mdsteele/rust-ico |
| `icu_collections` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_locale_core` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_normalizer` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_normalizer_data` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_properties` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_properties_data` | 2.3.0 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `icu_provider` | 2.3.1 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `ident_case` | 1.0.1 | MIT/Apache-2.0 | https://github.com/TedDriggs/ident_case |
| `idna` | 1.1.0 | MIT OR Apache-2.0 | https://github.com/servo/rust-url/ |
| `idna_adapter` | 1.2.2 | Apache-2.0 OR MIT | https://github.com/hsivonen/idna_adapter |
| `indexmap` | 1.9.3 | Apache-2.0 OR MIT | https://github.com/bluss/indexmap |
| `indexmap` | 2.14.0 | Apache-2.0 OR MIT | https://github.com/indexmap-rs/indexmap |
| `infer` | 0.19.0 | MIT | https://github.com/bojand/infer |
| `inout` | 0.1.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| `ipnet` | 2.12.1 | MIT OR Apache-2.0 | https://github.com/krisprice/ipnet |
| `is-docker` | 0.2.0 | MIT | https://github.com/TheLarkInn/is-docker |
| `is-wsl` | 0.4.0 | MIT | https://github.com/TheLarkInn/is-wsl |
| `itoa` | 1.0.18 | MIT OR Apache-2.0 | https://github.com/dtolnay/itoa |
| `javascriptcore-rs` | 1.1.2 | MIT | https://github.com/tauri-apps/javascriptcore-rs |
| `javascriptcore-rs-sys` | 1.1.1 | MIT | https://github.com/tauri-apps/javascriptcore-rs |
| `jiff` | 0.2.35 | Unlicense OR MIT | https://github.com/BurntSushi/jiff |
| `jiff-core` | 0.1.0 | Unlicense OR MIT | https://github.com/BurntSushi/jiff |
| `jiff-static` | 0.2.35 | Unlicense OR MIT | https://github.com/BurntSushi/jiff |
| `jiff-tzdb` | 0.1.8 | Unlicense OR MIT | https://github.com/BurntSushi/jiff |
| `jiff-tzdb-platform` | 0.1.3 | Unlicense OR MIT | https://github.com/BurntSushi/jiff |
| `jni` | 0.21.1 | MIT/Apache-2.0 | https://github.com/jni-rs/jni-rs |
| `jni-sys` | 0.3.1 | MIT OR Apache-2.0 | https://github.com/jni-rs/jni-sys |
| `jni-sys` | 0.4.1 | MIT OR Apache-2.0 | https://github.com/jni-rs/jni-sys |
| `jni-sys-macros` | 0.4.1 | MIT OR Apache-2.0 | https://github.com/jni-rs/jni-sys |
| `js-sys` | 0.3.104 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/js-sys |
| `json-patch` | 3.0.1 | MIT/Apache-2.0 | https://github.com/idubrov/json-patch |
| `jsonptr` | 0.6.3 | MIT OR Apache-2.0 | https://github.com/chanced/jsonptr |
| `keyboard-types` | 0.7.0 | MIT OR Apache-2.0 | https://github.com/pyfisch/keyboard-types |
| `keyring` | 3.6.3 | MIT OR Apache-2.0 | https://github.com/hwchen/keyring-rs.git |
| `libappindicator` | 0.9.0 | Apache-2.0 OR MIT | https://crates.io/crates/libappindicator |
| `libappindicator-sys` | 0.9.0 | Apache-2.0 OR MIT | https://crates.io/crates/libappindicator-sys |
| `libc` | 0.2.189 | MIT OR Apache-2.0 | https://github.com/rust-lang/libc |
| `libdbus-sys` | 0.2.7 | Apache-2.0/MIT | https://github.com/diwic/dbus-rs |
| `libloading` | 0.7.4 | ISC | https://github.com/nagisa/rust_libloading/ |
| `libredox` | 0.1.20 | MIT | https://gitlab.redox-os.org/redox-os/libredox.git |
| `libsqlite3-sys` | 0.28.0 | MIT | https://github.com/rusqlite/rusqlite |
| `linux-raw-sys` | 0.12.1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | https://github.com/sunfishcode/linux-raw-sys |
| `litemap` | 0.8.3 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `lock_api` | 0.4.14 | MIT OR Apache-2.0 | https://github.com/Amanieu/parking_lot |
| `log` | 0.4.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/log |
| `lru-slab` | 0.1.2 | MIT OR Apache-2.0 OR Zlib | https://github.com/Ralith/lru-slab |
| `mac-notification-sys` | 0.6.15 | MIT/Apache-2.0 | https://github.com/h4llow3En/mac-notification-sys |
| `markup5ever` | 0.38.0 | MIT OR Apache-2.0 | https://github.com/servo/html5ever |
| `memchr` | 2.8.3 | Unlicense OR MIT | https://github.com/BurntSushi/memchr |
| `memoffset` | 0.9.1 | MIT | https://github.com/Gilnaa/memoffset |
| `mime` | 0.3.17 | MIT OR Apache-2.0 | https://github.com/hyperium/mime |
| `miniz_oxide` | 0.8.9 | MIT OR Zlib OR Apache-2.0 | https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide |
| `mio` | 1.2.2 | MIT | https://github.com/tokio-rs/mio |
| `muda` | 0.19.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/muda |
| `ndk` | 0.9.0 | MIT OR Apache-2.0 | https://github.com/rust-mobile/ndk |
| `ndk-sys` | 0.6.0+11769913 | MIT OR Apache-2.0 | https://github.com/rust-mobile/ndk |
| `new_debug_unreachable` | 1.0.6 | MIT | https://github.com/mbrubeck/rust-debug-unreachable |
| `nix` | 0.29.0 | MIT | https://github.com/nix-rust/nix |
| `notify-rust` | 4.18.0 | MIT OR Apache-2.0 | https://github.com/hoodie/notify-rust |
| `num` | 0.4.3 | MIT OR Apache-2.0 | https://github.com/rust-num/num |
| `num_enum` | 0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 | https://github.com/illicitonion/num_enum |
| `num_enum_derive` | 0.7.6 | BSD-3-Clause OR MIT OR Apache-2.0 | https://github.com/illicitonion/num_enum |
| `num_threads` | 0.1.7 | MIT OR Apache-2.0 | https://github.com/jhpratt/num_threads |
| `num-bigint` | 0.4.8 | MIT OR Apache-2.0 | https://github.com/rust-num/num-bigint |
| `num-complex` | 0.4.6 | MIT OR Apache-2.0 | https://github.com/rust-num/num-complex |
| `num-conv` | 0.2.2 | MIT OR Apache-2.0 | https://github.com/jhpratt/num-conv |
| `num-integer` | 0.1.47 | MIT OR Apache-2.0 | https://github.com/rust-num/num-integer |
| `num-iter` | 0.1.46 | MIT OR Apache-2.0 | https://github.com/rust-num/num-iter |
| `num-rational` | 0.4.2 | MIT OR Apache-2.0 | https://github.com/rust-num/num-rational |
| `num-traits` | 0.2.19 | MIT OR Apache-2.0 | https://github.com/rust-num/num-traits |
| `objc2` | 0.6.4 | MIT | https://github.com/madsmtm/objc2 |
| `objc2-app-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-cloud-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-data` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-foundation` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-graphics` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-image` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-location` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-core-text` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-encode` | 4.1.0 | MIT | https://github.com/madsmtm/objc2 |
| `objc2-exception-helper` | 0.1.1 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-foundation` | 0.3.2 | MIT | https://github.com/madsmtm/objc2 |
| `objc2-io-surface` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-quartz-core` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-ui-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-user-notifications` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `objc2-web-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/madsmtm/objc2 |
| `once_cell` | 1.21.4 | MIT OR Apache-2.0 | https://github.com/matklad/once_cell |
| `open` | 5.4.2 | MIT | https://github.com/Byron/open-rs |
| `openssl-probe` | 0.2.1 | MIT OR Apache-2.0 | https://github.com/rustls/openssl-probe |
| `option-ext` | 0.2.0 | MPL-2.0 | https://github.com/soc/option-ext.git |
| `ordered-stream` | 0.2.0 | MIT OR Apache-2.0 | https://github.com/danieldg/ordered-stream |
| `os_pipe` | 1.2.3 | MIT | https://github.com/oconnor663/os_pipe.rs |
| `pango` | 0.18.3 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `pango-sys` | 0.18.0 | MIT | https://github.com/gtk-rs/gtk-rs-core |
| `parking` | 2.2.1 | Apache-2.0 OR MIT | https://github.com/smol-rs/parking |
| `parking_lot` | 0.12.5 | MIT OR Apache-2.0 | https://github.com/Amanieu/parking_lot |
| `parking_lot_core` | 0.9.12 | MIT OR Apache-2.0 | https://github.com/Amanieu/parking_lot |
| `percent-encoding` | 2.3.2 | MIT OR Apache-2.0 | https://github.com/servo/rust-url/ |
| `phf` | 0.13.1 | MIT | https://github.com/rust-phf/rust-phf |
| `phf_codegen` | 0.13.1 | MIT | https://github.com/rust-phf/rust-phf |
| `phf_generator` | 0.13.1 | MIT | https://github.com/rust-phf/rust-phf |
| `phf_macros` | 0.13.1 | MIT | https://github.com/rust-phf/rust-phf |
| `phf_shared` | 0.13.1 | MIT | https://github.com/rust-phf/rust-phf |
| `pin-project-lite` | 0.2.17 | Apache-2.0 OR MIT | https://github.com/taiki-e/pin-project-lite |
| `piper` | 0.2.5 | MIT OR Apache-2.0 | https://github.com/smol-rs/piper |
| `pkg-config` | 0.3.34 | MIT OR Apache-2.0 | https://github.com/rust-lang/pkg-config-rs |
| `plist` | 1.10.0 | MIT | https://github.com/ebarnard/rust-plist/ |
| `png` | 0.17.16 | MIT OR Apache-2.0 | https://github.com/image-rs/image-png |
| `png` | 0.18.1 | MIT OR Apache-2.0 | https://github.com/image-rs/image-png |
| `polling` | 3.11.0 | Apache-2.0 OR MIT | https://github.com/smol-rs/polling |
| `portable-atomic` | 1.15.0 | Apache-2.0 OR MIT | https://github.com/taiki-e/portable-atomic |
| `portable-atomic-util` | 0.2.7 | Apache-2.0 OR MIT | https://github.com/taiki-e/portable-atomic-util |
| `potential_utf` | 0.1.6 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `powerfmt` | 0.2.0 | MIT OR Apache-2.0 | https://github.com/jhpratt/powerfmt |
| `ppv-lite86` | 0.2.21 | MIT OR Apache-2.0 | https://github.com/cryptocorrosion/cryptocorrosion |
| `precomputed-hash` | 0.1.1 | MIT | https://github.com/emilio/precomputed-hash |
| `proc-macro-crate` | 1.3.1 | MIT OR Apache-2.0 | https://github.com/bkchr/proc-macro-crate |
| `proc-macro-crate` | 2.0.2 | MIT OR Apache-2.0 | https://github.com/bkchr/proc-macro-crate |
| `proc-macro-crate` | 3.5.0 | MIT OR Apache-2.0 | https://github.com/bkchr/proc-macro-crate |
| `proc-macro-error` | 1.0.4 | MIT OR Apache-2.0 | https://gitlab.com/CreepySkeleton/proc-macro-error |
| `proc-macro-error-attr` | 1.0.4 | MIT OR Apache-2.0 | https://gitlab.com/CreepySkeleton/proc-macro-error |
| `proc-macro2` | 1.0.107 | MIT OR Apache-2.0 | https://github.com/dtolnay/proc-macro2 |
| `quick-xml` | 0.41.0 | MIT | https://github.com/tafia/quick-xml |
| `quinn` | 0.11.11 | MIT OR Apache-2.0 | https://github.com/quinn-rs/quinn |
| `quinn-proto` | 0.11.17 | MIT OR Apache-2.0 | https://github.com/quinn-rs/quinn |
| `quinn-udp` | 0.5.15 | MIT OR Apache-2.0 | https://github.com/quinn-rs/quinn |
| `quote` | 1.0.47 | MIT OR Apache-2.0 | https://github.com/dtolnay/quote |
| `r-efi` | 5.3.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later | https://github.com/r-efi/r-efi |
| `r-efi` | 6.0.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later | https://github.com/r-efi/r-efi |
| `rand` | 0.10.2 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand` | 0.8.8 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand` | 0.9.5 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand_chacha` | 0.3.1 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand_chacha` | 0.9.0 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand_core` | 0.10.1 | MIT OR Apache-2.0 | https://github.com/rust-random/rand_core |
| `rand_core` | 0.6.4 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand_core` | 0.9.5 | MIT OR Apache-2.0 | https://github.com/rust-random/rand |
| `rand_pcg` | 0.10.2 | MIT OR Apache-2.0 | https://github.com/rust-random/rngs |
| `raw-window-handle` | 0.6.2 | MIT OR Apache-2.0 OR Zlib | https://github.com/rust-windowing/raw-window-handle |
| `redox_syscall` | 0.5.18 | MIT | https://gitlab.redox-os.org/redox-os/syscall |
| `redox_users` | 0.5.2 | MIT | https://gitlab.redox-os.org/redox-os/users |
| `ref-cast` | 1.0.27 | MIT OR Apache-2.0 | https://github.com/dtolnay/ref-cast |
| `ref-cast-impl` | 1.0.27 | MIT OR Apache-2.0 | https://github.com/dtolnay/ref-cast |
| `regex` | 1.13.1 | MIT OR Apache-2.0 | https://github.com/rust-lang/regex |
| `regex-automata` | 0.4.18 | MIT OR Apache-2.0 | https://github.com/rust-lang/regex |
| `regex-syntax` | 0.8.11 | MIT OR Apache-2.0 | https://github.com/rust-lang/regex |
| `reqwest` | 0.12.28 | MIT OR Apache-2.0 | https://github.com/seanmonstar/reqwest |
| `reqwest` | 0.13.4 | MIT OR Apache-2.0 | https://github.com/seanmonstar/reqwest |
| `rfd` | 0.16.0 | MIT | https://github.com/PolyMeilex/rfd |
| `ring` | 0.17.14 | Apache-2.0 AND ISC | https://github.com/briansmith/ring |
| `rusqlite` | 0.31.0 | MIT | https://github.com/rusqlite/rusqlite |
| `rustc_version` | 0.4.1 | MIT OR Apache-2.0 | https://github.com/djc/rustc-version-rs |
| `rustc-hash` | 2.1.3 | Apache-2.0 OR MIT | https://github.com/rust-lang/rustc-hash |
| `rustix` | 1.1.4 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | https://github.com/bytecodealliance/rustix |
| `rustls` | 0.23.43 | Apache-2.0 OR ISC OR MIT | https://github.com/rustls/rustls |
| `rustls-native-certs` | 0.8.4 | Apache-2.0 OR ISC OR MIT | https://github.com/rustls/rustls-native-certs |
| `rustls-pki-types` | 1.15.1 | MIT OR Apache-2.0 | https://github.com/rustls/pki-types |
| `rustls-webpki` | 0.103.15 | ISC | https://github.com/rustls/webpki |
| `rustversion` | 1.0.23 | MIT OR Apache-2.0 | https://github.com/dtolnay/rustversion |
| `ryu` | 1.0.23 | Apache-2.0 OR BSL-1.0 | https://github.com/dtolnay/ryu |
| `same-file` | 1.0.6 | Unlicense/MIT | https://github.com/BurntSushi/same-file |
| `schannel` | 0.1.29 | MIT | https://github.com/steffengy/schannel-rs |
| `schemars` | 0.8.22 | MIT | https://github.com/GREsau/schemars |
| `schemars` | 0.9.0 | MIT | https://github.com/GREsau/schemars |
| `schemars` | 1.2.2 | MIT | https://github.com/GREsau/schemars |
| `schemars_derive` | 0.8.22 | MIT | https://github.com/GREsau/schemars |
| `scopeguard` | 1.2.0 | MIT OR Apache-2.0 | https://github.com/bluss/scopeguard |
| `secret-service` | 4.0.0 | MIT OR Apache-2.0 | https://github.com/hwchen/secret-service-rs.git |
| `security-framework` | 2.11.1 | MIT OR Apache-2.0 | https://github.com/kornelski/rust-security-framework |
| `security-framework` | 3.7.0 | MIT OR Apache-2.0 | https://github.com/kornelski/rust-security-framework |
| `security-framework-sys` | 2.17.0 | MIT OR Apache-2.0 | https://github.com/kornelski/rust-security-framework |
| `selectors` | 0.36.1 | MPL-2.0 | https://github.com/servo/stylo |
| `semver` | 1.0.28 | MIT OR Apache-2.0 | https://github.com/dtolnay/semver |
| `serde` | 1.0.229 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| `serde_core` | 1.0.229 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| `serde_derive` | 1.0.229 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| `serde_derive_internals` | 0.29.1 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| `serde_json` | 1.0.151 | MIT OR Apache-2.0 | https://github.com/serde-rs/json |
| `serde_repr` | 0.1.21 | MIT OR Apache-2.0 | https://github.com/dtolnay/serde-repr |
| `serde_spanned` | 0.6.9 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `serde_spanned` | 1.1.1 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `serde_urlencoded` | 0.7.1 | MIT/Apache-2.0 | https://github.com/nox/serde_urlencoded |
| `serde_with` | 3.22.0 | MIT OR Apache-2.0 | https://github.com/jonasbb/serde_with/ |
| `serde_with_macros` | 3.22.0 | MIT OR Apache-2.0 | https://github.com/jonasbb/serde_with/ |
| `serde-untagged` | 0.1.9 | MIT OR Apache-2.0 | https://github.com/dtolnay/serde-untagged |
| `serialize-to-javascript` | 0.1.2 | MIT OR Apache-2.0 | https://github.com/chippers/serialize-to-javascript |
| `serialize-to-javascript-impl` | 0.1.2 | MIT OR Apache-2.0 | https://github.com/chippers/serialize-to-javascript |
| `servo_arc` | 0.4.3 | MIT OR Apache-2.0 | https://github.com/servo/stylo |
| `sha1` | 0.10.7 | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |
| `sha2` | 0.10.9 | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |
| `shared_child` | 1.1.1 | MIT | https://github.com/oconnor663/shared_child.rs |
| `shlex` | 2.0.1 | MIT OR Apache-2.0 | https://github.com/comex/rust-shlex |
| `sigchld` | 0.2.4 | MIT | https://github.com/oconnor663/sigchld.rs |
| `signal-hook` | 0.3.18 | Apache-2.0/MIT | https://github.com/vorner/signal-hook |
| `signal-hook-registry` | 1.4.8 | MIT OR Apache-2.0 | https://github.com/vorner/signal-hook |
| `simd-adler32` | 0.3.10 | MIT | https://github.com/mcountryman/simd-adler32 |
| `siphasher` | 1.0.3 | MIT/Apache-2.0 | https://github.com/jedisct1/rust-siphash |
| `slab` | 0.4.12 | MIT | https://github.com/tokio-rs/slab |
| `smallvec` | 1.15.2 | MIT OR Apache-2.0 | https://github.com/servo/rust-smallvec |
| `socket2` | 0.6.5 | MIT OR Apache-2.0 | https://github.com/rust-lang/socket2 |
| `softbuffer` | 0.4.8 | MIT OR Apache-2.0 | https://github.com/rust-windowing/softbuffer |
| `soup3` | 0.5.0 | MIT | https://gitlab.gnome.org/World/Rust/soup3-rs |
| `soup3-sys` | 0.5.0 | MIT | https://gitlab.gnome.org/World/Rust/soup3-rs |
| `stable_deref_trait` | 1.2.1 | MIT OR Apache-2.0 | https://github.com/storyyeller/stable_deref_trait |
| `static_assertions` | 1.1.0 | MIT OR Apache-2.0 | https://github.com/nvzqz/static-assertions-rs |
| `string_cache` | 0.9.0 | MIT OR Apache-2.0 | https://github.com/servo/string-cache |
| `string_cache_codegen` | 0.6.1 | MIT OR Apache-2.0 | https://github.com/servo/string-cache |
| `strsim` | 0.11.1 | MIT | https://github.com/rapidfuzz/strsim-rs |
| `subtle` | 2.6.1 | BSD-3-Clause | https://github.com/dalek-cryptography/subtle |
| `swift-rs` | 1.0.8 | MIT OR Apache-2.0 | https://github.com/Brendonovich/swift-rs |
| `syn` | 1.0.109 | MIT OR Apache-2.0 | https://github.com/dtolnay/syn |
| `syn` | 2.0.119 | MIT OR Apache-2.0 | https://github.com/dtolnay/syn |
| `syn` | 3.0.4 | MIT OR Apache-2.0 | https://github.com/dtolnay/syn |
| `sync_wrapper` | 1.0.2 | Apache-2.0 | https://github.com/Actyx/sync_wrapper |
| `synstructure` | 0.13.2 | MIT | https://github.com/mystor/synstructure |
| `system-deps` | 6.2.2 | MIT OR Apache-2.0 | https://github.com/gdesmott/system-deps |
| `tao` | 0.35.3 | Apache-2.0 | https://github.com/tauri-apps/tao |
| `tao-macros` | 0.1.4 | MIT OR Apache-2.0 | https://github.com/tauri-apps/tao |
| `target-lexicon` | 0.12.16 | Apache-2.0 WITH LLVM-exception | https://github.com/bytecodealliance/target-lexicon |
| `tauri` | 2.11.5 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-build` | 2.6.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-codegen` | 2.6.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-macros` | 2.6.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-plugin` | 2.6.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-plugin-dialog` | 2.7.2 | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-plugin-fs` | 2.5.1 | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-plugin-log` | 2.9.0 | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-plugin-notification` | 2.3.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-plugin-shell` | 2.3.5 | Apache-2.0 OR MIT | https://github.com/tauri-apps/plugins-workspace |
| `tauri-runtime` | 2.11.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-runtime-wry` | 2.11.4 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-utils` | 2.9.3 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| `tauri-winres` | 0.3.6 | MIT | https://github.com/tauri-apps/winres |
| `tauri-winrt-notification` | 0.7.3 | MIT OR Apache-2.0 | https://github.com/tauri-apps/winrt-notification |
| `tempfile` | 3.27.0 | MIT OR Apache-2.0 | https://github.com/Stebalien/tempfile |
| `tendril` | 0.5.1 | MIT OR Apache-2.0 | https://github.com/servo/html5ever |
| `thiserror` | 1.0.69 | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror |
| `thiserror` | 2.0.20 | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror |
| `thiserror-impl` | 1.0.69 | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror |
| `thiserror-impl` | 2.0.20 | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror |
| `time` | 0.3.55 | MIT OR Apache-2.0 | https://github.com/time-rs/time |
| `time-core` | 0.1.9 | MIT OR Apache-2.0 | https://github.com/time-rs/time |
| `time-macros` | 0.2.32 | MIT OR Apache-2.0 | https://github.com/time-rs/time |
| `tinystr` | 0.8.4 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `tinyvec` | 1.12.0 | Zlib OR Apache-2.0 OR MIT | https://github.com/Lokathor/tinyvec |
| `tinyvec_macros` | 0.1.1 | MIT OR Apache-2.0 OR Zlib | https://github.com/Soveu/tinyvec_macros |
| `tokio` | 1.53.1 | MIT | https://github.com/tokio-rs/tokio |
| `tokio-macros` | 2.7.2 | MIT | https://github.com/tokio-rs/tokio |
| `tokio-rustls` | 0.26.4 | MIT OR Apache-2.0 | https://github.com/rustls/tokio-rustls |
| `tokio-util` | 0.7.19 | MIT | https://github.com/tokio-rs/tokio |
| `toml` | 0.8.2 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml` | 0.9.12+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml` | 1.1.4+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_datetime` | 0.6.3 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_datetime` | 0.7.5+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_datetime` | 1.1.1+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_edit` | 0.19.15 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_edit` | 0.20.2 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_edit` | 0.25.13+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_parser` | 1.1.3+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `toml_writer` | 1.1.2+spec-1.1.0 | MIT OR Apache-2.0 | https://github.com/toml-rs/toml |
| `tower` | 0.5.3 | MIT | https://github.com/tower-rs/tower |
| `tower-http` | 0.6.11 | MIT | https://github.com/tower-rs/tower-http |
| `tower-layer` | 0.3.3 | MIT | https://github.com/tower-rs/tower |
| `tower-service` | 0.3.3 | MIT | https://github.com/tower-rs/tower |
| `tracing` | 0.1.44 | MIT | https://github.com/tokio-rs/tracing |
| `tracing-attributes` | 0.1.31 | MIT | https://github.com/tokio-rs/tracing |
| `tracing-core` | 0.1.36 | MIT | https://github.com/tokio-rs/tracing |
| `tray-icon` | 0.24.2 | MIT OR Apache-2.0 | https://github.com/tauri-apps/tray-icon |
| `try-lock` | 0.2.5 | MIT | https://github.com/seanmonstar/try-lock |
| `typeid` | 1.0.3 | MIT OR Apache-2.0 | https://github.com/dtolnay/typeid |
| `typenum` | 1.20.1 | MIT OR Apache-2.0 | https://github.com/paholg/typenum |
| `uds_windows` | 1.2.1 | MIT | https://github.com/haraldh/rust_uds_windows |
| `unic-char-property` | 0.9.0 | MIT/Apache-2.0 | https://github.com/open-i18n/rust-unic/ |
| `unic-char-range` | 0.9.0 | MIT/Apache-2.0 | https://github.com/open-i18n/rust-unic/ |
| `unic-common` | 0.9.0 | MIT/Apache-2.0 | https://github.com/open-i18n/rust-unic/ |
| `unic-ucd-ident` | 0.9.0 | MIT/Apache-2.0 | https://github.com/open-i18n/rust-unic/ |
| `unic-ucd-version` | 0.9.0 | MIT/Apache-2.0 | https://github.com/open-i18n/rust-unic/ |
| `unicode-ident` | 1.0.24 | (MIT OR Apache-2.0) AND Unicode-3.0 | https://github.com/dtolnay/unicode-ident |
| `unicode-segmentation` | 1.13.3 | MIT OR Apache-2.0 | https://github.com/unicode-rs/unicode-segmentation |
| `untrusted` | 0.9.0 | ISC | https://github.com/briansmith/untrusted |
| `url` | 2.5.8 | MIT OR Apache-2.0 | https://github.com/servo/rust-url |
| `urlpattern` | 0.3.0 | MIT | https://github.com/denoland/rust-urlpattern |
| `utf8_iter` | 1.0.4 | Apache-2.0 OR MIT | https://github.com/hsivonen/utf8_iter |
| `uuid` | 1.25.0 | Apache-2.0 OR MIT | https://github.com/uuid-rs/uuid |
| `vcpkg` | 0.2.15 | MIT/Apache-2.0 | https://github.com/mcgoo/vcpkg-rs |
| `version_check` | 0.9.5 | MIT/Apache-2.0 | https://github.com/SergioBenitez/version_check |
| `version-compare` | 0.2.1 | MIT | https://gitlab.com/timvisee/version-compare |
| `vswhom` | 0.1.0 | MIT | https://github.com/nabijaczleweli/vswhom.rs |
| `vswhom-sys` | 0.1.3 | MIT | https://github.com/nabijaczleweli/vswhom-sys.rs |
| `walkdir` | 2.5.0 | Unlicense/MIT | https://github.com/BurntSushi/walkdir |
| `want` | 0.3.1 | MIT | https://github.com/seanmonstar/want |
| `wasi` | 0.11.1+wasi-snapshot-preview1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | https://github.com/bytecodealliance/wasi |
| `wasip2` | 1.0.4+wasi-0.2.12 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | https://github.com/bytecodealliance/wasi-rs |
| `wasm-bindgen` | 0.2.127 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen |
| `wasm-bindgen-futures` | 0.4.77 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/futures |
| `wasm-bindgen-macro` | 0.2.127 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro |
| `wasm-bindgen-macro-support` | 0.2.127 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro-support |
| `wasm-bindgen-shared` | 0.2.127 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/shared |
| `wasm-streams` | 0.4.2 | MIT OR Apache-2.0 | https://github.com/MattiasBuelens/wasm-streams/ |
| `wasm-streams` | 0.5.0 | MIT OR Apache-2.0 | https://github.com/MattiasBuelens/wasm-streams/ |
| `web_atoms` | 0.2.6 | MIT OR Apache-2.0 | https://github.com/servo/html5ever |
| `web-sys` | 0.3.104 | MIT OR Apache-2.0 | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/web-sys |
| `web-time` | 1.1.0 | MIT OR Apache-2.0 | https://github.com/daxpedda/web-time |
| `webkit2gtk` | 2.0.2 | MIT | https://github.com/tauri-apps/webkit2gtk-rs |
| `webkit2gtk-sys` | 2.0.2 | MIT | https://github.com/tauri-apps/webkit2gtk-rs |
| `webview2-com` | 0.38.2 | MIT | https://github.com/wravery/webview2-rs |
| `webview2-com-macros` | 0.8.1 | MIT | https://github.com/wravery/webview2-rs |
| `webview2-com-sys` | 0.38.2 | MIT | https://github.com/wravery/webview2-rs |
| `winapi` | 0.3.9 | MIT/Apache-2.0 | https://github.com/retep998/winapi-rs |
| `winapi-i686-pc-windows-gnu` | 0.4.0 | MIT/Apache-2.0 | https://github.com/retep998/winapi-rs |
| `winapi-util` | 0.1.11 | Unlicense OR MIT | https://github.com/BurntSushi/winapi-util |
| `winapi-x86_64-pc-windows-gnu` | 0.4.0 | MIT/Apache-2.0 | https://github.com/retep998/winapi-rs |
| `window-vibrancy` | 0.6.0 | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri-plugin-vibrancy |
| `windows` | 0.61.3 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_gnullvm` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_gnullvm` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_gnullvm` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_msvc` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_msvc` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_aarch64_msvc` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_gnu` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_gnu` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_gnu` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_gnullvm` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_gnullvm` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_msvc` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_msvc` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_i686_msvc` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnu` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnu` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnu` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnullvm` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnullvm` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_gnullvm` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_msvc` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_msvc` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows_x86_64_msvc` | 0.53.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-collections` | 0.2.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-core` | 0.61.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-core` | 0.62.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-future` | 0.2.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-implement` | 0.60.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-interface` | 0.59.3 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-link` | 0.1.3 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-link` | 0.2.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-numerics` | 0.2.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-result` | 0.3.4 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-result` | 0.4.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-strings` | 0.4.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-strings` | 0.5.1 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-sys` | 0.45.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-sys` | 0.52.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-sys` | 0.59.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-sys` | 0.60.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-sys` | 0.61.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-targets` | 0.42.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-targets` | 0.52.6 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-targets` | 0.53.5 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-threading` | 0.1.0 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `windows-version` | 0.1.7 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs |
| `winnow` | 0.5.40 | MIT | https://github.com/winnow-rs/winnow |
| `winnow` | 0.7.15 | MIT | https://github.com/winnow-rs/winnow |
| `winnow` | 1.0.4 | MIT | https://github.com/winnow-rs/winnow |
| `winreg` | 0.55.0 | MIT | https://github.com/gentoo90/winreg-rs |
| `wit-bindgen` | 0.57.1 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | https://github.com/bytecodealliance/wit-bindgen |
| `writeable` | 0.6.4 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `wry` | 0.55.1 | Apache-2.0 OR MIT | https://github.com/tauri-apps/wry |
| `x11` | 2.21.0 | MIT | https://github.com/AltF02/x11-rs.git |
| `x11-dl` | 2.21.0 | MIT | https://github.com/AltF02/x11-rs.git |
| `xdg-home` | 1.3.0 | MIT | https://github.com/zeenix/xdg-home |
| `yoke` | 0.8.3 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `yoke-derive` | 0.8.2 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zbus` | 4.4.0 | MIT | https://github.com/dbus2/zbus/ |
| `zbus` | 5.19.0 | MIT | https://github.com/z-galaxy/zbus/ |
| `zbus_macros` | 4.4.0 | MIT | https://github.com/dbus2/zbus/ |
| `zbus_macros` | 5.19.0 | MIT | https://github.com/z-galaxy/zbus/ |
| `zbus_names` | 3.0.0 | MIT | https://github.com/dbus2/zbus/ |
| `zbus_names` | 4.3.4 | MIT | https://github.com/z-galaxy/zbus/ |
| `zcheapstr` | 1.1.0 | MIT | https://github.com/z-galaxy/zcheapstr/ |
| `zerocopy` | 0.8.56 | BSD-2-Clause OR Apache-2.0 OR MIT | https://github.com/google/zerocopy |
| `zerocopy-derive` | 0.8.56 | BSD-2-Clause OR Apache-2.0 OR MIT | https://github.com/google/zerocopy |
| `zerofrom` | 0.1.8 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zerofrom-derive` | 0.1.7 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zeroize` | 1.9.0 | Apache-2.0 OR MIT | https://github.com/RustCrypto/utils |
| `zeroize_derive` | 1.5.0 | Apache-2.0 OR MIT | https://github.com/RustCrypto/utils |
| `zerotrie` | 0.2.5 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zerovec` | 0.11.8 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zerovec-derive` | 0.11.6 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| `zmij` | 1.0.23 | MIT | https://github.com/dtolnay/zmij |
| `zvariant` | 4.2.0 | MIT | https://github.com/dbus2/zbus/ |
| `zvariant` | 5.15.0 | MIT | https://github.com/z-galaxy/zbus/ |
| `zvariant_derive` | 4.2.0 | MIT | https://github.com/dbus2/zbus/ |
| `zvariant_derive` | 5.15.0 | MIT | https://github.com/z-galaxy/zbus/ |
| `zvariant_utils` | 2.1.0 | MIT | https://github.com/dbus2/zbus/ |
| `zvariant_utils` | 4.2.0 | MIT | https://github.com/z-galaxy/zbus/ |

## npm packages

Production dependencies of the frontend.

| Package | Version | Licence | Source |
|---|---|---|---|
| `@babel/code-frame` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/code-frame |
| `@babel/compat-data` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/compat-data |
| `@babel/core` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/core |
| `@babel/generator` | 7.29.8 | MIT | https://www.npmjs.com/package/@babel/generator |
| `@babel/helper-annotate-as-pure` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-annotate-as-pure |
| `@babel/helper-compilation-targets` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-compilation-targets |
| `@babel/helper-create-class-features-plugin` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-create-class-features-plugin |
| `@babel/helper-globals` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-globals |
| `@babel/helper-member-expression-to-functions` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-member-expression-to-functions |
| `@babel/helper-module-imports` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-module-imports |
| `@babel/helper-module-transforms` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-module-transforms |
| `@babel/helper-optimise-call-expression` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-optimise-call-expression |
| `@babel/helper-plugin-utils` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-plugin-utils |
| `@babel/helper-replace-supers` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-replace-supers |
| `@babel/helper-skip-transparent-expression-wrappers` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-skip-transparent-expression-wrappers |
| `@babel/helper-string-parser` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-string-parser |
| `@babel/helper-validator-identifier` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-validator-identifier |
| `@babel/helper-validator-option` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helper-validator-option |
| `@babel/helpers` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/helpers |
| `@babel/parser` | 7.29.8 | MIT | https://www.npmjs.com/package/@babel/parser |
| `@babel/plugin-syntax-jsx` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/plugin-syntax-jsx |
| `@babel/plugin-syntax-typescript` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/plugin-syntax-typescript |
| `@babel/plugin-transform-modules-commonjs` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/plugin-transform-modules-commonjs |
| `@babel/plugin-transform-typescript` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/plugin-transform-typescript |
| `@babel/preset-typescript` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/preset-typescript |
| `@babel/runtime` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/runtime |
| `@babel/template` | 7.29.7 | MIT | https://www.npmjs.com/package/@babel/template |
| `@babel/traverse` | 7.29.8 | MIT | https://www.npmjs.com/package/@babel/traverse |
| `@babel/types` | 7.29.8 | MIT | https://www.npmjs.com/package/@babel/types |
| `@base-ui/react` | 1.7.0 | MIT | https://www.npmjs.com/package/@base-ui/react |
| `@base-ui/utils` | 0.3.2 | MIT | https://www.npmjs.com/package/@base-ui/utils |
| `@dotenvx/dotenvx` | 1.75.1 | BSD-3-Clause | https://www.npmjs.com/package/@dotenvx/dotenvx |
| `@dotenvx/primitives` | 0.8.0 | BSD-3-Clause | https://www.npmjs.com/package/@dotenvx/primitives |
| `@floating-ui/core` | 1.8.0 | MIT | https://www.npmjs.com/package/@floating-ui/core |
| `@floating-ui/dom` | 1.8.0 | MIT | https://www.npmjs.com/package/@floating-ui/dom |
| `@floating-ui/react-dom` | 2.1.9 | MIT | https://www.npmjs.com/package/@floating-ui/react-dom |
| `@floating-ui/utils` | 0.2.12 | MIT | https://www.npmjs.com/package/@floating-ui/utils |
| `@fontsource-variable/geist` | 5.3.0 | OFL-1.1 | https://www.npmjs.com/package/@fontsource-variable/geist |
| `@hono/node-server` | 2.1.1 | MIT | https://www.npmjs.com/package/@hono/node-server |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT | https://www.npmjs.com/package/@jridgewell/gen-mapping |
| `@jridgewell/remapping` | 2.3.5 | MIT | https://www.npmjs.com/package/@jridgewell/remapping |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT | https://www.npmjs.com/package/@jridgewell/resolve-uri |
| `@jridgewell/sourcemap-codec` | 1.5.5 | MIT | https://www.npmjs.com/package/@jridgewell/sourcemap-codec |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT | https://www.npmjs.com/package/@jridgewell/trace-mapping |
| `@mediapipe/tasks-vision` | 0.10.17 | Apache-2.0 | https://www.npmjs.com/package/@mediapipe/tasks-vision |
| `@modelcontextprotocol/sdk` | 1.30.0 | MIT | https://www.npmjs.com/package/@modelcontextprotocol/sdk |
| `@monogrid/gainmap-js` | 3.4.0 | MIT | https://www.npmjs.com/package/@monogrid/gainmap-js |
| `@nodelib/fs.scandir` | 2.1.5 | MIT | https://www.npmjs.com/package/@nodelib/fs.scandir |
| `@nodelib/fs.stat` | 2.0.5 | MIT | https://www.npmjs.com/package/@nodelib/fs.stat |
| `@nodelib/fs.walk` | 1.2.8 | MIT | https://www.npmjs.com/package/@nodelib/fs.walk |
| `@radix-ui/primitive` | 1.1.7 | MIT | https://www.npmjs.com/package/@radix-ui/primitive |
| `@radix-ui/react-compose-refs` | 1.1.5 | MIT | https://www.npmjs.com/package/@radix-ui/react-compose-refs |
| `@radix-ui/react-context` | 1.2.2 | MIT | https://www.npmjs.com/package/@radix-ui/react-context |
| `@radix-ui/react-dialog` | 1.1.23 | MIT | https://www.npmjs.com/package/@radix-ui/react-dialog |
| `@radix-ui/react-dismissable-layer` | 1.1.19 | MIT | https://www.npmjs.com/package/@radix-ui/react-dismissable-layer |
| `@radix-ui/react-focus-guards` | 1.1.6 | MIT | https://www.npmjs.com/package/@radix-ui/react-focus-guards |
| `@radix-ui/react-focus-scope` | 1.1.16 | MIT | https://www.npmjs.com/package/@radix-ui/react-focus-scope |
| `@radix-ui/react-id` | 1.1.4 | MIT | https://www.npmjs.com/package/@radix-ui/react-id |
| `@radix-ui/react-portal` | 1.1.17 | MIT | https://www.npmjs.com/package/@radix-ui/react-portal |
| `@radix-ui/react-presence` | 1.1.10 | MIT | https://www.npmjs.com/package/@radix-ui/react-presence |
| `@radix-ui/react-primitive` | 2.1.10 | MIT | https://www.npmjs.com/package/@radix-ui/react-primitive |
| `@radix-ui/react-slot` | 1.3.3 | MIT | https://www.npmjs.com/package/@radix-ui/react-slot |
| `@radix-ui/react-use-callback-ref` | 1.1.4 | MIT | https://www.npmjs.com/package/@radix-ui/react-use-callback-ref |
| `@radix-ui/react-use-controllable-state` | 1.2.6 | MIT | https://www.npmjs.com/package/@radix-ui/react-use-controllable-state |
| `@radix-ui/react-use-effect-event` | 0.0.5 | MIT | https://www.npmjs.com/package/@radix-ui/react-use-effect-event |
| `@radix-ui/react-use-layout-effect` | 1.1.4 | MIT | https://www.npmjs.com/package/@radix-ui/react-use-layout-effect |
| `@react-three/drei` | 10.7.8 | MIT | https://www.npmjs.com/package/@react-three/drei |
| `@react-three/fiber` | 9.7.0 | MIT | https://www.npmjs.com/package/@react-three/fiber |
| `@sec-ant/readable-stream` | 0.4.1 | MIT | https://www.npmjs.com/package/@sec-ant/readable-stream |
| `@sindresorhus/merge-streams` | 4.0.0 | MIT | https://www.npmjs.com/package/@sindresorhus/merge-streams |
| `@tanstack/query-core` | 5.102.3 | MIT | https://www.npmjs.com/package/@tanstack/query-core |
| `@tanstack/query-devtools` | 5.102.3 | MIT | https://www.npmjs.com/package/@tanstack/query-devtools |
| `@tanstack/react-query` | 5.102.3 | MIT | https://www.npmjs.com/package/@tanstack/react-query |
| `@tanstack/react-query-devtools` | 5.102.3 | MIT | https://www.npmjs.com/package/@tanstack/react-query-devtools |
| `@tauri-apps/api` | 2.11.1 | Apache-2.0 OR MIT | https://www.npmjs.com/package/@tauri-apps/api |
| `@tauri-apps/plugin-dialog` | 2.7.2 | MIT OR Apache-2.0 | https://www.npmjs.com/package/@tauri-apps/plugin-dialog |
| `@tauri-apps/plugin-log` | 2.9.0 | MIT OR Apache-2.0 | https://www.npmjs.com/package/@tauri-apps/plugin-log |
| `@tauri-apps/plugin-notification` | 2.3.3 | MIT OR Apache-2.0 | https://www.npmjs.com/package/@tauri-apps/plugin-notification |
| `@tauri-apps/plugin-shell` | 2.3.5 | MIT OR Apache-2.0 | https://www.npmjs.com/package/@tauri-apps/plugin-shell |
| `@ts-morph/common` | 0.27.0 | MIT | https://www.npmjs.com/package/@ts-morph/common |
| `@tweenjs/tween.js` | 23.1.3 | MIT | https://www.npmjs.com/package/@tweenjs/tween.js |
| `@types/draco3d` | 1.4.10 | MIT | https://www.npmjs.com/package/@types/draco3d |
| `@types/offscreencanvas` | 2019.7.3 | MIT | https://www.npmjs.com/package/@types/offscreencanvas |
| `@types/react` | 19.2.18 | MIT | https://www.npmjs.com/package/@types/react |
| `@types/react-dom` | 19.2.5 | MIT | https://www.npmjs.com/package/@types/react-dom |
| `@types/react-reconciler` | 0.28.9 | MIT | https://www.npmjs.com/package/@types/react-reconciler |
| `@types/stats.js` | 0.17.4 | MIT | https://www.npmjs.com/package/@types/stats.js |
| `@types/three` | 0.170.0 | MIT | https://www.npmjs.com/package/@types/three |
| `@types/validate-npm-package-name` | 4.0.2 | MIT | https://www.npmjs.com/package/@types/validate-npm-package-name |
| `@types/webxr` | 0.5.24 | MIT | https://www.npmjs.com/package/@types/webxr |
| `@use-gesture/core` | 10.3.1 | MIT | https://www.npmjs.com/package/@use-gesture/core |
| `@use-gesture/react` | 10.3.1 | MIT | https://www.npmjs.com/package/@use-gesture/react |
| `@webgpu/types` | 0.1.72 | BSD-3-Clause | https://www.npmjs.com/package/@webgpu/types |
| `accepts` | 2.0.0 | MIT | https://www.npmjs.com/package/accepts |
| `ajv` | 8.20.0 | MIT | https://www.npmjs.com/package/ajv |
| `ajv` | 8.20.0 | MIT | https://www.npmjs.com/package/ajv |
| `ajv` | 8.20.0 | MIT | https://www.npmjs.com/package/ajv |
| `ajv-formats` | 2.1.1 | MIT | https://www.npmjs.com/package/ajv-formats |
| `ajv-formats` | 3.0.1 | MIT | https://www.npmjs.com/package/ajv-formats |
| `ansi-colors` | 4.1.3 | MIT | https://www.npmjs.com/package/ansi-colors |
| `ansi-regex` | 5.0.1 | MIT | https://www.npmjs.com/package/ansi-regex |
| `ansi-regex` | 6.3.0 | MIT | https://www.npmjs.com/package/ansi-regex |
| `ansi-regex` | 6.3.0 | MIT | https://www.npmjs.com/package/ansi-regex |
| `argparse` | 2.0.1 | Python-2.0 | https://www.npmjs.com/package/argparse |
| `aria-hidden` | 1.2.6 | MIT | https://www.npmjs.com/package/aria-hidden |
| `ast-types` | 0.16.1 | MIT | https://www.npmjs.com/package/ast-types |
| `atomically` | 1.7.0 | MIT | https://www.npmjs.com/package/atomically |
| `balanced-match` | 4.0.4 | MIT | https://www.npmjs.com/package/balanced-match |
| `base64-js` | 1.5.1 | MIT | https://www.npmjs.com/package/base64-js |
| `baseline-browser-mapping` | 2.11.19 | Apache-2.0 | https://www.npmjs.com/package/baseline-browser-mapping |
| `bidi-js` | 1.0.3 | MIT | https://www.npmjs.com/package/bidi-js |
| `body-parser` | 2.3.0 | MIT | https://www.npmjs.com/package/body-parser |
| `brace-expansion` | 5.0.9 | MIT | https://www.npmjs.com/package/brace-expansion |
| `braces` | 3.0.3 | MIT | https://www.npmjs.com/package/braces |
| `browserslist` | 4.28.8 | MIT | https://www.npmjs.com/package/browserslist |
| `buffer` | 6.0.3 | MIT | https://www.npmjs.com/package/buffer |
| `bundle-name` | 4.1.0 | MIT | https://www.npmjs.com/package/bundle-name |
| `bytes` | 3.1.2 | MIT | https://www.npmjs.com/package/bytes |
| `call-bind-apply-helpers` | 1.0.2 | MIT | https://www.npmjs.com/package/call-bind-apply-helpers |
| `call-bound` | 1.0.4 | MIT | https://www.npmjs.com/package/call-bound |
| `callsites` | 3.1.0 | MIT | https://www.npmjs.com/package/callsites |
| `camera-controls` | 3.1.2 | MIT | https://www.npmjs.com/package/camera-controls |
| `caniuse-lite` | 1.0.30001810 | CC-BY-4.0 | https://www.npmjs.com/package/caniuse-lite |
| `chalk` | 5.6.2 | MIT | https://www.npmjs.com/package/chalk |
| `chalk` | 5.6.2 | MIT | https://www.npmjs.com/package/chalk |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | https://www.npmjs.com/package/class-variance-authority |
| `cli-cursor` | 5.0.0 | MIT | https://www.npmjs.com/package/cli-cursor |
| `cli-spinners` | 2.9.2 | MIT | https://www.npmjs.com/package/cli-spinners |
| `clsx` | 2.1.1 | MIT | https://www.npmjs.com/package/clsx |
| `cmdk` | 1.1.1 | MIT | https://www.npmjs.com/package/cmdk |
| `code-block-writer` | 13.0.3 | MIT | https://www.npmjs.com/package/code-block-writer |
| `commander` | 11.1.0 | MIT | https://www.npmjs.com/package/commander |
| `commander` | 14.0.3 | MIT | https://www.npmjs.com/package/commander |
| `conf` | 10.2.0 | MIT | https://www.npmjs.com/package/conf |
| `content-disposition` | 1.1.0 | MIT | https://www.npmjs.com/package/content-disposition |
| `content-type` | 1.0.5 | MIT | https://www.npmjs.com/package/content-type |
| `content-type` | 2.1.0 | MIT | https://www.npmjs.com/package/content-type |
| `content-type` | 2.1.0 | MIT | https://www.npmjs.com/package/content-type |
| `content-type` | 2.1.0 | MIT | https://www.npmjs.com/package/content-type |
| `convert-source-map` | 2.0.0 | MIT | https://www.npmjs.com/package/convert-source-map |
| `cookie` | 0.7.2 | MIT | https://www.npmjs.com/package/cookie |
| `cookie-signature` | 1.2.2 | MIT | https://www.npmjs.com/package/cookie-signature |
| `cors` | 2.8.6 | MIT | https://www.npmjs.com/package/cors |
| `cosmiconfig` | 9.0.2 | MIT | https://www.npmjs.com/package/cosmiconfig |
| `cross-env` | 7.0.3 | MIT | https://www.npmjs.com/package/cross-env |
| `cross-spawn` | 7.0.6 | MIT | https://www.npmjs.com/package/cross-spawn |
| `cssesc` | 3.0.0 | MIT | https://www.npmjs.com/package/cssesc |
| `csstype` | 3.2.3 | MIT | https://www.npmjs.com/package/csstype |
| `debounce-fn` | 4.0.0 | MIT | https://www.npmjs.com/package/debounce-fn |
| `debug` | 4.4.3 | MIT | https://www.npmjs.com/package/debug |
| `dedent` | 1.7.2 | MIT | https://www.npmjs.com/package/dedent |
| `deepmerge` | 4.3.1 | MIT | https://www.npmjs.com/package/deepmerge |
| `default-browser` | 5.5.1 | MIT | https://www.npmjs.com/package/default-browser |
| `default-browser-id` | 5.0.1 | MIT | https://www.npmjs.com/package/default-browser-id |
| `define-lazy-prop` | 2.0.0 | MIT | https://www.npmjs.com/package/define-lazy-prop |
| `define-lazy-prop` | 3.0.0 | MIT | https://www.npmjs.com/package/define-lazy-prop |
| `depd` | 2.0.0 | MIT | https://www.npmjs.com/package/depd |
| `detect-gpu` | 5.0.70 | MIT | https://www.npmjs.com/package/detect-gpu |
| `detect-node-es` | 1.1.0 | MIT | https://www.npmjs.com/package/detect-node-es |
| `diff` | 8.0.4 | BSD-3-Clause | https://www.npmjs.com/package/diff |
| `dot-prop` | 6.0.1 | MIT | https://www.npmjs.com/package/dot-prop |
| `dotenv` | 17.4.2 | BSD-2-Clause | https://www.npmjs.com/package/dotenv |
| `draco3d` | 1.5.7 | Apache-2.0 | https://www.npmjs.com/package/draco3d |
| `dunder-proto` | 1.0.1 | MIT | https://www.npmjs.com/package/dunder-proto |
| `ee-first` | 1.1.1 | MIT | https://www.npmjs.com/package/ee-first |
| `electron-to-chromium` | 1.5.414 | ISC | https://www.npmjs.com/package/electron-to-chromium |
| `emoji-regex` | 10.6.0 | MIT | https://www.npmjs.com/package/emoji-regex |
| `encodeurl` | 2.0.0 | MIT | https://www.npmjs.com/package/encodeurl |
| `enquirer` | 2.4.1 | MIT | https://www.npmjs.com/package/enquirer |
| `env-paths` | 2.2.1 | MIT | https://www.npmjs.com/package/env-paths |
| `error-ex` | 1.3.4 | MIT | https://www.npmjs.com/package/error-ex |
| `es-define-property` | 1.0.1 | MIT | https://www.npmjs.com/package/es-define-property |
| `es-errors` | 1.3.0 | MIT | https://www.npmjs.com/package/es-errors |
| `es-object-atoms` | 1.1.2 | MIT | https://www.npmjs.com/package/es-object-atoms |
| `escalade` | 3.2.0 | MIT | https://www.npmjs.com/package/escalade |
| `escape-html` | 1.0.3 | MIT | https://www.npmjs.com/package/escape-html |
| `esprima` | 4.0.1 | BSD-2-Clause | https://www.npmjs.com/package/esprima |
| `etag` | 1.8.1 | MIT | https://www.npmjs.com/package/etag |
| `eventsource` | 3.0.7 | MIT | https://www.npmjs.com/package/eventsource |
| `eventsource-parser` | 3.1.1 | MIT | https://www.npmjs.com/package/eventsource-parser |
| `execa` | 5.1.1 | MIT | https://www.npmjs.com/package/execa |
| `execa` | 9.6.1 | MIT | https://www.npmjs.com/package/execa |
| `express` | 5.2.1 | MIT | https://www.npmjs.com/package/express |
| `express-rate-limit` | 8.6.2 | MIT | https://www.npmjs.com/package/express-rate-limit |
| `fast-deep-equal` | 3.1.3 | MIT | https://www.npmjs.com/package/fast-deep-equal |
| `fast-glob` | 3.3.3 | MIT | https://www.npmjs.com/package/fast-glob |
| `fast-uri` | 3.1.6 | BSD-3-Clause | https://www.npmjs.com/package/fast-uri |
| `fastq` | 1.20.1 | ISC | https://www.npmjs.com/package/fastq |
| `fdir` | 6.5.0 | MIT | https://www.npmjs.com/package/fdir |
| `fflate` | 0.6.11 | MIT | https://www.npmjs.com/package/fflate |
| `fflate` | 0.8.3 | MIT | https://www.npmjs.com/package/fflate |
| `figures` | 6.1.0 | MIT | https://www.npmjs.com/package/figures |
| `fill-range` | 7.1.1 | MIT | https://www.npmjs.com/package/fill-range |
| `finalhandler` | 2.1.1 | MIT | https://www.npmjs.com/package/finalhandler |
| `find-up` | 3.0.0 | MIT | https://www.npmjs.com/package/find-up |
| `forwarded` | 0.2.0 | MIT | https://www.npmjs.com/package/forwarded |
| `fresh` | 2.0.0 | MIT | https://www.npmjs.com/package/fresh |
| `fs-extra` | 11.4.0 | MIT | https://www.npmjs.com/package/fs-extra |
| `function-bind` | 1.1.2 | MIT | https://www.npmjs.com/package/function-bind |
| `fuzzysort` | 3.1.0 | MIT | https://www.npmjs.com/package/fuzzysort |
| `gensync` | 1.0.0-beta.2 | MIT | https://www.npmjs.com/package/gensync |
| `get-east-asian-width` | 1.6.0 | MIT | https://www.npmjs.com/package/get-east-asian-width |
| `get-intrinsic` | 1.3.0 | MIT | https://www.npmjs.com/package/get-intrinsic |
| `get-nonce` | 1.0.1 | MIT | https://www.npmjs.com/package/get-nonce |
| `get-own-enumerable-keys` | 1.0.0 | MIT | https://www.npmjs.com/package/get-own-enumerable-keys |
| `get-proto` | 1.0.1 | MIT | https://www.npmjs.com/package/get-proto |
| `get-stream` | 6.0.1 | MIT | https://www.npmjs.com/package/get-stream |
| `get-stream` | 9.0.1 | MIT | https://www.npmjs.com/package/get-stream |
| `glob-parent` | 5.1.2 | ISC | https://www.npmjs.com/package/glob-parent |
| `glsl-noise` | 0.0.0 | MIT | https://www.npmjs.com/package/glsl-noise |
| `gopd` | 1.2.0 | MIT | https://www.npmjs.com/package/gopd |
| `graceful-fs` | 4.2.11 | ISC | https://www.npmjs.com/package/graceful-fs |
| `has-symbols` | 1.1.0 | MIT | https://www.npmjs.com/package/has-symbols |
| `hasown` | 2.0.4 | MIT | https://www.npmjs.com/package/hasown |
| `hls.js` | 1.7.1 | Apache-2.0 | https://www.npmjs.com/package/hls.js |
| `hono` | 4.13.4 | MIT | https://www.npmjs.com/package/hono |
| `http-errors` | 2.0.1 | MIT | https://www.npmjs.com/package/http-errors |
| `human-signals` | 2.1.0 | Apache-2.0 | https://www.npmjs.com/package/human-signals |
| `human-signals` | 8.0.1 | Apache-2.0 | https://www.npmjs.com/package/human-signals |
| `iconv-lite` | 0.7.3 | MIT | https://www.npmjs.com/package/iconv-lite |
| `iconv-lite` | 0.7.3 | MIT | https://www.npmjs.com/package/iconv-lite |
| `ieee754` | 1.2.1 | BSD-3-Clause | https://www.npmjs.com/package/ieee754 |
| `ignore` | 5.3.2 | MIT | https://www.npmjs.com/package/ignore |
| `immediate` | 3.0.6 | MIT | https://www.npmjs.com/package/immediate |
| `import-fresh` | 3.3.1 | MIT | https://www.npmjs.com/package/import-fresh |
| `inherits` | 2.0.4 | ISC | https://www.npmjs.com/package/inherits |
| `ip-address` | 10.5.0 | MIT | https://www.npmjs.com/package/ip-address |
| `ipaddr.js` | 1.9.1 | MIT | https://www.npmjs.com/package/ipaddr.js |
| `is-arrayish` | 0.2.1 | MIT | https://www.npmjs.com/package/is-arrayish |
| `is-docker` | 2.2.1 | MIT | https://www.npmjs.com/package/is-docker |
| `is-docker` | 3.0.0 | MIT | https://www.npmjs.com/package/is-docker |
| `is-extglob` | 2.1.1 | MIT | https://www.npmjs.com/package/is-extglob |
| `is-glob` | 4.0.3 | MIT | https://www.npmjs.com/package/is-glob |
| `is-in-ssh` | 1.0.0 | MIT | https://www.npmjs.com/package/is-in-ssh |
| `is-inside-container` | 1.0.0 | MIT | https://www.npmjs.com/package/is-inside-container |
| `is-interactive` | 2.0.0 | MIT | https://www.npmjs.com/package/is-interactive |
| `is-number` | 7.0.0 | MIT | https://www.npmjs.com/package/is-number |
| `is-obj` | 2.0.0 | MIT | https://www.npmjs.com/package/is-obj |
| `is-obj` | 3.0.0 | MIT | https://www.npmjs.com/package/is-obj |
| `is-plain-obj` | 4.1.0 | MIT | https://www.npmjs.com/package/is-plain-obj |
| `is-promise` | 2.2.2 | MIT | https://www.npmjs.com/package/is-promise |
| `is-promise` | 4.0.0 | MIT | https://www.npmjs.com/package/is-promise |
| `is-regexp` | 3.1.0 | MIT | https://www.npmjs.com/package/is-regexp |
| `is-stream` | 2.0.1 | MIT | https://www.npmjs.com/package/is-stream |
| `is-stream` | 4.0.1 | MIT | https://www.npmjs.com/package/is-stream |
| `is-unicode-supported` | 1.3.0 | MIT | https://www.npmjs.com/package/is-unicode-supported |
| `is-unicode-supported` | 2.1.0 | MIT | https://www.npmjs.com/package/is-unicode-supported |
| `is-wsl` | 2.2.0 | MIT | https://www.npmjs.com/package/is-wsl |
| `is-wsl` | 3.1.1 | MIT | https://www.npmjs.com/package/is-wsl |
| `isexe` | 2.0.0 | ISC | https://www.npmjs.com/package/isexe |
| `isexe` | 3.1.5 | BlueOak-1.0.0 | https://www.npmjs.com/package/isexe |
| `its-fine` | 2.0.0 | MIT | https://www.npmjs.com/package/its-fine |
| `jose` | 6.2.10 | MIT | https://www.npmjs.com/package/jose |
| `js-tokens` | 4.0.0 | MIT | https://www.npmjs.com/package/js-tokens |
| `js-yaml` | 4.3.2 | MIT | https://www.npmjs.com/package/js-yaml |
| `jsesc` | 3.1.0 | MIT | https://www.npmjs.com/package/jsesc |
| `json-parse-even-better-errors` | 2.3.1 | MIT | https://www.npmjs.com/package/json-parse-even-better-errors |
| `json-schema-traverse` | 1.0.0 | MIT | https://www.npmjs.com/package/json-schema-traverse |
| `json-schema-traverse` | 1.0.0 | MIT | https://www.npmjs.com/package/json-schema-traverse |
| `json-schema-traverse` | 1.0.0 | MIT | https://www.npmjs.com/package/json-schema-traverse |
| `json-schema-typed` | 7.0.3 | BSD-2-Clause | https://www.npmjs.com/package/json-schema-typed |
| `json-schema-typed` | 8.0.2 | BSD-2-Clause | https://www.npmjs.com/package/json-schema-typed |
| `json5` | 2.2.3 | MIT | https://www.npmjs.com/package/json5 |
| `jsonfile` | 6.2.1 | MIT | https://www.npmjs.com/package/jsonfile |
| `kleur` | 3.0.3 | MIT | https://www.npmjs.com/package/kleur |
| `kleur` | 4.1.5 | MIT | https://www.npmjs.com/package/kleur |
| `lie` | 3.3.0 | MIT | https://www.npmjs.com/package/lie |
| `lines-and-columns` | 1.2.4 | MIT | https://www.npmjs.com/package/lines-and-columns |
| `locate-path` | 3.0.0 | MIT | https://www.npmjs.com/package/locate-path |
| `log-symbols` | 6.0.0 | MIT | https://www.npmjs.com/package/log-symbols |
| `lru-cache` | 5.1.1 | ISC | https://www.npmjs.com/package/lru-cache |
| `lucide-react` | 0.460.0 | ISC | https://www.npmjs.com/package/lucide-react |
| `maath` | 0.10.8 | MIT | https://www.npmjs.com/package/maath |
| `math-intrinsics` | 1.1.0 | MIT | https://www.npmjs.com/package/math-intrinsics |
| `media-typer` | 1.1.1 | MIT | https://www.npmjs.com/package/media-typer |
| `merge-descriptors` | 2.0.0 | MIT | https://www.npmjs.com/package/merge-descriptors |
| `merge-stream` | 2.0.0 | MIT | https://www.npmjs.com/package/merge-stream |
| `merge2` | 1.4.1 | MIT | https://www.npmjs.com/package/merge2 |
| `meshline` | 3.3.1 | MIT | https://www.npmjs.com/package/meshline |
| `meshoptimizer` | 0.18.1 | MIT | https://www.npmjs.com/package/meshoptimizer |
| `micromatch` | 4.0.8 | MIT | https://www.npmjs.com/package/micromatch |
| `mime-db` | 1.54.0 | MIT | https://www.npmjs.com/package/mime-db |
| `mime-db` | 1.54.0 | MIT | https://www.npmjs.com/package/mime-db |
| `mime-db` | 1.54.0 | MIT | https://www.npmjs.com/package/mime-db |
| `mime-db` | 1.54.0 | MIT | https://www.npmjs.com/package/mime-db |
| `mime-types` | 3.0.2 | MIT | https://www.npmjs.com/package/mime-types |
| `mime-types` | 3.0.2 | MIT | https://www.npmjs.com/package/mime-types |
| `mime-types` | 3.0.2 | MIT | https://www.npmjs.com/package/mime-types |
| `mime-types` | 3.0.2 | MIT | https://www.npmjs.com/package/mime-types |
| `mimic-fn` | 2.1.0 | MIT | https://www.npmjs.com/package/mimic-fn |
| `mimic-fn` | 3.1.0 | MIT | https://www.npmjs.com/package/mimic-fn |
| `mimic-function` | 5.0.1 | MIT | https://www.npmjs.com/package/mimic-function |
| `minimatch` | 10.2.6 | BlueOak-1.0.0 | https://www.npmjs.com/package/minimatch |
| `minimist` | 1.2.8 | MIT | https://www.npmjs.com/package/minimist |
| `ms` | 2.1.3 | MIT | https://www.npmjs.com/package/ms |
| `nanoid` | 3.3.18 | MIT | https://www.npmjs.com/package/nanoid |
| `negotiator` | 1.1.0 | MIT | https://www.npmjs.com/package/negotiator |
| `next-themes` | 0.4.6 | MIT | https://www.npmjs.com/package/next-themes |
| `node-releases` | 2.0.53 | MIT | https://www.npmjs.com/package/node-releases |
| `npm-run-path` | 4.0.1 | MIT | https://www.npmjs.com/package/npm-run-path |
| `npm-run-path` | 6.0.0 | MIT | https://www.npmjs.com/package/npm-run-path |
| `object-assign` | 4.1.1 | MIT | https://www.npmjs.com/package/object-assign |
| `object-inspect` | 1.13.4 | MIT | https://www.npmjs.com/package/object-inspect |
| `object-treeify` | 1.1.33 | MIT | https://www.npmjs.com/package/object-treeify |
| `on-finished` | 2.4.1 | MIT | https://www.npmjs.com/package/on-finished |
| `once` | 1.4.0 | ISC | https://www.npmjs.com/package/once |
| `onetime` | 5.1.2 | MIT | https://www.npmjs.com/package/onetime |
| `onetime` | 7.0.0 | MIT | https://www.npmjs.com/package/onetime |
| `open` | 11.0.1 | MIT | https://www.npmjs.com/package/open |
| `open` | 8.4.2 | MIT | https://www.npmjs.com/package/open |
| `ora` | 8.2.0 | MIT | https://www.npmjs.com/package/ora |
| `p-limit` | 2.3.0 | MIT | https://www.npmjs.com/package/p-limit |
| `p-locate` | 3.0.0 | MIT | https://www.npmjs.com/package/p-locate |
| `p-try` | 2.2.0 | MIT | https://www.npmjs.com/package/p-try |
| `parent-module` | 1.0.1 | MIT | https://www.npmjs.com/package/parent-module |
| `parse-json` | 5.2.0 | MIT | https://www.npmjs.com/package/parse-json |
| `parse-ms` | 4.0.0 | MIT | https://www.npmjs.com/package/parse-ms |
| `parseurl` | 1.3.3 | MIT | https://www.npmjs.com/package/parseurl |
| `path-browserify` | 1.0.1 | MIT | https://www.npmjs.com/package/path-browserify |
| `path-exists` | 3.0.0 | MIT | https://www.npmjs.com/package/path-exists |
| `path-key` | 3.1.1 | MIT | https://www.npmjs.com/package/path-key |
| `path-key` | 4.0.0 | MIT | https://www.npmjs.com/package/path-key |
| `path-to-regexp` | 8.4.2 | MIT | https://www.npmjs.com/package/path-to-regexp |
| `picocolors` | 1.1.1 | ISC | https://www.npmjs.com/package/picocolors |
| `picomatch` | 2.3.2 | MIT | https://www.npmjs.com/package/picomatch |
| `picomatch` | 4.0.7 | MIT | https://www.npmjs.com/package/picomatch |
| `pkce-challenge` | 5.0.1 | MIT | https://www.npmjs.com/package/pkce-challenge |
| `pkg-up` | 3.1.0 | MIT | https://www.npmjs.com/package/pkg-up |
| `postcss` | 8.5.26 | MIT | https://www.npmjs.com/package/postcss |
| `postcss-selector-parser` | 7.1.5 | MIT | https://www.npmjs.com/package/postcss-selector-parser |
| `potpack` | 1.0.2 | ISC | https://www.npmjs.com/package/potpack |
| `powershell-utils` | 0.1.0 | MIT | https://www.npmjs.com/package/powershell-utils |
| `powershell-utils` | 0.2.0 | MIT | https://www.npmjs.com/package/powershell-utils |
| `pretty-ms` | 9.3.0 | MIT | https://www.npmjs.com/package/pretty-ms |
| `promise-worker-transferable` | 1.0.4 | Apache-2.0 | https://www.npmjs.com/package/promise-worker-transferable |
| `prompts` | 2.4.2 | MIT | https://www.npmjs.com/package/prompts |
| `proxy-addr` | 2.0.7 | MIT | https://www.npmjs.com/package/proxy-addr |
| `qs` | 6.15.3 | BSD-3-Clause | https://www.npmjs.com/package/qs |
| `queue-microtask` | 1.2.3 | MIT | https://www.npmjs.com/package/queue-microtask |
| `range-parser` | 1.3.0 | MIT | https://www.npmjs.com/package/range-parser |
| `raw-body` | 3.0.2 | MIT | https://www.npmjs.com/package/raw-body |
| `react` | 19.2.8 | MIT | https://www.npmjs.com/package/react |
| `react-dom` | 19.2.8 | MIT | https://www.npmjs.com/package/react-dom |
| `react-remove-scroll` | 2.7.2 | MIT | https://www.npmjs.com/package/react-remove-scroll |
| `react-remove-scroll-bar` | 2.3.8 | MIT | https://www.npmjs.com/package/react-remove-scroll-bar |
| `react-style-singleton` | 2.2.3 | MIT | https://www.npmjs.com/package/react-style-singleton |
| `react-use-measure` | 2.1.7 | MIT | https://www.npmjs.com/package/react-use-measure |
| `recast` | 0.23.21 | MIT | https://www.npmjs.com/package/recast |
| `require-from-string` | 2.0.2 | MIT | https://www.npmjs.com/package/require-from-string |
| `reselect` | 5.3.0 | MIT | https://www.npmjs.com/package/reselect |
| `resolve-from` | 4.0.0 | MIT | https://www.npmjs.com/package/resolve-from |
| `restore-cursor` | 5.1.0 | MIT | https://www.npmjs.com/package/restore-cursor |
| `reusify` | 1.1.0 | MIT | https://www.npmjs.com/package/reusify |
| `router` | 2.2.0 | MIT | https://www.npmjs.com/package/router |
| `run-applescript` | 7.1.0 | MIT | https://www.npmjs.com/package/run-applescript |
| `run-parallel` | 1.2.0 | MIT | https://www.npmjs.com/package/run-parallel |
| `safer-buffer` | 2.1.2 | MIT | https://www.npmjs.com/package/safer-buffer |
| `scheduler` | 0.27.0 | MIT | https://www.npmjs.com/package/scheduler |
| `semver` | 6.3.1 | ISC | https://www.npmjs.com/package/semver |
| `semver` | 7.8.5 | ISC | https://www.npmjs.com/package/semver |
| `send` | 1.2.1 | MIT | https://www.npmjs.com/package/send |
| `serve-static` | 2.2.1 | MIT | https://www.npmjs.com/package/serve-static |
| `setprototypeof` | 1.2.0 | ISC | https://www.npmjs.com/package/setprototypeof |
| `shadcn` | 4.19.0 | MIT | https://www.npmjs.com/package/shadcn |
| `shebang-command` | 2.0.0 | MIT | https://www.npmjs.com/package/shebang-command |
| `shebang-regex` | 3.0.0 | MIT | https://www.npmjs.com/package/shebang-regex |
| `side-channel` | 1.1.1 | MIT | https://www.npmjs.com/package/side-channel |
| `side-channel-list` | 1.0.1 | MIT | https://www.npmjs.com/package/side-channel-list |
| `side-channel-map` | 1.0.1 | MIT | https://www.npmjs.com/package/side-channel-map |
| `side-channel-weakmap` | 1.0.2 | MIT | https://www.npmjs.com/package/side-channel-weakmap |
| `signal-exit` | 3.0.7 | ISC | https://www.npmjs.com/package/signal-exit |
| `signal-exit` | 4.1.0 | ISC | https://www.npmjs.com/package/signal-exit |
| `sisteransi` | 1.0.5 | MIT | https://www.npmjs.com/package/sisteransi |
| `smart-buffer` | 4.2.0 | MIT | https://www.npmjs.com/package/smart-buffer |
| `socks` | 2.8.9 | MIT | https://www.npmjs.com/package/socks |
| `sonner` | 1.7.4 | MIT | https://www.npmjs.com/package/sonner |
| `source-map` | 0.6.1 | BSD-3-Clause | https://www.npmjs.com/package/source-map |
| `source-map-js` | 1.2.1 | BSD-3-Clause | https://www.npmjs.com/package/source-map-js |
| `stats-gl` | 2.4.2 | MIT | https://www.npmjs.com/package/stats-gl |
| `stats.js` | 0.17.0 | MIT | https://www.npmjs.com/package/stats.js |
| `statuses` | 2.0.2 | MIT | https://www.npmjs.com/package/statuses |
| `stdin-discarder` | 0.2.2 | MIT | https://www.npmjs.com/package/stdin-discarder |
| `string-width` | 7.2.0 | MIT | https://www.npmjs.com/package/string-width |
| `stringify-object` | 5.0.0 | BSD-2-Clause | https://www.npmjs.com/package/stringify-object |
| `strip-ansi` | 6.0.1 | MIT | https://www.npmjs.com/package/strip-ansi |
| `strip-ansi` | 7.2.0 | MIT | https://www.npmjs.com/package/strip-ansi |
| `strip-ansi` | 7.2.0 | MIT | https://www.npmjs.com/package/strip-ansi |
| `strip-bom` | 3.0.0 | MIT | https://www.npmjs.com/package/strip-bom |
| `strip-final-newline` | 2.0.0 | MIT | https://www.npmjs.com/package/strip-final-newline |
| `strip-final-newline` | 4.0.0 | MIT | https://www.npmjs.com/package/strip-final-newline |
| `suspend-react` | 0.1.3 | MIT | https://www.npmjs.com/package/suspend-react |
| `systeminformation` | 5.33.2 | MIT | https://www.npmjs.com/package/systeminformation |
| `tailwind-merge` | 2.6.1 | MIT | https://www.npmjs.com/package/tailwind-merge |
| `tailwind-merge` | 3.6.0 | MIT | https://www.npmjs.com/package/tailwind-merge |
| `three` | 0.170.0 | MIT | https://www.npmjs.com/package/three |
| `three-mesh-bvh` | 0.8.3 | MIT | https://www.npmjs.com/package/three-mesh-bvh |
| `three-stdlib` | 2.36.1 | MIT | https://www.npmjs.com/package/three-stdlib |
| `tiny-invariant` | 1.3.3 | MIT | https://www.npmjs.com/package/tiny-invariant |
| `to-regex-range` | 5.0.1 | MIT | https://www.npmjs.com/package/to-regex-range |
| `toidentifier` | 1.0.1 | MIT | https://www.npmjs.com/package/toidentifier |
| `troika-three-text` | 0.52.5 | MIT | https://www.npmjs.com/package/troika-three-text |
| `troika-three-utils` | 0.52.5 | MIT | https://www.npmjs.com/package/troika-three-utils |
| `troika-worker-utils` | 0.52.0 | MIT | https://www.npmjs.com/package/troika-worker-utils |
| `ts-morph` | 26.0.0 | MIT | https://www.npmjs.com/package/ts-morph |
| `tsconfig-paths` | 4.2.0 | MIT | https://www.npmjs.com/package/tsconfig-paths |
| `tslib` | 2.8.1 | 0BSD | https://www.npmjs.com/package/tslib |
| `tunnel-rat` | 0.1.2 | MIT | https://www.npmjs.com/package/tunnel-rat |
| `tw-animate-css` | 1.4.0 | MIT | https://www.npmjs.com/package/tw-animate-css |
| `type-is` | 2.1.0 | MIT | https://www.npmjs.com/package/type-is |
| `typescript` | 5.9.3 | Apache-2.0 | https://www.npmjs.com/package/typescript |
| `undici` | 7.29.0 | MIT | https://www.npmjs.com/package/undici |
| `unicorn-magic` | 0.3.0 | MIT | https://www.npmjs.com/package/unicorn-magic |
| `universalify` | 2.0.1 | MIT | https://www.npmjs.com/package/universalify |
| `unpipe` | 1.0.0 | MIT | https://www.npmjs.com/package/unpipe |
| `update-browserslist-db` | 1.3.1 | MIT | https://www.npmjs.com/package/update-browserslist-db |
| `use-callback-ref` | 1.3.3 | MIT | https://www.npmjs.com/package/use-callback-ref |
| `use-sidecar` | 1.1.3 | MIT | https://www.npmjs.com/package/use-sidecar |
| `use-sync-external-store` | 1.6.0 | MIT | https://www.npmjs.com/package/use-sync-external-store |
| `util-deprecate` | 1.0.2 | MIT | https://www.npmjs.com/package/util-deprecate |
| `utility-types` | 3.11.0 | MIT | https://www.npmjs.com/package/utility-types |
| `validate-npm-package-name` | 7.0.2 | ISC | https://www.npmjs.com/package/validate-npm-package-name |
| `vary` | 1.1.2 | MIT | https://www.npmjs.com/package/vary |
| `webgl-constants` | 1.1.1 | NOASSERTION | https://www.npmjs.com/package/webgl-constants |
| `webgl-sdf-generator` | 1.1.1 | MIT | https://www.npmjs.com/package/webgl-sdf-generator |
| `which` | 2.0.2 | ISC | https://www.npmjs.com/package/which |
| `which` | 4.0.0 | ISC | https://www.npmjs.com/package/which |
| `wrappy` | 1.0.2 | ISC | https://www.npmjs.com/package/wrappy |
| `wsl-utils` | 1.0.0 | MIT | https://www.npmjs.com/package/wsl-utils |
| `yallist` | 3.1.1 | ISC | https://www.npmjs.com/package/yallist |
| `yocto-spinner` | 1.2.2 | MIT | https://www.npmjs.com/package/yocto-spinner |
| `yoctocolors` | 2.2.0 | MIT | https://www.npmjs.com/package/yoctocolors |
| `zod` | 3.25.76 | MIT | https://www.npmjs.com/package/zod |
| `zod-to-json-schema` | 3.25.2 | ISC | https://www.npmjs.com/package/zod-to-json-schema |
| `zustand` | 4.5.7 | MIT | https://www.npmjs.com/package/zustand |
| `zustand` | 5.0.15 | MIT | https://www.npmjs.com/package/zustand |

## Licence texts

Each licence family appearing above, reproduced once, with the packages that
declare it.

### 0BSD

Declared by 2 package(s):

- `adler2@2.0.1` (crates.io) — https://github.com/oyvindln/adler2
- `tslib@2.8.1` (npm) — https://www.npmjs.com/package/tslib

> **Licence text not bundled.** This identifier appears in the dependency
> graph, but no matching licence file was available on the machine that
> generated this file. See the upstream sources above for the authoritative
> text. This is a recorded limitation, not an omission.

### Apache-2.0

Declared by 417 package(s):

- `anyhow@1.0.104` (crates.io) — https://github.com/dtolnay/anyhow
- `async-trait@0.1.92` (crates.io) — https://github.com/dtolnay/async-trait
- `proc-macro2@1.0.107` (crates.io) — https://github.com/dtolnay/proc-macro2
- `unicode-ident@1.0.24` (crates.io) — https://github.com/dtolnay/unicode-ident
- `quote@1.0.47` (crates.io) — https://github.com/dtolnay/quote
- `syn@3.0.4` (crates.io) — https://github.com/dtolnay/syn
- `base64@0.22.1` (crates.io) — https://github.com/marshallpierce/rust-base64
- `chrono@0.4.45` (crates.io) — https://github.com/chronotope/chrono
- `iana-time-zone@0.1.65` (crates.io) — https://github.com/strawlab/iana-time-zone
- `android_system_properties@0.1.6` (crates.io) — https://github.com/nical/android_system_properties
- `libc@0.2.189` (crates.io) — https://github.com/rust-lang/libc
- `core-foundation-sys@0.8.7` (crates.io) — https://github.com/servo/core-foundation-rs
- `iana-time-zone-haiku@0.1.2` (crates.io) — https://github.com/strawlab/iana-time-zone
- `cc@1.4.4` (crates.io) — https://github.com/rust-lang/cc-rs
- `find-msvc-tools@0.1.11` (crates.io) — https://github.com/rust-lang/cc-rs
- `shlex@2.0.1` (crates.io) — https://github.com/comex/rust-shlex
- `js-sys@0.3.104` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/js-sys
- `cfg-if@1.0.4` (crates.io) — https://github.com/rust-lang/cfg-if
- `futures-util@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-channel@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-core@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-sink@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-io@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-macro@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-task@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `pin-project-lite@0.2.17` (crates.io) — https://github.com/taiki-e/pin-project-lite
- `wasm-bindgen@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen
- `once_cell@1.21.4` (crates.io) — https://github.com/matklad/once_cell
- `rustversion@1.0.23` (crates.io) — https://github.com/dtolnay/rustversion
- `wasm-bindgen-macro@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro
- `wasm-bindgen-macro-support@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro-support
- `bumpalo@3.20.3` (crates.io) — https://github.com/fitzgen/bumpalo
- `syn@2.0.119` (crates.io) — https://github.com/dtolnay/syn
- `wasm-bindgen-shared@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/shared
- `log@0.4.34` (crates.io) — https://github.com/rust-lang/log
- `windows-core@0.62.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-implement@0.60.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-interface@0.59.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-link@0.2.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-result@0.4.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-strings@0.5.1` (crates.io) — https://github.com/microsoft/windows-rs
- `num-traits@0.2.19` (crates.io) — https://github.com/rust-num/num-traits
- `autocfg@1.5.1` (crates.io) — https://github.com/cuviper/autocfg
- `serde@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `serde_core@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `serde_derive@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `hex@0.4.3` (crates.io) — https://github.com/KokaKiwi/rust-hex
- `keyring@3.6.3` (crates.io) — https://github.com/hwchen/keyring-rs.git
- `dbus-secret-service@4.1.0` (crates.io) — https://github.com/brotskydotcom/dbus-secret-service.git
- `aes@0.8.4` (crates.io) — https://github.com/RustCrypto/block-ciphers
- `cipher@0.4.4` (crates.io) — https://github.com/RustCrypto/traits
- `crypto-common@0.1.7` (crates.io) — https://github.com/RustCrypto/traits
- `typenum@1.20.1` (crates.io) — https://github.com/paholg/typenum
- `version_check@0.9.5` (crates.io) — https://github.com/SergioBenitez/version_check
- `inout@0.1.4` (crates.io) — https://github.com/RustCrypto/utils
- `block-padding@0.3.3` (crates.io) — https://github.com/RustCrypto/utils
- `cpufeatures@0.2.17` (crates.io) — https://github.com/RustCrypto/utils
- `cbc@0.1.2` (crates.io) — https://github.com/RustCrypto/block-modes
- `dbus@0.9.12` (crates.io) — https://github.com/diwic/dbus-rs
- `libdbus-sys@0.2.7` (crates.io) — https://github.com/diwic/dbus-rs
- `pkg-config@0.3.34` (crates.io) — https://github.com/rust-lang/pkg-config-rs
- `windows-sys@0.61.2` (crates.io) — https://github.com/microsoft/windows-rs
- `fastrand@2.5.0` (crates.io) — https://github.com/smol-rs/fastrand
- `hkdf@0.12.4` (crates.io) — https://github.com/RustCrypto/KDFs/
- `hmac@0.12.1` (crates.io) — https://github.com/RustCrypto/MACs
- `digest@0.10.7` (crates.io) — https://github.com/RustCrypto/traits
- `block-buffer@0.10.4` (crates.io) — https://github.com/RustCrypto/utils
- `num@0.4.3` (crates.io) — https://github.com/rust-num/num
- `num-bigint@0.4.8` (crates.io) — https://github.com/rust-num/num-bigint
- `num-integer@0.1.47` (crates.io) — https://github.com/rust-num/num-integer
- `num-complex@0.4.6` (crates.io) — https://github.com/rust-num/num-complex
- `num-iter@0.1.46` (crates.io) — https://github.com/rust-num/num-iter
- `num-rational@0.4.2` (crates.io) — https://github.com/rust-num/num-rational
- `sha2@0.10.9` (crates.io) — https://github.com/RustCrypto/hashes
- `zeroize@1.9.0` (crates.io) — https://github.com/RustCrypto/utils
- `zeroize_derive@1.5.0` (crates.io) — https://github.com/RustCrypto/utils
- `secret-service@4.0.0` (crates.io) — https://github.com/hwchen/secret-service-rs.git
- `rand@0.8.8` (crates.io) — https://github.com/rust-random/rand
- `rand_chacha@0.3.1` (crates.io) — https://github.com/rust-random/rand
- `ppv-lite86@0.2.21` (crates.io) — https://github.com/cryptocorrosion/cryptocorrosion
- `zerocopy@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `zerocopy-derive@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `rand_core@0.6.4` (crates.io) — https://github.com/rust-random/rand
- `getrandom@0.2.17` (crates.io) — https://github.com/rust-random/getrandom
- `wasi@0.11.1+wasi-snapshot-preview1` (crates.io) — https://github.com/bytecodealliance/wasi
- `async-broadcast@0.7.2` (crates.io) — https://github.com/smol-rs/async-broadcast
- `event-listener@5.4.2` (crates.io) — https://github.com/smol-rs/event-listener
- `parking@2.2.1` (crates.io) — https://github.com/smol-rs/parking
- `event-listener-strategy@0.5.4` (crates.io) — https://github.com/smol-rs/event-listener-strategy
- `async-executor@1.14.0` (crates.io) — https://github.com/smol-rs/async-executor
- `async-task@4.7.1` (crates.io) — https://github.com/smol-rs/async-task
- `concurrent-queue@2.5.0` (crates.io) — https://github.com/smol-rs/concurrent-queue
- `crossbeam-utils@0.8.22` (crates.io) — https://github.com/crossbeam-rs/crossbeam
- `futures-lite@2.6.1` (crates.io) — https://github.com/smol-rs/futures-lite
- `async-fs@2.2.0` (crates.io) — https://github.com/smol-rs/async-fs
- `async-lock@3.4.2` (crates.io) — https://github.com/smol-rs/async-lock
- `blocking@1.7.0` (crates.io) — https://github.com/smol-rs/blocking
- `async-channel@2.5.0` (crates.io) — https://github.com/smol-rs/async-channel
- `piper@0.2.5` (crates.io) — https://github.com/smol-rs/piper
- `atomic-waker@1.1.2` (crates.io) — https://github.com/smol-rs/atomic-waker
- `async-io@2.6.0` (crates.io) — https://github.com/smol-rs/async-io
- `polling@3.11.0` (crates.io) — https://github.com/smol-rs/polling
- `hermit-abi@0.5.2` (crates.io) — https://github.com/hermit-os/hermit-rs
- `rustix@1.1.4` (crates.io) — https://github.com/bytecodealliance/rustix
- `bitflags@2.13.1` (crates.io) — https://github.com/bitflags/bitflags
- `errno@0.3.14` (crates.io) — https://github.com/lambda-fairy/rust-errno
- `linux-raw-sys@0.12.1` (crates.io) — https://github.com/sunfishcode/linux-raw-sys
- `async-process@2.5.0` (crates.io) — https://github.com/smol-rs/async-process
- `async-signal@0.2.14` (crates.io) — https://github.com/smol-rs/async-signal
- `signal-hook-registry@1.4.8` (crates.io) — https://github.com/vorner/signal-hook
- `async-recursion@1.1.1` (crates.io) — https://github.com/dcchut/async-recursion
- `enumflags2@0.7.12` (crates.io) — https://github.com/meithecatte/enumflags2
- `enumflags2_derive@0.7.12` (crates.io) — https://github.com/meithecatte/enumflags2
- `ordered-stream@0.2.0` (crates.io) — https://github.com/danieldg/ordered-stream
- `serde_repr@0.1.21` (crates.io) — https://github.com/dtolnay/serde-repr
- `sha1@0.10.7` (crates.io) — https://github.com/RustCrypto/hashes
- `static_assertions@1.1.0` (crates.io) — https://github.com/nvzqz/static-assertions-rs
- `parking_lot@0.12.5` (crates.io) — https://github.com/Amanieu/parking_lot
- `lock_api@0.4.14` (crates.io) — https://github.com/Amanieu/parking_lot
- `scopeguard@1.2.0` (crates.io) — https://github.com/bluss/scopeguard
- `parking_lot_core@0.9.12` (crates.io) — https://github.com/Amanieu/parking_lot
- `smallvec@1.15.2` (crates.io) — https://github.com/servo/rust-smallvec
- `socket2@0.6.5` (crates.io) — https://github.com/rust-lang/socket2
- `tempfile@3.27.0` (crates.io) — https://github.com/Stebalien/tempfile
- `getrandom@0.4.3` (crates.io) — https://github.com/rust-random/getrandom
- `r-efi@6.0.0` (crates.io) — https://github.com/r-efi/r-efi
- `rand_core@0.10.1` (crates.io) — https://github.com/rust-random/rand_core
- `windows-sys@0.52.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-sys@0.59.0` (crates.io) — https://github.com/microsoft/windows-rs
- `proc-macro-crate@3.5.0` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `toml_edit@0.25.13+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `indexmap@2.14.0` (crates.io) — https://github.com/indexmap-rs/indexmap
- `equivalent@1.0.2` (crates.io) — https://github.com/indexmap-rs/equivalent
- `hashbrown@0.17.1` (crates.io) — https://github.com/rust-lang/hashbrown
- `toml_datetime@1.1.1+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `toml_parser@1.1.3+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `security-framework@2.11.1` (crates.io) — https://github.com/kornelski/rust-security-framework
- `core-foundation@0.9.4` (crates.io) — https://github.com/servo/core-foundation-rs
- `security-framework-sys@2.17.0` (crates.io) — https://github.com/kornelski/rust-security-framework
- `security-framework@3.7.0` (crates.io) — https://github.com/kornelski/rust-security-framework
- `core-foundation@0.10.1` (crates.io) — https://github.com/servo/core-foundation-rs
- `windows-sys@0.60.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.53.5` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `reqwest@0.12.28` (crates.io) — https://github.com/seanmonstar/reqwest
- `http@1.5.0` (crates.io) — https://github.com/hyperium/http
- `itoa@1.0.18` (crates.io) — https://github.com/dtolnay/itoa
- `fnv@1.0.7` (crates.io) — https://github.com/servo/rust-fnv
- `httparse@1.10.1` (crates.io) — https://github.com/seanmonstar/httparse
- `httpdate@1.0.3` (crates.io) — https://github.com/pyfisch/httpdate
- `hyper-rustls@0.27.9` (crates.io) — https://github.com/rustls/hyper-rustls
- `ipnet@2.12.1` (crates.io) — https://github.com/krisprice/ipnet
- `percent-encoding@2.3.2` (crates.io) — https://github.com/servo/rust-url/
- `rustls@0.23.43` (crates.io) — https://github.com/rustls/rustls
- `ring@0.17.14` (crates.io) — https://github.com/briansmith/ring
- `rustls-pki-types@1.15.1` (crates.io) — https://github.com/rustls/pki-types
- `web-time@1.1.0` (crates.io) — https://github.com/daxpedda/web-time
- `rustls-native-certs@0.8.4` (crates.io) — https://github.com/rustls/rustls-native-certs
- `openssl-probe@0.2.1` (crates.io) — https://github.com/rustls/openssl-probe
- `tokio-rustls@0.26.4` (crates.io) — https://github.com/rustls/tokio-rustls
- `quinn@0.11.11` (crates.io) — https://github.com/quinn-rs/quinn
- `quinn-proto@0.11.17` (crates.io) — https://github.com/quinn-rs/quinn
- `lru-slab@0.1.2` (crates.io) — https://github.com/Ralith/lru-slab
- `rand@0.10.2` (crates.io) — https://github.com/rust-random/rand
- `chacha20@0.10.1` (crates.io) — https://github.com/RustCrypto/stream-ciphers
- `cpufeatures@0.3.0` (crates.io) — https://github.com/RustCrypto/utils
- `rand_pcg@0.10.2` (crates.io) — https://github.com/rust-random/rngs
- `rustc-hash@2.1.3` (crates.io) — https://github.com/rust-lang/rustc-hash
- `thiserror@2.0.20` (crates.io) — https://github.com/dtolnay/thiserror
- `thiserror-impl@2.0.20` (crates.io) — https://github.com/dtolnay/thiserror
- `tinyvec@1.12.0` (crates.io) — https://github.com/Lokathor/tinyvec
- `tinyvec_macros@0.1.1` (crates.io) — https://github.com/Soveu/tinyvec_macros
- `quinn-udp@0.5.15` (crates.io) — https://github.com/quinn-rs/quinn
- `serde_json@1.0.151` (crates.io) — https://github.com/serde-rs/json
- `serde_urlencoded@0.7.1` (crates.io) — https://github.com/nox/serde_urlencoded
- `form_urlencoded@1.2.2` (crates.io) — https://github.com/servo/rust-url
- `ryu@1.0.23` (crates.io) — https://github.com/dtolnay/ryu
- `sync_wrapper@1.0.2` (crates.io) — https://github.com/Actyx/sync_wrapper
- `url@2.5.8` (crates.io) — https://github.com/servo/rust-url
- `idna@1.1.0` (crates.io) — https://github.com/servo/rust-url/
- `idna_adapter@1.2.2` (crates.io) — https://github.com/hsivonen/idna_adapter
- `displaydoc@0.2.7` (crates.io) — https://github.com/yaahc/displaydoc
- `stable_deref_trait@1.2.1` (crates.io) — https://github.com/storyyeller/stable_deref_trait
- `utf8_iter@1.0.4` (crates.io) — https://github.com/hsivonen/utf8_iter
- `wasm-bindgen-futures@0.4.77` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/futures
- `wasm-streams@0.4.2` (crates.io) — https://github.com/MattiasBuelens/wasm-streams/
- `web-sys@0.3.104` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/web-sys
- `fallible-iterator@0.3.0` (crates.io) — https://github.com/sfackler/rust-fallible-iterator
- `fallible-streaming-iterator@0.1.9` (crates.io) — https://github.com/sfackler/fallible-streaming-iterator
- `hashlink@0.9.1` (crates.io) — https://github.com/kyren/hashlink
- `hashbrown@0.14.5` (crates.io) — https://github.com/rust-lang/hashbrown
- `ahash@0.8.12` (crates.io) — https://github.com/tkaitchuck/ahash
- `vcpkg@0.2.15` (crates.io) — https://github.com/mcgoo/vcpkg-rs
- `tauri@2.11.5` (crates.io) — https://github.com/tauri-apps/tauri
- `cookie@0.18.2` (crates.io) — https://github.com/SergioBenitez/cookie-rs
- `time@0.3.55` (crates.io) — https://github.com/time-rs/time
- `deranged@0.5.8` (crates.io) — https://github.com/jhpratt/deranged
- `num-conv@0.2.2` (crates.io) — https://github.com/jhpratt/num-conv
- `num_threads@0.1.7` (crates.io) — https://github.com/jhpratt/num_threads
- `powerfmt@0.2.0` (crates.io) — https://github.com/jhpratt/powerfmt
- `time-core@0.1.9` (crates.io) — https://github.com/time-rs/time
- `time-macros@0.2.32` (crates.io) — https://github.com/time-rs/time
- `dirs@6.0.0` (crates.io) — https://github.com/soc/dirs-rs
- `dirs-sys@0.5.0` (crates.io) — https://github.com/dirs-dev/dirs-sys-rs
- `dunce@1.0.5` (crates.io) — https://gitlab.com/kornelski/dunce
- `embed_plist@1.2.2` (crates.io) — https://github.com/nvzqz/embed-plist-rs
- `getrandom@0.3.4` (crates.io) — https://github.com/rust-random/getrandom
- `r-efi@5.3.0` (crates.io) — https://github.com/r-efi/r-efi
- `wasip2@1.0.4+wasi-0.2.12` (crates.io) — https://github.com/bytecodealliance/wasi-rs
- `wit-bindgen@0.57.1` (crates.io) — https://github.com/bytecodealliance/wit-bindgen
- `glob@0.3.4` (crates.io) — https://github.com/rust-lang/glob
- `system-deps@6.2.2` (crates.io) — https://github.com/gdesmott/system-deps
- `cfg-expr@0.15.8` (crates.io) — https://github.com/EmbarkStudios/cfg-expr
- `heck@0.5.0` (crates.io) — https://github.com/withoutboats/heck
- `toml@0.8.2` (crates.io) — https://github.com/toml-rs/toml
- `serde_spanned@0.6.9` (crates.io) — https://github.com/toml-rs/toml
- `toml_datetime@0.6.3` (crates.io) — https://github.com/toml-rs/toml
- `toml_edit@0.20.2` (crates.io) — https://github.com/toml-rs/toml
- `futures-executor@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `winapi@0.3.9` (crates.io) — https://github.com/retep998/winapi-rs
- `winapi-i686-pc-windows-gnu@0.4.0` (crates.io) — https://github.com/retep998/winapi-rs
- `winapi-x86_64-pc-windows-gnu@0.4.0` (crates.io) — https://github.com/retep998/winapi-rs
- `heck@0.4.1` (crates.io) — https://github.com/withoutboats/heck
- `proc-macro-crate@2.0.2` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `proc-macro-error@1.0.4` (crates.io) — https://gitlab.com/CreepySkeleton/proc-macro-error
- `proc-macro-error-attr@1.0.4` (crates.io) — https://gitlab.com/CreepySkeleton/proc-macro-error
- `syn@1.0.109` (crates.io) — https://github.com/dtolnay/syn
- `thiserror@1.0.69` (crates.io) — https://github.com/dtolnay/thiserror
- `thiserror-impl@1.0.69` (crates.io) — https://github.com/dtolnay/thiserror
- `field-offset@0.3.6` (crates.io) — https://github.com/Diggsey/rust-field-offset
- `rustc_version@0.4.1` (crates.io) — https://github.com/djc/rustc-version-rs
- `semver@1.0.28` (crates.io) — https://github.com/dtolnay/semver
- `proc-macro-crate@1.3.1` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `toml_edit@0.19.15` (crates.io) — https://github.com/toml-rs/toml
- `jni@0.21.1` (crates.io) — https://github.com/jni-rs/jni-rs
- `cesu8@1.1.0` (crates.io) — https://github.com/emk/cesu8-rs
- `jni-sys@0.3.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `jni-sys@0.4.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `jni-sys-macros@0.4.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `windows-sys@0.45.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `mime@0.3.17` (crates.io) — https://github.com/hyperium/mime
- `muda@0.19.3` (crates.io) — https://github.com/tauri-apps/muda
- `crossbeam-channel@0.5.16` (crates.io) — https://github.com/crossbeam-rs/crossbeam
- `dpi@0.1.2` (crates.io) — https://github.com/rust-windowing/winit
- `keyboard-types@0.7.0` (crates.io) — https://github.com/pyfisch/keyboard-types
- `unicode-segmentation@1.13.3` (crates.io) — https://github.com/unicode-rs/unicode-segmentation
- `objc2-exception-helper@0.1.1` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-app-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-foundation@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `dispatch2@0.3.1` (crates.io) — https://github.com/madsmtm/objc2
- `png@0.18.1` (crates.io) — https://github.com/image-rs/image-png
- `crc32fast@1.5.1` (crates.io) — https://github.com/srijs/rust-crc32fast
- `fdeflate@0.3.7` (crates.io) — https://github.com/image-rs/fdeflate
- `flate2@1.1.9` (crates.io) — https://github.com/rust-lang/flate2-rs
- `miniz_oxide@0.8.9` (crates.io) — https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide
- `adler2@2.0.1` (crates.io) — https://github.com/oyvindln/adler2
- `objc2-ui-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-cloud-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-data@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-graphics@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-io-surface@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-image@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-location@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-text@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-quartz-core@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-user-notifications@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-web-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `raw-window-handle@0.6.2` (crates.io) — https://github.com/rust-windowing/raw-window-handle
- `reqwest@0.13.4` (crates.io) — https://github.com/seanmonstar/reqwest
- `wasm-streams@0.5.0` (crates.io) — https://github.com/MattiasBuelens/wasm-streams/
- `serialize-to-javascript@0.1.2` (crates.io) — https://github.com/chippers/serialize-to-javascript
- `serialize-to-javascript-impl@0.1.2` (crates.io) — https://github.com/chippers/serialize-to-javascript
- `swift-rs@1.0.8` (crates.io) — https://github.com/Brendonovich/swift-rs
- `base64@0.21.7` (crates.io) — https://github.com/marshallpierce/rust-base64
- `tauri-build@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `cargo_toml@0.22.3` (crates.io) — https://gitlab.com/lib.rs/cargo_toml
- `toml@0.9.12+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `serde_spanned@1.1.1` (crates.io) — https://github.com/toml-rs/toml
- `toml_datetime@0.7.5+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `toml_writer@1.1.2+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `json-patch@3.0.1` (crates.io) — https://github.com/idubrov/json-patch
- `jsonptr@0.6.3` (crates.io) — https://github.com/chanced/jsonptr
- `dyn-clone@1.0.20` (crates.io) — https://github.com/dtolnay/dyn-clone
- `indexmap@1.9.3` (crates.io) — https://github.com/bluss/indexmap
- `hashbrown@0.12.3` (crates.io) — https://github.com/rust-lang/hashbrown
- `serde_derive_internals@0.29.1` (crates.io) — https://github.com/serde-rs/serde
- `uuid@1.25.0` (crates.io) — https://github.com/uuid-rs/uuid
- `tauri-utils@2.9.3` (crates.io) — https://github.com/tauri-apps/tauri
- `camino@1.2.5` (crates.io) — https://github.com/camino-rs/camino
- `cargo-platform@0.1.9` (crates.io) — https://github.com/rust-lang/cargo
- `ctor@0.8.0` (crates.io) — https://github.com/mmastrac/rust-ctor
- `ctor-proc-macro@0.0.7` (crates.io) — https://github.com/mmastrac/rust-ctor
- `dtor@0.3.0` (crates.io) — https://github.com/mmastrac/rust-ctor
- `dtor-proc-macro@0.0.6` (crates.io) — https://github.com/mmastrac/rust-ctor
- `bit-set@0.8.0` (crates.io) — https://github.com/contain-rs/bit-set
- `bit-vec@0.8.0` (crates.io) — https://github.com/contain-rs/bit-vec
- `dtoa@1.0.11` (crates.io) — https://github.com/dtolnay/dtoa
- `siphasher@1.0.3` (crates.io) — https://github.com/jedisct1/rust-siphash
- `html5ever@0.38.0` (crates.io) — https://github.com/servo/html5ever
- `markup5ever@0.38.0` (crates.io) — https://github.com/servo/html5ever
- `tendril@0.5.1` (crates.io) — https://github.com/servo/html5ever
- `web_atoms@0.2.6` (crates.io) — https://github.com/servo/html5ever
- `string_cache@0.9.0` (crates.io) — https://github.com/servo/string-cache
- `string_cache_codegen@0.6.1` (crates.io) — https://github.com/servo/string-cache
- `servo_arc@0.4.3` (crates.io) — https://github.com/servo/stylo
- `regex@1.13.1` (crates.io) — https://github.com/rust-lang/regex
- `regex-automata@0.4.18` (crates.io) — https://github.com/rust-lang/regex
- `regex-syntax@0.8.11` (crates.io) — https://github.com/rust-lang/regex
- `serde-untagged@0.1.9` (crates.io) — https://github.com/dtolnay/serde-untagged
- `erased-serde@0.4.10` (crates.io) — https://github.com/dtolnay/erased-serde
- `typeid@1.0.3` (crates.io) — https://github.com/dtolnay/typeid
- `serde_with@3.22.0` (crates.io) — https://github.com/jonasbb/serde_with/
- `bs58@0.5.1` (crates.io) — https://github.com/Nullus157/bs58-rs
- `defmt@1.1.1` (crates.io) — https://github.com/knurling-rs/defmt
- `bitflags@1.3.2` (crates.io) — https://github.com/bitflags/bitflags
- `defmt-macros@1.1.1` (crates.io) — https://github.com/knurling-rs/defmt
- `defmt-parser@1.0.0` (crates.io) — https://github.com/knurling-rs/defmt
- `portable-atomic@1.15.0` (crates.io) — https://github.com/taiki-e/portable-atomic
- `portable-atomic-util@0.2.7` (crates.io) — https://github.com/taiki-e/portable-atomic-util
- `ref-cast@1.0.27` (crates.io) — https://github.com/dtolnay/ref-cast
- `ref-cast-impl@1.0.27` (crates.io) — https://github.com/dtolnay/ref-cast
- `serde_with_macros@3.22.0` (crates.io) — https://github.com/jonasbb/serde_with/
- `ident_case@1.0.1` (crates.io) — https://github.com/TedDriggs/ident_case
- `toml@1.1.4+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `unic-ucd-ident@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-char-property@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-char-range@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-ucd-version@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-common@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `tauri-macros@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `tauri-codegen@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `png@0.17.16` (crates.io) — https://github.com/image-rs/image-png
- `tauri-runtime@2.11.3` (crates.io) — https://github.com/tauri-apps/tauri
- `windows@0.61.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-collections@0.2.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-core@0.61.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-link@0.1.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-result@0.3.4` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-strings@0.4.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-future@0.2.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-threading@0.1.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-numerics@0.2.0` (crates.io) — https://github.com/microsoft/windows-rs
- `tauri-runtime-wry@2.11.4` (crates.io) — https://github.com/tauri-apps/tauri
- `softbuffer@0.4.8` (crates.io) — https://github.com/rust-windowing/softbuffer
- `bytemuck@1.25.2` (crates.io) — https://github.com/Lokathor/bytemuck
- `ndk@0.9.0` (crates.io) — https://github.com/rust-mobile/ndk
- `ndk-sys@0.6.0+11769913` (crates.io) — https://github.com/rust-mobile/ndk
- `num_enum@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `num_enum_derive@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `tao@0.35.3` (crates.io) — https://github.com/tauri-apps/tao
- `core-graphics@0.25.0` (crates.io) — https://github.com/servo/core-foundation-rs
- `core-graphics-types@0.2.0` (crates.io) — https://github.com/servo/core-foundation-rs
- `foreign-types@0.5.0` (crates.io) — https://github.com/sfackler/foreign-types
- `foreign-types-macros@0.2.4` (crates.io) — https://github.com/sfackler/foreign-types
- `foreign-types-shared@0.3.1` (crates.io) — https://github.com/sfackler/foreign-types
- `tao-macros@0.1.4` (crates.io) — https://github.com/tauri-apps/tao
- `windows-version@0.1.7` (crates.io) — https://github.com/microsoft/windows-rs
- `wry@0.55.1` (crates.io) — https://github.com/tauri-apps/wry
- `tray-icon@0.24.2` (crates.io) — https://github.com/tauri-apps/tray-icon
- `libappindicator@0.9.0` (crates.io) — https://crates.io/crates/libappindicator
- `libappindicator-sys@0.9.0` (crates.io) — https://crates.io/crates/libappindicator-sys
- `window-vibrancy@0.6.0` (crates.io) — https://github.com/tauri-apps/tauri-plugin-vibrancy
- `tauri-plugin-dialog@2.7.2` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `tauri-plugin@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `tauri-plugin-fs@2.5.1` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `tauri-plugin-log@2.9.0` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `android_logger@0.15.1` (crates.io) — https://github.com/rust-mobile/android_logger-rs
- `android_log-sys@0.3.2` (crates.io) — https://github.com/rust-mobile/android_log-sys-rs
- `env_filter@0.1.4` (crates.io) — https://github.com/rust-cli/env_logger
- `tauri-plugin-notification@2.3.3` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `notify-rust@4.18.0` (crates.io) — https://github.com/hoodie/notify-rust
- `mac-notification-sys@0.6.15` (crates.io) — https://github.com/h4llow3En/mac-notification-sys
- `tauri-winrt-notification@0.7.3` (crates.io) — https://github.com/tauri-apps/winrt-notification
- `rand@0.9.5` (crates.io) — https://github.com/rust-random/rand
- `rand_chacha@0.9.0` (crates.io) — https://github.com/rust-random/rand
- `rand_core@0.9.5` (crates.io) — https://github.com/rust-random/rand
- `tauri-plugin-shell@2.3.5` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `encoding_rs@0.8.35` (crates.io) — https://github.com/hsivonen/encoding_rs
- `signal-hook@0.3.18` (crates.io) — https://github.com/vorner/signal-hook
- `human-signals@2.1.0` (npm) — https://www.npmjs.com/package/human-signals
- `@mediapipe/tasks-vision@0.10.17` (npm) — https://www.npmjs.com/package/@mediapipe/tasks-vision
- `@tauri-apps/api@2.11.1` (npm) — https://www.npmjs.com/package/@tauri-apps/api
- `@tauri-apps/plugin-dialog@2.7.2` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-dialog
- `@tauri-apps/plugin-log@2.9.0` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-log
- `@tauri-apps/plugin-notification@2.3.3` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-notification
- `@tauri-apps/plugin-shell@2.3.5` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-shell
- `baseline-browser-mapping@2.11.19` (npm) — https://www.npmjs.com/package/baseline-browser-mapping
- `class-variance-authority@0.7.1` (npm) — https://www.npmjs.com/package/class-variance-authority
- `draco3d@1.5.7` (npm) — https://www.npmjs.com/package/draco3d
- `hls.js@1.7.1` (npm) — https://www.npmjs.com/package/hls.js
- `human-signals@8.0.1` (npm) — https://www.npmjs.com/package/human-signals
- `promise-worker-transferable@1.0.4` (npm) — https://www.npmjs.com/package/promise-worker-transferable
- `typescript@5.9.3` (npm) — https://www.npmjs.com/package/typescript

```text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019 ehmicky <ehmicky@gmail.com>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### Apache-2.0 WITH LLVM-exception

Declared by 6 package(s):

- `wasi@0.11.1+wasi-snapshot-preview1` (crates.io) — https://github.com/bytecodealliance/wasi
- `rustix@1.1.4` (crates.io) — https://github.com/bytecodealliance/rustix
- `linux-raw-sys@0.12.1` (crates.io) — https://github.com/sunfishcode/linux-raw-sys
- `wasip2@1.0.4+wasi-0.2.12` (crates.io) — https://github.com/bytecodealliance/wasi-rs
- `wit-bindgen@0.57.1` (crates.io) — https://github.com/bytecodealliance/wit-bindgen
- `target-lexicon@0.12.16` (crates.io) — https://github.com/bytecodealliance/target-lexicon

```text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

    TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

    1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

    2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

    3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

    4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

    5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

    6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

    7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

    8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

    9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

    END OF TERMS AND CONDITIONS

    APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

    Copyright 2019 Jack O'Connor and Samuel Neves

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.


---- LLVM Exceptions to the Apache 2.0 License ----

As an exception, if, as a result of your compiling your source code, portions
of this Software are embedded into an Object form of such source code, you
may redistribute such embedded portions in such Object form without complying
with the conditions of Sections 4(a), 4(b) and 4(d) of the License.

In addition, if you combine or link compiled forms of this Software with
software that is licensed under the GPLv2 ("Combined Software") and if a
court of competent jurisdiction determines that the patent provision (Section
3), the indemnity provision (Section 9) or other Section of the License
conflicts with the conditions of the GPLv2, you may retroactively and
prospectively choose to deem waived or otherwise exclude such Section(s) of
the License, but only in their entirety and only with respect to the Combined
Software.
```

### BSD-2-Clause

Declared by 7 package(s):

- `zerocopy@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `zerocopy-derive@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `json-schema-typed@7.0.3` (npm) — https://www.npmjs.com/package/json-schema-typed
- `dotenv@17.4.2` (npm) — https://www.npmjs.com/package/dotenv
- `esprima@4.0.1` (npm) — https://www.npmjs.com/package/esprima
- `json-schema-typed@8.0.2` (npm) — https://www.npmjs.com/package/json-schema-typed
- `stringify-object@5.0.0` (npm) — https://www.npmjs.com/package/stringify-object

```text
BSD-2-Clause License

Copyright (c) 2018 IETF Trust, Austin Wright, Henry Andrews, Geraint Luff,
and Cloudflare, Inc. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

### BSD-3-Clause

Declared by 17 package(s):

- `subtle@2.6.1` (crates.io) — https://github.com/dalek-cryptography/subtle
- `brotli@8.0.4` (crates.io) — https://github.com/dropbox/rust-brotli
- `alloc-no-stdlib@2.0.4` (crates.io) — https://github.com/dropbox/rust-alloc-no-stdlib
- `alloc-stdlib@0.2.4` (crates.io) — https://github.com/dropbox/rust-alloc-no-stdlib
- `brotli-decompressor@5.0.3` (crates.io) — https://github.com/dropbox/rust-brotli-decompressor
- `num_enum@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `num_enum_derive@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `encoding_rs@0.8.35` (crates.io) — https://github.com/hsivonen/encoding_rs
- `@dotenvx/dotenvx@1.75.1` (npm) — https://www.npmjs.com/package/@dotenvx/dotenvx
- `@dotenvx/primitives@0.8.0` (npm) — https://www.npmjs.com/package/@dotenvx/primitives
- `@webgpu/types@0.1.72` (npm) — https://www.npmjs.com/package/@webgpu/types
- `diff@8.0.4` (npm) — https://www.npmjs.com/package/diff
- `fast-uri@3.1.6` (npm) — https://www.npmjs.com/package/fast-uri
- `ieee754@1.2.1` (npm) — https://www.npmjs.com/package/ieee754
- `qs@6.15.3` (npm) — https://www.npmjs.com/package/qs
- `source-map@0.6.1` (npm) — https://www.npmjs.com/package/source-map
- `source-map-js@1.2.1` (npm) — https://www.npmjs.com/package/source-map-js

```text
BSD 3-Clause License

Copyright (c) 2024, Scott Motte

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### BSL-1.0

Declared by 1 package(s):

- `ryu@1.0.23` (crates.io) — https://github.com/dtolnay/ryu

```text
Boost Software License - Version 1.0 - August 17th, 2003

Permission is hereby granted, free of charge, to any person or organization
obtaining a copy of the software and accompanying documentation covered by
this license (the "Software") to use, reproduce, display, distribute,
execute, and transmit the Software, and to prepare derivative works of the
Software, and to permit third-parties to whom the Software is furnished to
do so, all subject to the following:

The copyright notices in the Software and this entire statement, including
the above license grant, this restriction and the following disclaimer,
must be included in all copies of the Software, in whole or in part, and
all derivative works of the Software, unless such copies or derivative
works are solely in the form of machine-executable object code generated by
a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE
FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

### BlueOak-1.0.0

Declared by 2 package(s):

- `isexe@3.1.5` (npm) — https://www.npmjs.com/package/isexe
- `minimatch@10.2.6` (npm) — https://www.npmjs.com/package/minimatch

```text
# Blue Oak Model License

Version 1.0.0

## Purpose

This license gives everyone as much permission to work with
this software as possible, while protecting contributors
from liability.

## Acceptance

In order to receive this license, you must agree to its
rules.  The rules of this license are both obligations
under that agreement and conditions to your license.
You must not do anything with this software that triggers
a rule that you cannot or will not follow.

## Copyright

Each contributor licenses you to do everything with this
software that would otherwise infringe that contributor's
copyright in it.

## Notices

You must ensure that everyone who gets a copy of
any part of this software from you, with or without
changes, also gets the text of this license or a link to
<https://blueoakcouncil.org/license/1.0.0>.

## Excuse

If anyone notifies you in writing that you have not
complied with [Notices](#notices), you can keep your
license by taking all practical steps to comply within 30
days after the notice.  If you do not do so, your license
ends immediately.

## Patent

Each contributor licenses you to do everything with this
software that would otherwise infringe any patent claims
they can license or become able to license.

## Reliability

No contributor can revoke this license.

## No Liability

***As far as the law allows, this software comes as is,
without any warranty or condition, and no contributor
will be liable to anyone for any damages related to this
software or this license, under any kind of legal claim.***
```

### CC-BY-4.0

Declared by 1 package(s):

- `caniuse-lite@1.0.30001810` (npm) — https://www.npmjs.com/package/caniuse-lite

```text
Attribution 4.0 International

=======================================================================

Creative Commons Corporation ("Creative Commons") is not a law firm and
does not provide legal services or legal advice. Distribution of
Creative Commons public licenses does not create a lawyer-client or
other relationship. Creative Commons makes its licenses and related
information available on an "as-is" basis. Creative Commons gives no
warranties regarding its licenses, any material licensed under their
terms and conditions, or any related information. Creative Commons
disclaims all liability for damages resulting from their use to the
fullest extent possible.

Using Creative Commons Public Licenses

Creative Commons public licenses provide a standard set of terms and
conditions that creators and other rights holders may use to share
original works of authorship and other material subject to copyright
and certain other rights specified in the public license below. The
following considerations are for informational purposes only, are not
exhaustive, and do not form part of our licenses.

     Considerations for licensors: Our public licenses are
     intended for use by those authorized to give the public
     permission to use material in ways otherwise restricted by
     copyright and certain other rights. Our licenses are
     irrevocable. Licensors should read and understand the terms
     and conditions of the license they choose before applying it.
     Licensors should also secure all rights necessary before
     applying our licenses so that the public can reuse the
     material as expected. Licensors should clearly mark any
     material not subject to the license. This includes other CC-
     licensed material, or material used under an exception or
     limitation to copyright. More considerations for licensors:
	wiki.creativecommons.org/Considerations_for_licensors

     Considerations for the public: By using one of our public
     licenses, a licensor grants the public permission to use the
     licensed material under specified terms and conditions. If
     the licensor's permission is not necessary for any reason--for
     example, because of any applicable exception or limitation to
     copyright--then that use is not regulated by the license. Our
     licenses grant only permissions under copyright and certain
     other rights that a licensor has authority to grant. Use of
     the licensed material may still be restricted for other
     reasons, including because others have copyright or other
     rights in the material. A licensor may make special requests,
     such as asking that all changes be marked or described.
     Although not required by our licenses, you are encouraged to
     respect those requests where reasonable. More_considerations
     for the public: 
	wiki.creativecommons.org/Considerations_for_licensees

=======================================================================

Creative Commons Attribution 4.0 International Public License

By exercising the Licensed Rights (defined below), You accept and agree
to be bound by the terms and conditions of this Creative Commons
Attribution 4.0 International Public License ("Public License"). To the
extent this Public License may be interpreted as a contract, You are
granted the Licensed Rights in consideration of Your acceptance of
these terms and conditions, and the Licensor grants You such rights in
consideration of benefits the Licensor receives from making the
Licensed Material available under these terms and conditions.


Section 1 -- Definitions.

  a. Adapted Material means material subject to Copyright and Similar
     Rights that is derived from or based upon the Licensed Material
     and in which the Licensed Material is translated, altered,
     arranged, transformed, or otherwise modified in a manner requiring
     permission under the Copyright and Similar Rights held by the
     Licensor. For purposes of this Public License, where the Licensed
     Material is a musical work, performance, or sound recording,
     Adapted Material is always produced where the Licensed Material is
     synched in timed relation with a moving image.

  b. Adapter's License means the license You apply to Your Copyright
     and Similar Rights in Your contributions to Adapted Material in
     accordance with the terms and conditions of this Public License.

  c. Copyright and Similar Rights means copyright and/or similar rights
     closely related to copyright including, without limitation,
     performance, broadcast, sound recording, and Sui Generis Database
     Rights, without regard to how the rights are labeled or
     categorized. For purposes of this Public License, the rights
     specified in Section 2(b)(1)-(2) are not Copyright and Similar
     Rights.

  d. Effective Technological Measures means those measures that, in the
     absence of proper authority, may not be circumvented under laws
     fulfilling obligations under Article 11 of the WIPO Copyright
     Treaty adopted on December 20, 1996, and/or similar international
     agreements.

  e. Exceptions and Limitations means fair use, fair dealing, and/or
     any other exception or limitation to Copyright and Similar Rights
     that applies to Your use of the Licensed Material.

  f. Licensed Material means the artistic or literary work, database,
     or other material to which the Licensor applied this Public
     License.

  g. Licensed Rights means the rights granted to You subject to the
     terms and conditions of this Public License, which are limited to
     all Copyright and Similar Rights that apply to Your use of the
     Licensed Material and that the Licensor has authority to license.

  h. Licensor means the individual(s) or entity(ies) granting rights
     under this Public License.

  i. Share means to provide material to the public by any means or
     process that requires permission under the Licensed Rights, such
     as reproduction, public display, public performance, distribution,
     dissemination, communication, or importation, and to make material
     available to the public including in ways that members of the
     public may access the material from a place and at a time
     individually chosen by them.

  j. Sui Generis Database Rights means rights other than copyright
     resulting from Directive 96/9/EC of the European Parliament and of
     the Council of 11 March 1996 on the legal protection of databases,
     as amended and/or succeeded, as well as other essentially
     equivalent rights anywhere in the world.

  k. You means the individual or entity exercising the Licensed Rights
     under this Public License. Your has a corresponding meaning.


Section 2 -- Scope.

  a. License grant.

       1. Subject to the terms and conditions of this Public License,
          the Licensor hereby grants You a worldwide, royalty-free,
          non-sublicensable, non-exclusive, irrevocable license to
          exercise the Licensed Rights in the Licensed Material to:

            a. reproduce and Share the Licensed Material, in whole or
               in part; and

            b. produce, reproduce, and Share Adapted Material.

       2. Exceptions and Limitations. For the avoidance of doubt, where
          Exceptions and Limitations apply to Your use, this Public
          License does not apply, and You do not need to comply with
          its terms and conditions.

       3. Term. The term of this Public License is specified in Section
          6(a).

       4. Media and formats; technical modifications allowed. The
          Licensor authorizes You to exercise the Licensed Rights in
          all media and formats whether now known or hereafter created,
          and to make technical modifications necessary to do so. The
          Licensor waives and/or agrees not to assert any right or
          authority to forbid You from making technical modifications
          necessary to exercise the Licensed Rights, including
          technical modifications necessary to circumvent Effective
          Technological Measures. For purposes of this Public License,
          simply making modifications authorized by this Section 2(a)
          (4) never produces Adapted Material.

       5. Downstream recipients.

            a. Offer from the Licensor -- Licensed Material. Every
               recipient of the Licensed Material automatically
               receives an offer from the Licensor to exercise the
               Licensed Rights under the terms and conditions of this
               Public License.

            b. No downstream restrictions. You may not offer or impose
               any additional or different terms or conditions on, or
               apply any Effective Technological Measures to, the
               Licensed Material if doing so restricts exercise of the
               Licensed Rights by any recipient of the Licensed
               Material.

       6. No endorsement. Nothing in this Public License constitutes or
          may be construed as permission to assert or imply that You
          are, or that Your use of the Licensed Material is, connected
          with, or sponsored, endorsed, or granted official status by,
          the Licensor or others designated to receive attribution as
          provided in Section 3(a)(1)(A)(i).

  b. Other rights.

       1. Moral rights, such as the right of integrity, are not
          licensed under this Public License, nor are publicity,
          privacy, and/or other similar personality rights; however, to
          the extent possible, the Licensor waives and/or agrees not to
          assert any such rights held by the Licensor to the limited
          extent necessary to allow You to exercise the Licensed
          Rights, but not otherwise.

       2. Patent and trademark rights are not licensed under this
          Public License.

       3. To the extent possible, the Licensor waives any right to
          collect royalties from You for the exercise of the Licensed
          Rights, whether directly or through a collecting society
          under any voluntary or waivable statutory or compulsory
          licensing scheme. In all other cases the Licensor expressly
          reserves any right to collect such royalties.


Section 3 -- License Conditions.

Your exercise of the Licensed Rights is expressly made subject to the
following conditions.

  a. Attribution.

       1. If You Share the Licensed Material (including in modified
          form), You must:

            a. retain the following if it is supplied by the Licensor
               with the Licensed Material:

                 i. identification of the creator(s) of the Licensed
                    Material and any others designated to receive
                    attribution, in any reasonable manner requested by
                    the Licensor (including by pseudonym if
                    designated);

                ii. a copyright notice;

               iii. a notice that refers to this Public License;

                iv. a notice that refers to the disclaimer of
                    warranties;

                 v. a URI or hyperlink to the Licensed Material to the
                    extent reasonably practicable;

            b. indicate if You modified the Licensed Material and
               retain an indication of any previous modifications; and

            c. indicate the Licensed Material is licensed under this
               Public License, and include the text of, or the URI or
               hyperlink to, this Public License.

       2. You may satisfy the conditions in Section 3(a)(1) in any
          reasonable manner based on the medium, means, and context in
          which You Share the Licensed Material. For example, it may be
          reasonable to satisfy the conditions by providing a URI or
          hyperlink to a resource that includes the required
          information.

       3. If requested by the Licensor, You must remove any of the
          information required by Section 3(a)(1)(A) to the extent
          reasonably practicable.

       4. If You Share Adapted Material You produce, the Adapter's
          License You apply must not prevent recipients of the Adapted
          Material from complying with this Public License.


Section 4 -- Sui Generis Database Rights.

Where the Licensed Rights include Sui Generis Database Rights that
apply to Your use of the Licensed Material:

  a. for the avoidance of doubt, Section 2(a)(1) grants You the right
     to extract, reuse, reproduce, and Share all or a substantial
     portion of the contents of the database;

  b. if You include all or a substantial portion of the database
     contents in a database in which You have Sui Generis Database
     Rights, then the database in which You have Sui Generis Database
     Rights (but not its individual contents) is Adapted Material; and

  c. You must comply with the conditions in Section 3(a) if You Share
     all or a substantial portion of the contents of the database.

For the avoidance of doubt, this Section 4 supplements and does not
replace Your obligations under this Public License where the Licensed
Rights include other Copyright and Similar Rights.


Section 5 -- Disclaimer of Warranties and Limitation of Liability.

  a. UNLESS OTHERWISE SEPARATELY UNDERTAKEN BY THE LICENSOR, TO THE
     EXTENT POSSIBLE, THE LICENSOR OFFERS THE LICENSED MATERIAL AS-IS
     AND AS-AVAILABLE, AND MAKES NO REPRESENTATIONS OR WARRANTIES OF
     ANY KIND CONCERNING THE LICENSED MATERIAL, WHETHER EXPRESS,
     IMPLIED, STATUTORY, OR OTHER. THIS INCLUDES, WITHOUT LIMITATION,
     WARRANTIES OF TITLE, MERCHANTABILITY, FITNESS FOR A PARTICULAR
     PURPOSE, NON-INFRINGEMENT, ABSENCE OF LATENT OR OTHER DEFECTS,
     ACCURACY, OR THE PRESENCE OR ABSENCE OF ERRORS, WHETHER OR NOT
     KNOWN OR DISCOVERABLE. WHERE DISCLAIMERS OF WARRANTIES ARE NOT
     ALLOWED IN FULL OR IN PART, THIS DISCLAIMER MAY NOT APPLY TO YOU.

  b. TO THE EXTENT POSSIBLE, IN NO EVENT WILL THE LICENSOR BE LIABLE
     TO YOU ON ANY LEGAL THEORY (INCLUDING, WITHOUT LIMITATION,
     NEGLIGENCE) OR OTHERWISE FOR ANY DIRECT, SPECIAL, INDIRECT,
     INCIDENTAL, CONSEQUENTIAL, PUNITIVE, EXEMPLARY, OR OTHER LOSSES,
     COSTS, EXPENSES, OR DAMAGES ARISING OUT OF THIS PUBLIC LICENSE OR
     USE OF THE LICENSED MATERIAL, EVEN IF THE LICENSOR HAS BEEN
     ADVISED OF THE POSSIBILITY OF SUCH LOSSES, COSTS, EXPENSES, OR
     DAMAGES. WHERE A LIMITATION OF LIABILITY IS NOT ALLOWED IN FULL OR
     IN PART, THIS LIMITATION MAY NOT APPLY TO YOU.

  c. The disclaimer of warranties and limitation of liability provided
     above shall be interpreted in a manner that, to the extent
     possible, most closely approximates an absolute disclaimer and
     waiver of all liability.


Section 6 -- Term and Termination.

  a. This Public License applies for the term of the Copyright and
     Similar Rights licensed here. However, if You fail to comply with
     this Public License, then Your rights under this Public License
     terminate automatically.

  b. Where Your right to use the Licensed Material has terminated under
     Section 6(a), it reinstates:

       1. automatically as of the date the violation is cured, provided
          it is cured within 30 days of Your discovery of the
          violation; or

       2. upon express reinstatement by the Licensor.

     For the avoidance of doubt, this Section 6(b) does not affect any
     right the Licensor may have to seek remedies for Your violations
     of this Public License.

  c. For the avoidance of doubt, the Licensor may also offer the
     Licensed Material under separate terms or conditions or stop
     distributing the Licensed Material at any time; however, doing so
     will not terminate this Public License.

  d. Sections 1, 5, 6, 7, and 8 survive termination of this Public
     License.


Section 7 -- Other Terms and Conditions.

  a. The Licensor shall not be bound by any additional or different
     terms or conditions communicated by You unless expressly agreed.

  b. Any arrangements, understandings, or agreements regarding the
     Licensed Material not stated herein are separate from and
     independent of the terms and conditions of this Public License.


Section 8 -- Interpretation.

  a. For the avoidance of doubt, this Public License does not, and
     shall not be interpreted to, reduce, limit, restrict, or impose
     conditions on any use of the Licensed Material that could lawfully
     be made without permission under this Public License.

  b. To the extent possible, if any provision of this Public License is
     deemed unenforceable, it shall be automatically reformed to the
     minimum extent necessary to make it enforceable. If the provision
     cannot be reformed, it shall be severed from this Public License
     without affecting the enforceability of the remaining terms and
     conditions.

  c. No term or condition of this Public License will be waived and no
     failure to comply consented to unless expressly agreed to by the
     Licensor.

  d. Nothing in this Public License constitutes or may be interpreted
     as a limitation upon, or waiver of, any privileges and immunities
     that apply to the Licensor or You, including from the legal
     processes of any jurisdiction or authority.


=======================================================================

Creative Commons is not a party to its public
licenses. Notwithstanding, Creative Commons may elect to apply one of
its public licenses to material it publishes and in those instances
will be considered the “Licensor.” The text of the Creative Commons
public licenses is dedicated to the public domain under the CC0 Public
Domain Dedication. Except for the limited purpose of indicating that
material is shared under a Creative Commons public license or as
otherwise permitted by the Creative Commons policies published at
creativecommons.org/policies, Creative Commons does not authorize the
use of the trademark "Creative Commons" or any other trademark or logo
of Creative Commons without its prior written consent including,
without limitation, in connection with any unauthorized modifications
to any of its public licenses or any other arrangements,
understandings, or agreements concerning use of licensed material. For
the avoidance of doubt, this paragraph does not form part of the
public licenses.

Creative Commons may be contacted at creativecommons.org.
```

### CC0-1.0

Declared by 1 package(s):

- `dunce@1.0.5` (crates.io) — https://gitlab.com/kornelski/dunce

```text
Creative Commons Legal Code

CC0 1.0 Universal

    CREATIVE COMMONS CORPORATION IS NOT A LAW FIRM AND DOES NOT PROVIDE
    LEGAL SERVICES. DISTRIBUTION OF THIS DOCUMENT DOES NOT CREATE AN
    ATTORNEY-CLIENT RELATIONSHIP. CREATIVE COMMONS PROVIDES THIS
    INFORMATION ON AN "AS-IS" BASIS. CREATIVE COMMONS MAKES NO WARRANTIES
    REGARDING THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS
    PROVIDED HEREUNDER, AND DISCLAIMS LIABILITY FOR DAMAGES RESULTING FROM
    THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS PROVIDED
    HEREUNDER.

Statement of Purpose

The laws of most jurisdictions throughout the world automatically confer
exclusive Copyright and Related Rights (defined below) upon the creator
and subsequent owner(s) (each and all, an "owner") of an original work of
authorship and/or a database (each, a "Work").

Certain owners wish to permanently relinquish those rights to a Work for
the purpose of contributing to a commons of creative, cultural and
scientific works ("Commons") that the public can reliably and without fear
of later claims of infringement build upon, modify, incorporate in other
works, reuse and redistribute as freely as possible in any form whatsoever
and for any purposes, including without limitation commercial purposes.
These owners may contribute to the Commons to promote the ideal of a free
culture and the further production of creative, cultural and scientific
works, or to gain reputation or greater distribution for their Work in
part through the use and efforts of others.

For these and/or other purposes and motivations, and without any
expectation of additional consideration or compensation, the person
associating CC0 with a Work (the "Affirmer"), to the extent that he or she
is an owner of Copyright and Related Rights in the Work, voluntarily
elects to apply CC0 to the Work and publicly distribute the Work under its
terms, with knowledge of his or her Copyright and Related Rights in the
Work and the meaning and intended legal effect of CC0 on those rights.

1. Copyright and Related Rights. A Work made available under CC0 may be
protected by copyright and related or neighboring rights ("Copyright and
Related Rights"). Copyright and Related Rights include, but are not
limited to, the following:

  i. the right to reproduce, adapt, distribute, perform, display,
     communicate, and translate a Work;
 ii. moral rights retained by the original author(s) and/or performer(s);
iii. publicity and privacy rights pertaining to a person's image or
     likeness depicted in a Work;
 iv. rights protecting against unfair competition in regards to a Work,
     subject to the limitations in paragraph 4(a), below;
  v. rights protecting the extraction, dissemination, use and reuse of data
     in a Work;
 vi. database rights (such as those arising under Directive 96/9/EC of the
     European Parliament and of the Council of 11 March 1996 on the legal
     protection of databases, and under any national implementation
     thereof, including any amended or successor version of such
     directive); and
vii. other similar, equivalent or corresponding rights throughout the
     world based on applicable law or treaty, and any national
     implementations thereof.

2. Waiver. To the greatest extent permitted by, but not in contravention
of, applicable law, Affirmer hereby overtly, fully, permanently,
irrevocably and unconditionally waives, abandons, and surrenders all of
Affirmer's Copyright and Related Rights and associated claims and causes
of action, whether now known or unknown (including existing as well as
future claims and causes of action), in the Work (i) in all territories
worldwide, (ii) for the maximum duration provided by applicable law or
treaty (including future time extensions), (iii) in any current or future
medium and for any number of copies, and (iv) for any purpose whatsoever,
including without limitation commercial, advertising or promotional
purposes (the "Waiver"). Affirmer makes the Waiver for the benefit of each
member of the public at large and to the detriment of Affirmer's heirs and
successors, fully intending that such Waiver shall not be subject to
revocation, rescission, cancellation, termination, or any other legal or
equitable action to disrupt the quiet enjoyment of the Work by the public
as contemplated by Affirmer's express Statement of Purpose.

3. Public License Fallback. Should any part of the Waiver for any reason
be judged legally invalid or ineffective under applicable law, then the
Waiver shall be preserved to the maximum extent permitted taking into
account Affirmer's express Statement of Purpose. In addition, to the
extent the Waiver is so judged Affirmer hereby grants to each affected
person a royalty-free, non transferable, non sublicensable, non exclusive,
irrevocable and unconditional license to exercise Affirmer's Copyright and
Related Rights in the Work (i) in all territories worldwide, (ii) for the
maximum duration provided by applicable law or treaty (including future
time extensions), (iii) in any current or future medium and for any number
of copies, and (iv) for any purpose whatsoever, including without
limitation commercial, advertising or promotional purposes (the
"License"). The License shall be deemed effective as of the date CC0 was
applied by Affirmer to the Work. Should any part of the License for any
reason be judged legally invalid or ineffective under applicable law, such
partial invalidity or ineffectiveness shall not invalidate the remainder
of the License, and in such case Affirmer hereby affirms that he or she
will not (i) exercise any of his or her remaining Copyright and Related
Rights in the Work or (ii) assert any associated claims and causes of
action with respect to the Work, in either case contrary to Affirmer's
express Statement of Purpose.

4. Limitations and Disclaimers.

 a. No trademark or patent rights held by Affirmer are waived, abandoned,
    surrendered, licensed or otherwise affected by this document.
 b. Affirmer offers the Work as-is and makes no representations or
    warranties of any kind concerning the Work, express, implied,
    statutory or otherwise, including without limitation warranties of
    title, merchantability, fitness for a particular purpose, non
    infringement, or the absence of latent or other defects, accuracy, or
    the present or absence of errors, whether or not discoverable, all to
    the greatest extent permissible under applicable law.
 c. Affirmer disclaims responsibility for clearing rights of other persons
    that may apply to the Work or any use thereof, including without
    limitation any person's Copyright and Related Rights in the Work.
    Further, Affirmer disclaims responsibility for obtaining any necessary
    consents, permissions or other rights required for any use of the
    Work.
 d. Affirmer understands and acknowledges that Creative Commons is not a
    party to this document and has no duty or obligation with respect to
    this CC0 or use of the Work.
```

### ISC

Declared by 29 package(s):

- `hyper-rustls@0.27.9` (crates.io) — https://github.com/rustls/hyper-rustls
- `rustls@0.23.43` (crates.io) — https://github.com/rustls/rustls
- `ring@0.17.14` (crates.io) — https://github.com/briansmith/ring
- `untrusted@0.9.0` (crates.io) — https://github.com/briansmith/untrusted
- `rustls-webpki@0.103.15` (crates.io) — https://github.com/rustls/webpki
- `rustls-native-certs@0.8.4` (crates.io) — https://github.com/rustls/rustls-native-certs
- `libloading@0.7.4` (crates.io) — https://github.com/nagisa/rust_libloading/
- `signal-exit@3.0.7` (npm) — https://www.npmjs.com/package/signal-exit
- `which@4.0.0` (npm) — https://www.npmjs.com/package/which
- `semver@7.8.5` (npm) — https://www.npmjs.com/package/semver
- `electron-to-chromium@1.5.414` (npm) — https://www.npmjs.com/package/electron-to-chromium
- `glob-parent@5.1.2` (npm) — https://www.npmjs.com/package/glob-parent
- `fastq@1.20.1` (npm) — https://www.npmjs.com/package/fastq
- `graceful-fs@4.2.11` (npm) — https://www.npmjs.com/package/graceful-fs
- `inherits@2.0.4` (npm) — https://www.npmjs.com/package/inherits
- `isexe@2.0.0` (npm) — https://www.npmjs.com/package/isexe
- `lru-cache@5.1.1` (npm) — https://www.npmjs.com/package/lru-cache
- `lucide-react@0.460.0` (npm) — https://www.npmjs.com/package/lucide-react
- `once@1.4.0` (npm) — https://www.npmjs.com/package/once
- `picocolors@1.1.1` (npm) — https://www.npmjs.com/package/picocolors
- `potpack@1.0.2` (npm) — https://www.npmjs.com/package/potpack
- `semver@6.3.1` (npm) — https://www.npmjs.com/package/semver
- `setprototypeof@1.2.0` (npm) — https://www.npmjs.com/package/setprototypeof
- `signal-exit@4.1.0` (npm) — https://www.npmjs.com/package/signal-exit
- `validate-npm-package-name@7.0.2` (npm) — https://www.npmjs.com/package/validate-npm-package-name
- `which@2.0.2` (npm) — https://www.npmjs.com/package/which
- `wrappy@1.0.2` (npm) — https://www.npmjs.com/package/wrappy
- `yallist@3.1.1` (npm) — https://www.npmjs.com/package/yallist
- `zod-to-json-schema@3.25.2` (npm) — https://www.npmjs.com/package/zod-to-json-schema

```text
The ISC License

Copyright (c) 2015, Contributors

Permission to use, copy, modify, and/or distribute this software
for any purpose with or without fee is hereby granted, provided
that the above copyright notice and this permission notice
appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE
LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### LGPL-2.1-or-later

Declared by 2 package(s):

- `r-efi@6.0.0` (crates.io) — https://github.com/r-efi/r-efi
- `r-efi@5.3.0` (crates.io) — https://github.com/r-efi/r-efi

> **Licence text not bundled.** This identifier appears in the dependency
> graph, but no matching licence file was available on the machine that
> generated this file. See the upstream sources above for the authoritative
> text. This is a recorded limitation, not an omission.

### MIT

Declared by 926 package(s):

- `anyhow@1.0.104` (crates.io) — https://github.com/dtolnay/anyhow
- `async-trait@0.1.92` (crates.io) — https://github.com/dtolnay/async-trait
- `proc-macro2@1.0.107` (crates.io) — https://github.com/dtolnay/proc-macro2
- `unicode-ident@1.0.24` (crates.io) — https://github.com/dtolnay/unicode-ident
- `quote@1.0.47` (crates.io) — https://github.com/dtolnay/quote
- `syn@3.0.4` (crates.io) — https://github.com/dtolnay/syn
- `base64@0.22.1` (crates.io) — https://github.com/marshallpierce/rust-base64
- `chrono@0.4.45` (crates.io) — https://github.com/chronotope/chrono
- `iana-time-zone@0.1.65` (crates.io) — https://github.com/strawlab/iana-time-zone
- `android_system_properties@0.1.6` (crates.io) — https://github.com/nical/android_system_properties
- `libc@0.2.189` (crates.io) — https://github.com/rust-lang/libc
- `core-foundation-sys@0.8.7` (crates.io) — https://github.com/servo/core-foundation-rs
- `iana-time-zone-haiku@0.1.2` (crates.io) — https://github.com/strawlab/iana-time-zone
- `cc@1.4.4` (crates.io) — https://github.com/rust-lang/cc-rs
- `find-msvc-tools@0.1.11` (crates.io) — https://github.com/rust-lang/cc-rs
- `shlex@2.0.1` (crates.io) — https://github.com/comex/rust-shlex
- `js-sys@0.3.104` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/js-sys
- `cfg-if@1.0.4` (crates.io) — https://github.com/rust-lang/cfg-if
- `futures-util@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-channel@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-core@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-sink@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-io@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-macro@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `futures-task@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `memchr@2.8.3` (crates.io) — https://github.com/BurntSushi/memchr
- `pin-project-lite@0.2.17` (crates.io) — https://github.com/taiki-e/pin-project-lite
- `slab@0.4.12` (crates.io) — https://github.com/tokio-rs/slab
- `wasm-bindgen@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen
- `once_cell@1.21.4` (crates.io) — https://github.com/matklad/once_cell
- `rustversion@1.0.23` (crates.io) — https://github.com/dtolnay/rustversion
- `wasm-bindgen-macro@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro
- `wasm-bindgen-macro-support@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro-support
- `bumpalo@3.20.3` (crates.io) — https://github.com/fitzgen/bumpalo
- `syn@2.0.119` (crates.io) — https://github.com/dtolnay/syn
- `wasm-bindgen-shared@0.2.127` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/shared
- `log@0.4.34` (crates.io) — https://github.com/rust-lang/log
- `windows-core@0.62.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-implement@0.60.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-interface@0.59.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-link@0.2.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-result@0.4.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-strings@0.5.1` (crates.io) — https://github.com/microsoft/windows-rs
- `num-traits@0.2.19` (crates.io) — https://github.com/rust-num/num-traits
- `autocfg@1.5.1` (crates.io) — https://github.com/cuviper/autocfg
- `serde@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `serde_core@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `serde_derive@1.0.229` (crates.io) — https://github.com/serde-rs/serde
- `hex@0.4.3` (crates.io) — https://github.com/KokaKiwi/rust-hex
- `keyring@3.6.3` (crates.io) — https://github.com/hwchen/keyring-rs.git
- `byteorder@1.5.0` (crates.io) — https://github.com/BurntSushi/byteorder
- `dbus-secret-service@4.1.0` (crates.io) — https://github.com/brotskydotcom/dbus-secret-service.git
- `aes@0.8.4` (crates.io) — https://github.com/RustCrypto/block-ciphers
- `cipher@0.4.4` (crates.io) — https://github.com/RustCrypto/traits
- `crypto-common@0.1.7` (crates.io) — https://github.com/RustCrypto/traits
- `generic-array@0.14.7` (crates.io) — https://github.com/fizyk20/generic-array.git
- `typenum@1.20.1` (crates.io) — https://github.com/paholg/typenum
- `version_check@0.9.5` (crates.io) — https://github.com/SergioBenitez/version_check
- `inout@0.1.4` (crates.io) — https://github.com/RustCrypto/utils
- `block-padding@0.3.3` (crates.io) — https://github.com/RustCrypto/utils
- `cpufeatures@0.2.17` (crates.io) — https://github.com/RustCrypto/utils
- `cbc@0.1.2` (crates.io) — https://github.com/RustCrypto/block-modes
- `dbus@0.9.12` (crates.io) — https://github.com/diwic/dbus-rs
- `libdbus-sys@0.2.7` (crates.io) — https://github.com/diwic/dbus-rs
- `pkg-config@0.3.34` (crates.io) — https://github.com/rust-lang/pkg-config-rs
- `windows-sys@0.61.2` (crates.io) — https://github.com/microsoft/windows-rs
- `fastrand@2.5.0` (crates.io) — https://github.com/smol-rs/fastrand
- `hkdf@0.12.4` (crates.io) — https://github.com/RustCrypto/KDFs/
- `hmac@0.12.1` (crates.io) — https://github.com/RustCrypto/MACs
- `digest@0.10.7` (crates.io) — https://github.com/RustCrypto/traits
- `block-buffer@0.10.4` (crates.io) — https://github.com/RustCrypto/utils
- `num@0.4.3` (crates.io) — https://github.com/rust-num/num
- `num-bigint@0.4.8` (crates.io) — https://github.com/rust-num/num-bigint
- `num-integer@0.1.47` (crates.io) — https://github.com/rust-num/num-integer
- `num-complex@0.4.6` (crates.io) — https://github.com/rust-num/num-complex
- `num-iter@0.1.46` (crates.io) — https://github.com/rust-num/num-iter
- `num-rational@0.4.2` (crates.io) — https://github.com/rust-num/num-rational
- `sha2@0.10.9` (crates.io) — https://github.com/RustCrypto/hashes
- `zeroize@1.9.0` (crates.io) — https://github.com/RustCrypto/utils
- `zeroize_derive@1.5.0` (crates.io) — https://github.com/RustCrypto/utils
- `secret-service@4.0.0` (crates.io) — https://github.com/hwchen/secret-service-rs.git
- `rand@0.8.8` (crates.io) — https://github.com/rust-random/rand
- `rand_chacha@0.3.1` (crates.io) — https://github.com/rust-random/rand
- `ppv-lite86@0.2.21` (crates.io) — https://github.com/cryptocorrosion/cryptocorrosion
- `zerocopy@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `zerocopy-derive@0.8.56` (crates.io) — https://github.com/google/zerocopy
- `rand_core@0.6.4` (crates.io) — https://github.com/rust-random/rand
- `getrandom@0.2.17` (crates.io) — https://github.com/rust-random/getrandom
- `wasi@0.11.1+wasi-snapshot-preview1` (crates.io) — https://github.com/bytecodealliance/wasi
- `zbus@4.4.0` (crates.io) — https://github.com/dbus2/zbus/
- `async-broadcast@0.7.2` (crates.io) — https://github.com/smol-rs/async-broadcast
- `event-listener@5.4.2` (crates.io) — https://github.com/smol-rs/event-listener
- `parking@2.2.1` (crates.io) — https://github.com/smol-rs/parking
- `event-listener-strategy@0.5.4` (crates.io) — https://github.com/smol-rs/event-listener-strategy
- `async-executor@1.14.0` (crates.io) — https://github.com/smol-rs/async-executor
- `async-task@4.7.1` (crates.io) — https://github.com/smol-rs/async-task
- `concurrent-queue@2.5.0` (crates.io) — https://github.com/smol-rs/concurrent-queue
- `crossbeam-utils@0.8.22` (crates.io) — https://github.com/crossbeam-rs/crossbeam
- `futures-lite@2.6.1` (crates.io) — https://github.com/smol-rs/futures-lite
- `async-fs@2.2.0` (crates.io) — https://github.com/smol-rs/async-fs
- `async-lock@3.4.2` (crates.io) — https://github.com/smol-rs/async-lock
- `blocking@1.7.0` (crates.io) — https://github.com/smol-rs/blocking
- `async-channel@2.5.0` (crates.io) — https://github.com/smol-rs/async-channel
- `piper@0.2.5` (crates.io) — https://github.com/smol-rs/piper
- `atomic-waker@1.1.2` (crates.io) — https://github.com/smol-rs/atomic-waker
- `async-io@2.6.0` (crates.io) — https://github.com/smol-rs/async-io
- `polling@3.11.0` (crates.io) — https://github.com/smol-rs/polling
- `hermit-abi@0.5.2` (crates.io) — https://github.com/hermit-os/hermit-rs
- `rustix@1.1.4` (crates.io) — https://github.com/bytecodealliance/rustix
- `bitflags@2.13.1` (crates.io) — https://github.com/bitflags/bitflags
- `errno@0.3.14` (crates.io) — https://github.com/lambda-fairy/rust-errno
- `linux-raw-sys@0.12.1` (crates.io) — https://github.com/sunfishcode/linux-raw-sys
- `async-process@2.5.0` (crates.io) — https://github.com/smol-rs/async-process
- `async-signal@0.2.14` (crates.io) — https://github.com/smol-rs/async-signal
- `signal-hook-registry@1.4.8` (crates.io) — https://github.com/vorner/signal-hook
- `async-recursion@1.1.1` (crates.io) — https://github.com/dcchut/async-recursion
- `enumflags2@0.7.12` (crates.io) — https://github.com/meithecatte/enumflags2
- `enumflags2_derive@0.7.12` (crates.io) — https://github.com/meithecatte/enumflags2
- `nix@0.29.0` (crates.io) — https://github.com/nix-rust/nix
- `cfg_aliases@0.2.2` (crates.io) — https://github.com/katharostech/cfg_aliases
- `memoffset@0.9.1` (crates.io) — https://github.com/Gilnaa/memoffset
- `ordered-stream@0.2.0` (crates.io) — https://github.com/danieldg/ordered-stream
- `serde_repr@0.1.21` (crates.io) — https://github.com/dtolnay/serde-repr
- `sha1@0.10.7` (crates.io) — https://github.com/RustCrypto/hashes
- `static_assertions@1.1.0` (crates.io) — https://github.com/nvzqz/static-assertions-rs
- `tokio@1.53.1` (crates.io) — https://github.com/tokio-rs/tokio
- `bytes@1.12.1` (crates.io) — https://github.com/tokio-rs/bytes
- `mio@1.2.2` (crates.io) — https://github.com/tokio-rs/mio
- `parking_lot@0.12.5` (crates.io) — https://github.com/Amanieu/parking_lot
- `lock_api@0.4.14` (crates.io) — https://github.com/Amanieu/parking_lot
- `scopeguard@1.2.0` (crates.io) — https://github.com/bluss/scopeguard
- `parking_lot_core@0.9.12` (crates.io) — https://github.com/Amanieu/parking_lot
- `redox_syscall@0.5.18` (crates.io) — https://gitlab.redox-os.org/redox-os/syscall
- `smallvec@1.15.2` (crates.io) — https://github.com/servo/rust-smallvec
- `socket2@0.6.5` (crates.io) — https://github.com/rust-lang/socket2
- `tokio-macros@2.7.2` (crates.io) — https://github.com/tokio-rs/tokio
- `tracing@0.1.44` (crates.io) — https://github.com/tokio-rs/tracing
- `tracing-attributes@0.1.31` (crates.io) — https://github.com/tokio-rs/tracing
- `tracing-core@0.1.36` (crates.io) — https://github.com/tokio-rs/tracing
- `uds_windows@1.2.1` (crates.io) — https://github.com/haraldh/rust_uds_windows
- `tempfile@3.27.0` (crates.io) — https://github.com/Stebalien/tempfile
- `getrandom@0.4.3` (crates.io) — https://github.com/rust-random/getrandom
- `r-efi@6.0.0` (crates.io) — https://github.com/r-efi/r-efi
- `rand_core@0.10.1` (crates.io) — https://github.com/rust-random/rand_core
- `windows-sys@0.52.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.52.6` (crates.io) — https://github.com/microsoft/windows-rs
- `xdg-home@1.3.0` (crates.io) — https://github.com/zeenix/xdg-home
- `windows-sys@0.59.0` (crates.io) — https://github.com/microsoft/windows-rs
- `zbus_macros@4.4.0` (crates.io) — https://github.com/dbus2/zbus/
- `proc-macro-crate@3.5.0` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `toml_edit@0.25.13+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `indexmap@2.14.0` (crates.io) — https://github.com/indexmap-rs/indexmap
- `equivalent@1.0.2` (crates.io) — https://github.com/indexmap-rs/equivalent
- `hashbrown@0.17.1` (crates.io) — https://github.com/rust-lang/hashbrown
- `toml_datetime@1.1.1+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `toml_parser@1.1.3+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `winnow@1.0.4` (crates.io) — https://github.com/winnow-rs/winnow
- `zvariant_utils@2.1.0` (crates.io) — https://github.com/dbus2/zbus/
- `zbus_names@3.0.0` (crates.io) — https://github.com/dbus2/zbus/
- `zvariant@4.2.0` (crates.io) — https://github.com/dbus2/zbus/
- `endi@1.1.1` (crates.io) — https://github.com/zeenix/endi
- `zvariant_derive@4.2.0` (crates.io) — https://github.com/dbus2/zbus/
- `security-framework@2.11.1` (crates.io) — https://github.com/kornelski/rust-security-framework
- `core-foundation@0.9.4` (crates.io) — https://github.com/servo/core-foundation-rs
- `security-framework-sys@2.17.0` (crates.io) — https://github.com/kornelski/rust-security-framework
- `security-framework@3.7.0` (crates.io) — https://github.com/kornelski/rust-security-framework
- `core-foundation@0.10.1` (crates.io) — https://github.com/servo/core-foundation-rs
- `windows-sys@0.60.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.53.5` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.53.1` (crates.io) — https://github.com/microsoft/windows-rs
- `reqwest@0.12.28` (crates.io) — https://github.com/seanmonstar/reqwest
- `http@1.5.0` (crates.io) — https://github.com/hyperium/http
- `itoa@1.0.18` (crates.io) — https://github.com/dtolnay/itoa
- `http-body@1.1.0` (crates.io) — https://github.com/hyperium/http-body
- `http-body-util@0.1.5` (crates.io) — https://github.com/hyperium/http-body
- `hyper@1.11.0` (crates.io) — https://github.com/hyperium/hyper
- `h2@0.4.19` (crates.io) — https://github.com/hyperium/h2
- `fnv@1.0.7` (crates.io) — https://github.com/servo/rust-fnv
- `tokio-util@0.7.19` (crates.io) — https://github.com/tokio-rs/tokio
- `httparse@1.10.1` (crates.io) — https://github.com/seanmonstar/httparse
- `httpdate@1.0.3` (crates.io) — https://github.com/pyfisch/httpdate
- `want@0.3.1` (crates.io) — https://github.com/seanmonstar/want
- `try-lock@0.2.5` (crates.io) — https://github.com/seanmonstar/try-lock
- `hyper-rustls@0.27.9` (crates.io) — https://github.com/rustls/hyper-rustls
- `hyper-util@0.1.20` (crates.io) — https://github.com/hyperium/hyper-util
- `ipnet@2.12.1` (crates.io) — https://github.com/krisprice/ipnet
- `percent-encoding@2.3.2` (crates.io) — https://github.com/servo/rust-url/
- `tower-service@0.3.3` (crates.io) — https://github.com/tower-rs/tower
- `rustls@0.23.43` (crates.io) — https://github.com/rustls/rustls
- `rustls-pki-types@1.15.1` (crates.io) — https://github.com/rustls/pki-types
- `web-time@1.1.0` (crates.io) — https://github.com/daxpedda/web-time
- `rustls-native-certs@0.8.4` (crates.io) — https://github.com/rustls/rustls-native-certs
- `openssl-probe@0.2.1` (crates.io) — https://github.com/rustls/openssl-probe
- `schannel@0.1.29` (crates.io) — https://github.com/steffengy/schannel-rs
- `tokio-rustls@0.26.4` (crates.io) — https://github.com/rustls/tokio-rustls
- `quinn@0.11.11` (crates.io) — https://github.com/quinn-rs/quinn
- `quinn-proto@0.11.17` (crates.io) — https://github.com/quinn-rs/quinn
- `lru-slab@0.1.2` (crates.io) — https://github.com/Ralith/lru-slab
- `rand@0.10.2` (crates.io) — https://github.com/rust-random/rand
- `chacha20@0.10.1` (crates.io) — https://github.com/RustCrypto/stream-ciphers
- `cpufeatures@0.3.0` (crates.io) — https://github.com/RustCrypto/utils
- `rand_pcg@0.10.2` (crates.io) — https://github.com/rust-random/rngs
- `rustc-hash@2.1.3` (crates.io) — https://github.com/rust-lang/rustc-hash
- `thiserror@2.0.20` (crates.io) — https://github.com/dtolnay/thiserror
- `thiserror-impl@2.0.20` (crates.io) — https://github.com/dtolnay/thiserror
- `tinyvec@1.12.0` (crates.io) — https://github.com/Lokathor/tinyvec
- `tinyvec_macros@0.1.1` (crates.io) — https://github.com/Soveu/tinyvec_macros
- `quinn-udp@0.5.15` (crates.io) — https://github.com/quinn-rs/quinn
- `serde_json@1.0.151` (crates.io) — https://github.com/serde-rs/json
- `zmij@1.0.23` (crates.io) — https://github.com/dtolnay/zmij
- `serde_urlencoded@0.7.1` (crates.io) — https://github.com/nox/serde_urlencoded
- `form_urlencoded@1.2.2` (crates.io) — https://github.com/servo/rust-url
- `tower@0.5.3` (crates.io) — https://github.com/tower-rs/tower
- `tower-layer@0.3.3` (crates.io) — https://github.com/tower-rs/tower
- `tower-http@0.6.11` (crates.io) — https://github.com/tower-rs/tower-http
- `url@2.5.8` (crates.io) — https://github.com/servo/rust-url
- `idna@1.1.0` (crates.io) — https://github.com/servo/rust-url/
- `idna_adapter@1.2.2` (crates.io) — https://github.com/hsivonen/idna_adapter
- `displaydoc@0.2.7` (crates.io) — https://github.com/yaahc/displaydoc
- `stable_deref_trait@1.2.1` (crates.io) — https://github.com/storyyeller/stable_deref_trait
- `synstructure@0.13.2` (crates.io) — https://github.com/mystor/synstructure
- `utf8_iter@1.0.4` (crates.io) — https://github.com/hsivonen/utf8_iter
- `wasm-bindgen-futures@0.4.77` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/futures
- `wasm-streams@0.4.2` (crates.io) — https://github.com/MattiasBuelens/wasm-streams/
- `web-sys@0.3.104` (crates.io) — https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/web-sys
- `rusqlite@0.31.0` (crates.io) — https://github.com/rusqlite/rusqlite
- `fallible-iterator@0.3.0` (crates.io) — https://github.com/sfackler/rust-fallible-iterator
- `fallible-streaming-iterator@0.1.9` (crates.io) — https://github.com/sfackler/fallible-streaming-iterator
- `hashlink@0.9.1` (crates.io) — https://github.com/kyren/hashlink
- `hashbrown@0.14.5` (crates.io) — https://github.com/rust-lang/hashbrown
- `ahash@0.8.12` (crates.io) — https://github.com/tkaitchuck/ahash
- `libsqlite3-sys@0.28.0` (crates.io) — https://github.com/rusqlite/rusqlite
- `vcpkg@0.2.15` (crates.io) — https://github.com/mcgoo/vcpkg-rs
- `tauri@2.11.5` (crates.io) — https://github.com/tauri-apps/tauri
- `cookie@0.18.2` (crates.io) — https://github.com/SergioBenitez/cookie-rs
- `time@0.3.55` (crates.io) — https://github.com/time-rs/time
- `deranged@0.5.8` (crates.io) — https://github.com/jhpratt/deranged
- `num-conv@0.2.2` (crates.io) — https://github.com/jhpratt/num-conv
- `num_threads@0.1.7` (crates.io) — https://github.com/jhpratt/num_threads
- `powerfmt@0.2.0` (crates.io) — https://github.com/jhpratt/powerfmt
- `time-core@0.1.9` (crates.io) — https://github.com/time-rs/time
- `time-macros@0.2.32` (crates.io) — https://github.com/time-rs/time
- `dirs@6.0.0` (crates.io) — https://github.com/soc/dirs-rs
- `dirs-sys@0.5.0` (crates.io) — https://github.com/dirs-dev/dirs-sys-rs
- `redox_users@0.5.2` (crates.io) — https://gitlab.redox-os.org/redox-os/users
- `libredox@0.1.20` (crates.io) — https://gitlab.redox-os.org/redox-os/libredox.git
- `embed_plist@1.2.2` (crates.io) — https://github.com/nvzqz/embed-plist-rs
- `getrandom@0.3.4` (crates.io) — https://github.com/rust-random/getrandom
- `r-efi@5.3.0` (crates.io) — https://github.com/r-efi/r-efi
- `wasip2@1.0.4+wasi-0.2.12` (crates.io) — https://github.com/bytecodealliance/wasi-rs
- `wit-bindgen@0.57.1` (crates.io) — https://github.com/bytecodealliance/wit-bindgen
- `glob@0.3.4` (crates.io) — https://github.com/rust-lang/glob
- `gtk@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `atk@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `atk-sys@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `glib-sys@0.18.1` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `system-deps@6.2.2` (crates.io) — https://github.com/gdesmott/system-deps
- `cfg-expr@0.15.8` (crates.io) — https://github.com/EmbarkStudios/cfg-expr
- `heck@0.5.0` (crates.io) — https://github.com/withoutboats/heck
- `toml@0.8.2` (crates.io) — https://github.com/toml-rs/toml
- `serde_spanned@0.6.9` (crates.io) — https://github.com/toml-rs/toml
- `toml_datetime@0.6.3` (crates.io) — https://github.com/toml-rs/toml
- `toml_edit@0.20.2` (crates.io) — https://github.com/toml-rs/toml
- `winnow@0.5.40` (crates.io) — https://github.com/winnow-rs/winnow
- `version-compare@0.2.1` (crates.io) — https://gitlab.com/timvisee/version-compare
- `gobject-sys@0.18.0` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `glib@0.18.5` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `futures-executor@0.3.34` (crates.io) — https://github.com/rust-lang/futures-rs
- `gio-sys@0.18.1` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `winapi@0.3.9` (crates.io) — https://github.com/retep998/winapi-rs
- `winapi-i686-pc-windows-gnu@0.4.0` (crates.io) — https://github.com/retep998/winapi-rs
- `winapi-x86_64-pc-windows-gnu@0.4.0` (crates.io) — https://github.com/retep998/winapi-rs
- `glib-macros@0.18.5` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `heck@0.4.1` (crates.io) — https://github.com/withoutboats/heck
- `proc-macro-crate@2.0.2` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `proc-macro-error@1.0.4` (crates.io) — https://gitlab.com/CreepySkeleton/proc-macro-error
- `proc-macro-error-attr@1.0.4` (crates.io) — https://gitlab.com/CreepySkeleton/proc-macro-error
- `syn@1.0.109` (crates.io) — https://github.com/dtolnay/syn
- `thiserror@1.0.69` (crates.io) — https://github.com/dtolnay/thiserror
- `thiserror-impl@1.0.69` (crates.io) — https://github.com/dtolnay/thiserror
- `cairo-rs@0.18.5` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `cairo-sys-rs@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `field-offset@0.3.6` (crates.io) — https://github.com/Diggsey/rust-field-offset
- `rustc_version@0.4.1` (crates.io) — https://github.com/djc/rustc-version-rs
- `semver@1.0.28` (crates.io) — https://github.com/dtolnay/semver
- `gdk@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `gdk-pixbuf@0.18.5` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `gdk-pixbuf-sys@0.18.0` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `gio@0.18.4` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `gdk-sys@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `pango-sys@0.18.0` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `pango@0.18.3` (crates.io) — https://github.com/gtk-rs/gtk-rs-core
- `gtk-sys@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `gtk3-macros@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `proc-macro-crate@1.3.1` (crates.io) — https://github.com/bkchr/proc-macro-crate
- `toml_edit@0.19.15` (crates.io) — https://github.com/toml-rs/toml
- `http-range@0.1.5` (crates.io) — https://github.com/bancek/rust-http-range.git
- `jni@0.21.1` (crates.io) — https://github.com/jni-rs/jni-rs
- `cesu8@1.1.0` (crates.io) — https://github.com/emk/cesu8-rs
- `combine@4.6.7` (crates.io) — https://github.com/Marwes/combine
- `jni-sys@0.3.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `jni-sys@0.4.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `jni-sys-macros@0.4.1` (crates.io) — https://github.com/jni-rs/jni-sys
- `walkdir@2.5.0` (crates.io) — https://github.com/BurntSushi/walkdir
- `same-file@1.0.6` (crates.io) — https://github.com/BurntSushi/same-file
- `winapi-util@0.1.11` (crates.io) — https://github.com/BurntSushi/winapi-util
- `windows-sys@0.45.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-targets@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_gnullvm@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_aarch64_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_gnu@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_i686_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnu@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_gnullvm@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows_x86_64_msvc@0.42.2` (crates.io) — https://github.com/microsoft/windows-rs
- `mime@0.3.17` (crates.io) — https://github.com/hyperium/mime
- `muda@0.19.3` (crates.io) — https://github.com/tauri-apps/muda
- `crossbeam-channel@0.5.16` (crates.io) — https://github.com/crossbeam-rs/crossbeam
- `dpi@0.1.2` (crates.io) — https://github.com/rust-windowing/winit
- `keyboard-types@0.7.0` (crates.io) — https://github.com/pyfisch/keyboard-types
- `unicode-segmentation@1.13.3` (crates.io) — https://github.com/unicode-rs/unicode-segmentation
- `objc2@0.6.4` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-encode@4.1.0` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-exception-helper@0.1.1` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-app-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `block2@0.6.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-foundation@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `dispatch2@0.3.1` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-foundation@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `png@0.18.1` (crates.io) — https://github.com/image-rs/image-png
- `crc32fast@1.5.1` (crates.io) — https://github.com/srijs/rust-crc32fast
- `fdeflate@0.3.7` (crates.io) — https://github.com/image-rs/fdeflate
- `simd-adler32@0.3.10` (crates.io) — https://github.com/mcountryman/simd-adler32
- `flate2@1.1.9` (crates.io) — https://github.com/rust-lang/flate2-rs
- `miniz_oxide@0.8.9` (crates.io) — https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide
- `adler2@2.0.1` (crates.io) — https://github.com/oyvindln/adler2
- `objc2-ui-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-cloud-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-data@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-graphics@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-io-surface@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-image@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-location@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-text@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-quartz-core@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-user-notifications@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-web-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `plist@1.10.0` (crates.io) — https://github.com/ebarnard/rust-plist/
- `quick-xml@0.41.0` (crates.io) — https://github.com/tafia/quick-xml
- `raw-window-handle@0.6.2` (crates.io) — https://github.com/rust-windowing/raw-window-handle
- `reqwest@0.13.4` (crates.io) — https://github.com/seanmonstar/reqwest
- `wasm-streams@0.5.0` (crates.io) — https://github.com/MattiasBuelens/wasm-streams/
- `serialize-to-javascript@0.1.2` (crates.io) — https://github.com/chippers/serialize-to-javascript
- `serialize-to-javascript-impl@0.1.2` (crates.io) — https://github.com/chippers/serialize-to-javascript
- `swift-rs@1.0.8` (crates.io) — https://github.com/Brendonovich/swift-rs
- `base64@0.21.7` (crates.io) — https://github.com/marshallpierce/rust-base64
- `tauri-build@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `cargo_toml@0.22.3` (crates.io) — https://gitlab.com/lib.rs/cargo_toml
- `toml@0.9.12+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `serde_spanned@1.1.1` (crates.io) — https://github.com/toml-rs/toml
- `toml_datetime@0.7.5+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `toml_writer@1.1.2+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `winnow@0.7.15` (crates.io) — https://github.com/winnow-rs/winnow
- `json-patch@3.0.1` (crates.io) — https://github.com/idubrov/json-patch
- `jsonptr@0.6.3` (crates.io) — https://github.com/chanced/jsonptr
- `schemars@0.8.22` (crates.io) — https://github.com/GREsau/schemars
- `dyn-clone@1.0.20` (crates.io) — https://github.com/dtolnay/dyn-clone
- `indexmap@1.9.3` (crates.io) — https://github.com/bluss/indexmap
- `hashbrown@0.12.3` (crates.io) — https://github.com/rust-lang/hashbrown
- `schemars_derive@0.8.22` (crates.io) — https://github.com/GREsau/schemars
- `serde_derive_internals@0.29.1` (crates.io) — https://github.com/serde-rs/serde
- `uuid@1.25.0` (crates.io) — https://github.com/uuid-rs/uuid
- `tauri-utils@2.9.3` (crates.io) — https://github.com/tauri-apps/tauri
- `brotli@8.0.4` (crates.io) — https://github.com/dropbox/rust-brotli
- `brotli-decompressor@5.0.3` (crates.io) — https://github.com/dropbox/rust-brotli-decompressor
- `cargo_metadata@0.19.2` (crates.io) — https://github.com/oli-obk/cargo_metadata
- `camino@1.2.5` (crates.io) — https://github.com/camino-rs/camino
- `cargo-platform@0.1.9` (crates.io) — https://github.com/rust-lang/cargo
- `ctor@0.8.0` (crates.io) — https://github.com/mmastrac/rust-ctor
- `ctor-proc-macro@0.0.7` (crates.io) — https://github.com/mmastrac/rust-ctor
- `dtor@0.3.0` (crates.io) — https://github.com/mmastrac/rust-ctor
- `dtor-proc-macro@0.0.6` (crates.io) — https://github.com/mmastrac/rust-ctor
- `dom_query@0.27.0` (crates.io) — https://github.com/niklak/dom_query
- `bit-set@0.8.0` (crates.io) — https://github.com/contain-rs/bit-set
- `bit-vec@0.8.0` (crates.io) — https://github.com/contain-rs/bit-vec
- `dtoa@1.0.11` (crates.io) — https://github.com/dtolnay/dtoa
- `phf@0.13.1` (crates.io) — https://github.com/rust-phf/rust-phf
- `phf_macros@0.13.1` (crates.io) — https://github.com/rust-phf/rust-phf
- `phf_generator@0.13.1` (crates.io) — https://github.com/rust-phf/rust-phf
- `phf_shared@0.13.1` (crates.io) — https://github.com/rust-phf/rust-phf
- `siphasher@1.0.3` (crates.io) — https://github.com/jedisct1/rust-siphash
- `html5ever@0.38.0` (crates.io) — https://github.com/servo/html5ever
- `markup5ever@0.38.0` (crates.io) — https://github.com/servo/html5ever
- `tendril@0.5.1` (crates.io) — https://github.com/servo/html5ever
- `new_debug_unreachable@1.0.6` (crates.io) — https://github.com/mbrubeck/rust-debug-unreachable
- `web_atoms@0.2.6` (crates.io) — https://github.com/servo/html5ever
- `phf_codegen@0.13.1` (crates.io) — https://github.com/rust-phf/rust-phf
- `string_cache@0.9.0` (crates.io) — https://github.com/servo/string-cache
- `precomputed-hash@0.1.1` (crates.io) — https://github.com/emilio/precomputed-hash
- `string_cache_codegen@0.6.1` (crates.io) — https://github.com/servo/string-cache
- `derive_more@2.1.1` (crates.io) — https://github.com/JelteF/derive_more
- `derive_more-impl@2.1.1` (crates.io) — https://github.com/JelteF/derive_more
- `servo_arc@0.4.3` (crates.io) — https://github.com/servo/stylo
- `infer@0.19.0` (crates.io) — https://github.com/bojand/infer
- `cfb@0.7.3` (crates.io) — https://github.com/mdsteele/rust-cfb
- `regex@1.13.1` (crates.io) — https://github.com/rust-lang/regex
- `aho-corasick@1.1.5` (crates.io) — https://github.com/BurntSushi/aho-corasick
- `regex-automata@0.4.18` (crates.io) — https://github.com/rust-lang/regex
- `regex-syntax@0.8.11` (crates.io) — https://github.com/rust-lang/regex
- `serde-untagged@0.1.9` (crates.io) — https://github.com/dtolnay/serde-untagged
- `erased-serde@0.4.10` (crates.io) — https://github.com/dtolnay/erased-serde
- `typeid@1.0.3` (crates.io) — https://github.com/dtolnay/typeid
- `serde_with@3.22.0` (crates.io) — https://github.com/jonasbb/serde_with/
- `bs58@0.5.1` (crates.io) — https://github.com/Nullus157/bs58-rs
- `jiff@0.2.35` (crates.io) — https://github.com/BurntSushi/jiff
- `defmt@1.1.1` (crates.io) — https://github.com/knurling-rs/defmt
- `bitflags@1.3.2` (crates.io) — https://github.com/bitflags/bitflags
- `defmt-macros@1.1.1` (crates.io) — https://github.com/knurling-rs/defmt
- `defmt-parser@1.0.0` (crates.io) — https://github.com/knurling-rs/defmt
- `jiff-core@0.1.0` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-static@0.2.35` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-tzdb-platform@0.1.3` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-tzdb@0.1.8` (crates.io) — https://github.com/BurntSushi/jiff
- `portable-atomic@1.15.0` (crates.io) — https://github.com/taiki-e/portable-atomic
- `portable-atomic-util@0.2.7` (crates.io) — https://github.com/taiki-e/portable-atomic-util
- `schemars@0.9.0` (crates.io) — https://github.com/GREsau/schemars
- `ref-cast@1.0.27` (crates.io) — https://github.com/dtolnay/ref-cast
- `ref-cast-impl@1.0.27` (crates.io) — https://github.com/dtolnay/ref-cast
- `schemars@1.2.2` (crates.io) — https://github.com/GREsau/schemars
- `serde_with_macros@3.22.0` (crates.io) — https://github.com/jonasbb/serde_with/
- `darling@0.23.0` (crates.io) — https://github.com/TedDriggs/darling
- `darling_core@0.23.0` (crates.io) — https://github.com/TedDriggs/darling
- `ident_case@1.0.1` (crates.io) — https://github.com/TedDriggs/ident_case
- `strsim@0.11.1` (crates.io) — https://github.com/rapidfuzz/strsim-rs
- `darling_macro@0.23.0` (crates.io) — https://github.com/TedDriggs/darling
- `toml@1.1.4+spec-1.1.0` (crates.io) — https://github.com/toml-rs/toml
- `urlpattern@0.3.0` (crates.io) — https://github.com/denoland/rust-urlpattern
- `unic-ucd-ident@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-char-property@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-char-range@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-ucd-version@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `unic-common@0.9.0` (crates.io) — https://github.com/open-i18n/rust-unic/
- `tauri-winres@0.3.6` (crates.io) — https://github.com/tauri-apps/winres
- `embed-resource@3.0.11` (crates.io) — https://github.com/nabijaczleweli/rust-embed-resource
- `vswhom@0.1.0` (crates.io) — https://github.com/nabijaczleweli/vswhom.rs
- `vswhom-sys@0.1.3` (crates.io) — https://github.com/nabijaczleweli/vswhom-sys.rs
- `winreg@0.55.0` (crates.io) — https://github.com/gentoo90/winreg-rs
- `tauri-macros@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `tauri-codegen@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `ico@0.5.0` (crates.io) — https://github.com/mdsteele/rust-ico
- `png@0.17.16` (crates.io) — https://github.com/image-rs/image-png
- `tauri-runtime@2.11.3` (crates.io) — https://github.com/tauri-apps/tauri
- `webkit2gtk@2.0.2` (crates.io) — https://github.com/tauri-apps/webkit2gtk-rs
- `javascriptcore-rs@1.1.2` (crates.io) — https://github.com/tauri-apps/javascriptcore-rs
- `javascriptcore-rs-sys@1.1.1` (crates.io) — https://github.com/tauri-apps/javascriptcore-rs
- `soup3@0.5.0` (crates.io) — https://gitlab.gnome.org/World/Rust/soup3-rs
- `soup3-sys@0.5.0` (crates.io) — https://gitlab.gnome.org/World/Rust/soup3-rs
- `webkit2gtk-sys@2.0.2` (crates.io) — https://github.com/tauri-apps/webkit2gtk-rs
- `webview2-com@0.38.2` (crates.io) — https://github.com/wravery/webview2-rs
- `webview2-com-macros@0.8.1` (crates.io) — https://github.com/wravery/webview2-rs
- `webview2-com-sys@0.38.2` (crates.io) — https://github.com/wravery/webview2-rs
- `windows@0.61.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-collections@0.2.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-core@0.61.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-link@0.1.3` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-result@0.3.4` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-strings@0.4.2` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-future@0.2.1` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-threading@0.1.0` (crates.io) — https://github.com/microsoft/windows-rs
- `windows-numerics@0.2.0` (crates.io) — https://github.com/microsoft/windows-rs
- `tauri-runtime-wry@2.11.4` (crates.io) — https://github.com/tauri-apps/tauri
- `softbuffer@0.4.8` (crates.io) — https://github.com/rust-windowing/softbuffer
- `bytemuck@1.25.2` (crates.io) — https://github.com/Lokathor/bytemuck
- `ndk@0.9.0` (crates.io) — https://github.com/rust-mobile/ndk
- `ndk-sys@0.6.0+11769913` (crates.io) — https://github.com/rust-mobile/ndk
- `num_enum@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `num_enum_derive@0.7.6` (crates.io) — https://github.com/illicitonion/num_enum
- `core-graphics@0.25.0` (crates.io) — https://github.com/servo/core-foundation-rs
- `core-graphics-types@0.2.0` (crates.io) — https://github.com/servo/core-foundation-rs
- `foreign-types@0.5.0` (crates.io) — https://github.com/sfackler/foreign-types
- `foreign-types-macros@0.2.4` (crates.io) — https://github.com/sfackler/foreign-types
- `foreign-types-shared@0.3.1` (crates.io) — https://github.com/sfackler/foreign-types
- `dlopen2@0.8.2` (crates.io) — https://github.com/OpenByteDev/dlopen2
- `dlopen2_derive@0.4.3` (crates.io) — https://github.com/OpenByteDev/dlopen2
- `gdkwayland-sys@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `gdkx11-sys@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `x11@2.21.0` (crates.io) — https://github.com/AltF02/x11-rs.git
- `tao-macros@0.1.4` (crates.io) — https://github.com/tauri-apps/tao
- `windows-version@0.1.7` (crates.io) — https://github.com/microsoft/windows-rs
- `x11-dl@2.21.0` (crates.io) — https://github.com/AltF02/x11-rs.git
- `wry@0.55.1` (crates.io) — https://github.com/tauri-apps/wry
- `gdkx11@0.18.2` (crates.io) — https://github.com/gtk-rs/gtk3-rs
- `tray-icon@0.24.2` (crates.io) — https://github.com/tauri-apps/tray-icon
- `libappindicator@0.9.0` (crates.io) — https://crates.io/crates/libappindicator
- `libappindicator-sys@0.9.0` (crates.io) — https://crates.io/crates/libappindicator-sys
- `window-vibrancy@0.6.0` (crates.io) — https://github.com/tauri-apps/tauri-plugin-vibrancy
- `tauri-plugin-dialog@2.7.2` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `rfd@0.16.0` (crates.io) — https://github.com/PolyMeilex/rfd
- `tauri-plugin@2.6.3` (crates.io) — https://github.com/tauri-apps/tauri
- `tauri-plugin-fs@2.5.1` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `tauri-plugin-log@2.9.0` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `android_logger@0.15.1` (crates.io) — https://github.com/rust-mobile/android_logger-rs
- `android_log-sys@0.3.2` (crates.io) — https://github.com/rust-mobile/android_log-sys-rs
- `env_filter@0.1.4` (crates.io) — https://github.com/rust-cli/env_logger
- `fern@0.7.1` (crates.io) — https://github.com/daboross/fern
- `tauri-plugin-notification@2.3.3` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `notify-rust@4.18.0` (crates.io) — https://github.com/hoodie/notify-rust
- `mac-notification-sys@0.6.15` (crates.io) — https://github.com/h4llow3En/mac-notification-sys
- `tauri-winrt-notification@0.7.3` (crates.io) — https://github.com/tauri-apps/winrt-notification
- `zbus@5.19.0` (crates.io) — https://github.com/z-galaxy/zbus/
- `zbus_macros@5.19.0` (crates.io) — https://github.com/z-galaxy/zbus/
- `zbus_names@4.3.4` (crates.io) — https://github.com/z-galaxy/zbus/
- `zvariant@5.15.0` (crates.io) — https://github.com/z-galaxy/zbus/
- `zcheapstr@1.1.0` (crates.io) — https://github.com/z-galaxy/zcheapstr/
- `zvariant_derive@5.15.0` (crates.io) — https://github.com/z-galaxy/zbus/
- `zvariant_utils@4.2.0` (crates.io) — https://github.com/z-galaxy/zbus/
- `rand@0.9.5` (crates.io) — https://github.com/rust-random/rand
- `rand_chacha@0.9.0` (crates.io) — https://github.com/rust-random/rand
- `rand_core@0.9.5` (crates.io) — https://github.com/rust-random/rand
- `tauri-plugin-shell@2.3.5` (crates.io) — https://github.com/tauri-apps/plugins-workspace
- `encoding_rs@0.8.35` (crates.io) — https://github.com/hsivonen/encoding_rs
- `open@5.4.2` (crates.io) — https://github.com/Byron/open-rs
- `is-wsl@0.4.0` (crates.io) — https://github.com/TheLarkInn/is-wsl
- `is-docker@0.2.0` (crates.io) — https://github.com/TheLarkInn/is-docker
- `os_pipe@1.2.3` (crates.io) — https://github.com/oconnor663/os_pipe.rs
- `shared_child@1.1.1` (crates.io) — https://github.com/oconnor663/shared_child.rs
- `sigchld@0.2.4` (crates.io) — https://github.com/oconnor663/sigchld.rs
- `signal-hook@0.3.18` (crates.io) — https://github.com/vorner/signal-hook
- `@babel/code-frame@7.29.7` (npm) — https://www.npmjs.com/package/@babel/code-frame
- `@babel/compat-data@7.29.7` (npm) — https://www.npmjs.com/package/@babel/compat-data
- `@babel/core@7.29.7` (npm) — https://www.npmjs.com/package/@babel/core
- `@babel/generator@7.29.8` (npm) — https://www.npmjs.com/package/@babel/generator
- `@babel/helper-annotate-as-pure@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-annotate-as-pure
- `@babel/helper-compilation-targets@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-compilation-targets
- `@babel/helper-create-class-features-plugin@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-create-class-features-plugin
- `@babel/helper-globals@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-globals
- `@babel/helper-member-expression-to-functions@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-member-expression-to-functions
- `@babel/helper-module-imports@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-module-imports
- `@babel/helper-module-transforms@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-module-transforms
- `@babel/helper-optimise-call-expression@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-optimise-call-expression
- `@babel/helper-plugin-utils@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-plugin-utils
- `@babel/helper-replace-supers@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-replace-supers
- `@babel/helper-skip-transparent-expression-wrappers@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-skip-transparent-expression-wrappers
- `@babel/helper-string-parser@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-string-parser
- `@babel/helper-validator-identifier@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-validator-identifier
- `@babel/helper-validator-option@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helper-validator-option
- `@babel/helpers@7.29.7` (npm) — https://www.npmjs.com/package/@babel/helpers
- `@babel/parser@7.29.8` (npm) — https://www.npmjs.com/package/@babel/parser
- `@babel/plugin-syntax-jsx@7.29.7` (npm) — https://www.npmjs.com/package/@babel/plugin-syntax-jsx
- `@babel/plugin-syntax-typescript@7.29.7` (npm) — https://www.npmjs.com/package/@babel/plugin-syntax-typescript
- `@babel/plugin-transform-modules-commonjs@7.29.7` (npm) — https://www.npmjs.com/package/@babel/plugin-transform-modules-commonjs
- `@babel/plugin-transform-typescript@7.29.7` (npm) — https://www.npmjs.com/package/@babel/plugin-transform-typescript
- `@babel/preset-typescript@7.29.7` (npm) — https://www.npmjs.com/package/@babel/preset-typescript
- `@babel/runtime@7.29.7` (npm) — https://www.npmjs.com/package/@babel/runtime
- `@babel/template@7.29.7` (npm) — https://www.npmjs.com/package/@babel/template
- `@babel/traverse@7.29.8` (npm) — https://www.npmjs.com/package/@babel/traverse
- `@babel/types@7.29.8` (npm) — https://www.npmjs.com/package/@babel/types
- `@base-ui/react@1.7.0` (npm) — https://www.npmjs.com/package/@base-ui/react
- `@base-ui/utils@0.3.2` (npm) — https://www.npmjs.com/package/@base-ui/utils
- `commander@11.1.0` (npm) — https://www.npmjs.com/package/commander
- `define-lazy-prop@2.0.0` (npm) — https://www.npmjs.com/package/define-lazy-prop
- `execa@5.1.1` (npm) — https://www.npmjs.com/package/execa
- `get-stream@6.0.1` (npm) — https://www.npmjs.com/package/get-stream
- `is-docker@2.2.1` (npm) — https://www.npmjs.com/package/is-docker
- `is-stream@2.0.1` (npm) — https://www.npmjs.com/package/is-stream
- `is-wsl@2.2.0` (npm) — https://www.npmjs.com/package/is-wsl
- `npm-run-path@4.0.1` (npm) — https://www.npmjs.com/package/npm-run-path
- `open@8.4.2` (npm) — https://www.npmjs.com/package/open
- `strip-final-newline@2.0.0` (npm) — https://www.npmjs.com/package/strip-final-newline
- `@floating-ui/core@1.8.0` (npm) — https://www.npmjs.com/package/@floating-ui/core
- `@floating-ui/dom@1.8.0` (npm) — https://www.npmjs.com/package/@floating-ui/dom
- `@floating-ui/react-dom@2.1.9` (npm) — https://www.npmjs.com/package/@floating-ui/react-dom
- `@floating-ui/utils@0.2.12` (npm) — https://www.npmjs.com/package/@floating-ui/utils
- `@hono/node-server@2.1.1` (npm) — https://www.npmjs.com/package/@hono/node-server
- `@jridgewell/gen-mapping@0.3.13` (npm) — https://www.npmjs.com/package/@jridgewell/gen-mapping
- `@jridgewell/remapping@2.3.5` (npm) — https://www.npmjs.com/package/@jridgewell/remapping
- `@jridgewell/resolve-uri@3.1.2` (npm) — https://www.npmjs.com/package/@jridgewell/resolve-uri
- `@jridgewell/sourcemap-codec@1.5.5` (npm) — https://www.npmjs.com/package/@jridgewell/sourcemap-codec
- `@jridgewell/trace-mapping@0.3.31` (npm) — https://www.npmjs.com/package/@jridgewell/trace-mapping
- `@modelcontextprotocol/sdk@1.30.0` (npm) — https://www.npmjs.com/package/@modelcontextprotocol/sdk
- `ajv@8.20.0` (npm) — https://www.npmjs.com/package/ajv
- `json-schema-traverse@1.0.0` (npm) — https://www.npmjs.com/package/json-schema-traverse
- `@monogrid/gainmap-js@3.4.0` (npm) — https://www.npmjs.com/package/@monogrid/gainmap-js
- `@nodelib/fs.scandir@2.1.5` (npm) — https://www.npmjs.com/package/@nodelib/fs.scandir
- `@nodelib/fs.stat@2.0.5` (npm) — https://www.npmjs.com/package/@nodelib/fs.stat
- `@nodelib/fs.walk@1.2.8` (npm) — https://www.npmjs.com/package/@nodelib/fs.walk
- `@radix-ui/primitive@1.1.7` (npm) — https://www.npmjs.com/package/@radix-ui/primitive
- `@radix-ui/react-compose-refs@1.1.5` (npm) — https://www.npmjs.com/package/@radix-ui/react-compose-refs
- `@radix-ui/react-context@1.2.2` (npm) — https://www.npmjs.com/package/@radix-ui/react-context
- `@radix-ui/react-dialog@1.1.23` (npm) — https://www.npmjs.com/package/@radix-ui/react-dialog
- `@radix-ui/react-dismissable-layer@1.1.19` (npm) — https://www.npmjs.com/package/@radix-ui/react-dismissable-layer
- `@radix-ui/react-focus-guards@1.1.6` (npm) — https://www.npmjs.com/package/@radix-ui/react-focus-guards
- `@radix-ui/react-focus-scope@1.1.16` (npm) — https://www.npmjs.com/package/@radix-ui/react-focus-scope
- `@radix-ui/react-id@1.1.4` (npm) — https://www.npmjs.com/package/@radix-ui/react-id
- `@radix-ui/react-portal@1.1.17` (npm) — https://www.npmjs.com/package/@radix-ui/react-portal
- `@radix-ui/react-presence@1.1.10` (npm) — https://www.npmjs.com/package/@radix-ui/react-presence
- `@radix-ui/react-primitive@2.1.10` (npm) — https://www.npmjs.com/package/@radix-ui/react-primitive
- `@radix-ui/react-slot@1.3.3` (npm) — https://www.npmjs.com/package/@radix-ui/react-slot
- `@radix-ui/react-use-callback-ref@1.1.4` (npm) — https://www.npmjs.com/package/@radix-ui/react-use-callback-ref
- `@radix-ui/react-use-controllable-state@1.2.6` (npm) — https://www.npmjs.com/package/@radix-ui/react-use-controllable-state
- `@radix-ui/react-use-effect-event@0.0.5` (npm) — https://www.npmjs.com/package/@radix-ui/react-use-effect-event
- `@radix-ui/react-use-layout-effect@1.1.4` (npm) — https://www.npmjs.com/package/@radix-ui/react-use-layout-effect
- `@react-three/drei@10.7.8` (npm) — https://www.npmjs.com/package/@react-three/drei
- `@react-three/fiber@9.7.0` (npm) — https://www.npmjs.com/package/@react-three/fiber
- `@sec-ant/readable-stream@0.4.1` (npm) — https://www.npmjs.com/package/@sec-ant/readable-stream
- `@sindresorhus/merge-streams@4.0.0` (npm) — https://www.npmjs.com/package/@sindresorhus/merge-streams
- `@tanstack/query-core@5.102.3` (npm) — https://www.npmjs.com/package/@tanstack/query-core
- `@tanstack/query-devtools@5.102.3` (npm) — https://www.npmjs.com/package/@tanstack/query-devtools
- `@tanstack/react-query@5.102.3` (npm) — https://www.npmjs.com/package/@tanstack/react-query
- `@tanstack/react-query-devtools@5.102.3` (npm) — https://www.npmjs.com/package/@tanstack/react-query-devtools
- `@tauri-apps/api@2.11.1` (npm) — https://www.npmjs.com/package/@tauri-apps/api
- `@tauri-apps/plugin-dialog@2.7.2` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-dialog
- `@tauri-apps/plugin-log@2.9.0` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-log
- `@tauri-apps/plugin-notification@2.3.3` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-notification
- `@tauri-apps/plugin-shell@2.3.5` (npm) — https://www.npmjs.com/package/@tauri-apps/plugin-shell
- `@ts-morph/common@0.27.0` (npm) — https://www.npmjs.com/package/@ts-morph/common
- `balanced-match@4.0.4` (npm) — https://www.npmjs.com/package/balanced-match
- `brace-expansion@5.0.9` (npm) — https://www.npmjs.com/package/brace-expansion
- `@tweenjs/tween.js@23.1.3` (npm) — https://www.npmjs.com/package/@tweenjs/tween.js
- `@types/draco3d@1.4.10` (npm) — https://www.npmjs.com/package/@types/draco3d
- `@types/offscreencanvas@2019.7.3` (npm) — https://www.npmjs.com/package/@types/offscreencanvas
- `@types/react@19.2.18` (npm) — https://www.npmjs.com/package/@types/react
- `@types/react-dom@19.2.5` (npm) — https://www.npmjs.com/package/@types/react-dom
- `@types/react-reconciler@0.28.9` (npm) — https://www.npmjs.com/package/@types/react-reconciler
- `@types/stats.js@0.17.4` (npm) — https://www.npmjs.com/package/@types/stats.js
- `@types/three@0.170.0` (npm) — https://www.npmjs.com/package/@types/three
- `@types/validate-npm-package-name@4.0.2` (npm) — https://www.npmjs.com/package/@types/validate-npm-package-name
- `@types/webxr@0.5.24` (npm) — https://www.npmjs.com/package/@types/webxr
- `@use-gesture/core@10.3.1` (npm) — https://www.npmjs.com/package/@use-gesture/core
- `@use-gesture/react@10.3.1` (npm) — https://www.npmjs.com/package/@use-gesture/react
- `accepts@2.0.0` (npm) — https://www.npmjs.com/package/accepts
- `mime-db@1.54.0` (npm) — https://www.npmjs.com/package/mime-db
- `mime-types@3.0.2` (npm) — https://www.npmjs.com/package/mime-types
- `ajv-formats@3.0.1` (npm) — https://www.npmjs.com/package/ajv-formats
- `ajv@8.20.0` (npm) — https://www.npmjs.com/package/ajv
- `json-schema-traverse@1.0.0` (npm) — https://www.npmjs.com/package/json-schema-traverse
- `ansi-colors@4.1.3` (npm) — https://www.npmjs.com/package/ansi-colors
- `ansi-regex@5.0.1` (npm) — https://www.npmjs.com/package/ansi-regex
- `aria-hidden@1.2.6` (npm) — https://www.npmjs.com/package/aria-hidden
- `ast-types@0.16.1` (npm) — https://www.npmjs.com/package/ast-types
- `atomically@1.7.0` (npm) — https://www.npmjs.com/package/atomically
- `base64-js@1.5.1` (npm) — https://www.npmjs.com/package/base64-js
- `bidi-js@1.0.3` (npm) — https://www.npmjs.com/package/bidi-js
- `body-parser@2.3.0` (npm) — https://www.npmjs.com/package/body-parser
- `content-type@2.1.0` (npm) — https://www.npmjs.com/package/content-type
- `iconv-lite@0.7.3` (npm) — https://www.npmjs.com/package/iconv-lite
- `braces@3.0.3` (npm) — https://www.npmjs.com/package/braces
- `browserslist@4.28.8` (npm) — https://www.npmjs.com/package/browserslist
- `buffer@6.0.3` (npm) — https://www.npmjs.com/package/buffer
- `bundle-name@4.1.0` (npm) — https://www.npmjs.com/package/bundle-name
- `bytes@3.1.2` (npm) — https://www.npmjs.com/package/bytes
- `call-bind-apply-helpers@1.0.2` (npm) — https://www.npmjs.com/package/call-bind-apply-helpers
- `call-bound@1.0.4` (npm) — https://www.npmjs.com/package/call-bound
- `callsites@3.1.0` (npm) — https://www.npmjs.com/package/callsites
- `camera-controls@3.1.2` (npm) — https://www.npmjs.com/package/camera-controls
- `cli-cursor@5.0.0` (npm) — https://www.npmjs.com/package/cli-cursor
- `cli-spinners@2.9.2` (npm) — https://www.npmjs.com/package/cli-spinners
- `clsx@2.1.1` (npm) — https://www.npmjs.com/package/clsx
- `cmdk@1.1.1` (npm) — https://www.npmjs.com/package/cmdk
- `code-block-writer@13.0.3` (npm) — https://www.npmjs.com/package/code-block-writer
- `commander@14.0.3` (npm) — https://www.npmjs.com/package/commander
- `conf@10.2.0` (npm) — https://www.npmjs.com/package/conf
- `ajv@8.20.0` (npm) — https://www.npmjs.com/package/ajv
- `ajv-formats@2.1.1` (npm) — https://www.npmjs.com/package/ajv-formats
- `json-schema-traverse@1.0.0` (npm) — https://www.npmjs.com/package/json-schema-traverse
- `content-disposition@1.1.0` (npm) — https://www.npmjs.com/package/content-disposition
- `content-type@1.0.5` (npm) — https://www.npmjs.com/package/content-type
- `convert-source-map@2.0.0` (npm) — https://www.npmjs.com/package/convert-source-map
- `cookie@0.7.2` (npm) — https://www.npmjs.com/package/cookie
- `cookie-signature@1.2.2` (npm) — https://www.npmjs.com/package/cookie-signature
- `cors@2.8.6` (npm) — https://www.npmjs.com/package/cors
- `cosmiconfig@9.0.2` (npm) — https://www.npmjs.com/package/cosmiconfig
- `cross-env@7.0.3` (npm) — https://www.npmjs.com/package/cross-env
- `cross-spawn@7.0.6` (npm) — https://www.npmjs.com/package/cross-spawn
- `cssesc@3.0.0` (npm) — https://www.npmjs.com/package/cssesc
- `csstype@3.2.3` (npm) — https://www.npmjs.com/package/csstype
- `debounce-fn@4.0.0` (npm) — https://www.npmjs.com/package/debounce-fn
- `debug@4.4.3` (npm) — https://www.npmjs.com/package/debug
- `dedent@1.7.2` (npm) — https://www.npmjs.com/package/dedent
- `deepmerge@4.3.1` (npm) — https://www.npmjs.com/package/deepmerge
- `default-browser@5.5.1` (npm) — https://www.npmjs.com/package/default-browser
- `default-browser-id@5.0.1` (npm) — https://www.npmjs.com/package/default-browser-id
- `define-lazy-prop@3.0.0` (npm) — https://www.npmjs.com/package/define-lazy-prop
- `depd@2.0.0` (npm) — https://www.npmjs.com/package/depd
- `detect-gpu@5.0.70` (npm) — https://www.npmjs.com/package/detect-gpu
- `detect-node-es@1.1.0` (npm) — https://www.npmjs.com/package/detect-node-es
- `dot-prop@6.0.1` (npm) — https://www.npmjs.com/package/dot-prop
- `dunder-proto@1.0.1` (npm) — https://www.npmjs.com/package/dunder-proto
- `ee-first@1.1.1` (npm) — https://www.npmjs.com/package/ee-first
- `emoji-regex@10.6.0` (npm) — https://www.npmjs.com/package/emoji-regex
- `encodeurl@2.0.0` (npm) — https://www.npmjs.com/package/encodeurl
- `enquirer@2.4.1` (npm) — https://www.npmjs.com/package/enquirer
- `env-paths@2.2.1` (npm) — https://www.npmjs.com/package/env-paths
- `error-ex@1.3.4` (npm) — https://www.npmjs.com/package/error-ex
- `es-define-property@1.0.1` (npm) — https://www.npmjs.com/package/es-define-property
- `es-errors@1.3.0` (npm) — https://www.npmjs.com/package/es-errors
- `es-object-atoms@1.1.2` (npm) — https://www.npmjs.com/package/es-object-atoms
- `escalade@3.2.0` (npm) — https://www.npmjs.com/package/escalade
- `escape-html@1.0.3` (npm) — https://www.npmjs.com/package/escape-html
- `etag@1.8.1` (npm) — https://www.npmjs.com/package/etag
- `eventsource@3.0.7` (npm) — https://www.npmjs.com/package/eventsource
- `eventsource-parser@3.1.1` (npm) — https://www.npmjs.com/package/eventsource-parser
- `execa@9.6.1` (npm) — https://www.npmjs.com/package/execa
- `express@5.2.1` (npm) — https://www.npmjs.com/package/express
- `express-rate-limit@8.6.2` (npm) — https://www.npmjs.com/package/express-rate-limit
- `mime-db@1.54.0` (npm) — https://www.npmjs.com/package/mime-db
- `mime-types@3.0.2` (npm) — https://www.npmjs.com/package/mime-types
- `fast-deep-equal@3.1.3` (npm) — https://www.npmjs.com/package/fast-deep-equal
- `fast-glob@3.3.3` (npm) — https://www.npmjs.com/package/fast-glob
- `fdir@6.5.0` (npm) — https://www.npmjs.com/package/fdir
- `fflate@0.8.3` (npm) — https://www.npmjs.com/package/fflate
- `figures@6.1.0` (npm) — https://www.npmjs.com/package/figures
- `fill-range@7.1.1` (npm) — https://www.npmjs.com/package/fill-range
- `finalhandler@2.1.1` (npm) — https://www.npmjs.com/package/finalhandler
- `forwarded@0.2.0` (npm) — https://www.npmjs.com/package/forwarded
- `fresh@2.0.0` (npm) — https://www.npmjs.com/package/fresh
- `fs-extra@11.4.0` (npm) — https://www.npmjs.com/package/fs-extra
- `function-bind@1.1.2` (npm) — https://www.npmjs.com/package/function-bind
- `fuzzysort@3.1.0` (npm) — https://www.npmjs.com/package/fuzzysort
- `gensync@1.0.0-beta.2` (npm) — https://www.npmjs.com/package/gensync
- `get-east-asian-width@1.6.0` (npm) — https://www.npmjs.com/package/get-east-asian-width
- `get-intrinsic@1.3.0` (npm) — https://www.npmjs.com/package/get-intrinsic
- `get-nonce@1.0.1` (npm) — https://www.npmjs.com/package/get-nonce
- `get-own-enumerable-keys@1.0.0` (npm) — https://www.npmjs.com/package/get-own-enumerable-keys
- `get-proto@1.0.1` (npm) — https://www.npmjs.com/package/get-proto
- `get-stream@9.0.1` (npm) — https://www.npmjs.com/package/get-stream
- `glsl-noise@0.0.0` (npm) — https://www.npmjs.com/package/glsl-noise
- `gopd@1.2.0` (npm) — https://www.npmjs.com/package/gopd
- `has-symbols@1.1.0` (npm) — https://www.npmjs.com/package/has-symbols
- `hasown@2.0.4` (npm) — https://www.npmjs.com/package/hasown
- `hono@4.13.4` (npm) — https://www.npmjs.com/package/hono
- `http-errors@2.0.1` (npm) — https://www.npmjs.com/package/http-errors
- `ignore@5.3.2` (npm) — https://www.npmjs.com/package/ignore
- `immediate@3.0.6` (npm) — https://www.npmjs.com/package/immediate
- `import-fresh@3.3.1` (npm) — https://www.npmjs.com/package/import-fresh
- `ip-address@10.5.0` (npm) — https://www.npmjs.com/package/ip-address
- `ipaddr.js@1.9.1` (npm) — https://www.npmjs.com/package/ipaddr.js
- `is-arrayish@0.2.1` (npm) — https://www.npmjs.com/package/is-arrayish
- `is-docker@3.0.0` (npm) — https://www.npmjs.com/package/is-docker
- `is-extglob@2.1.1` (npm) — https://www.npmjs.com/package/is-extglob
- `is-glob@4.0.3` (npm) — https://www.npmjs.com/package/is-glob
- `is-in-ssh@1.0.0` (npm) — https://www.npmjs.com/package/is-in-ssh
- `is-inside-container@1.0.0` (npm) — https://www.npmjs.com/package/is-inside-container
- `is-interactive@2.0.0` (npm) — https://www.npmjs.com/package/is-interactive
- `is-number@7.0.0` (npm) — https://www.npmjs.com/package/is-number
- `is-obj@2.0.0` (npm) — https://www.npmjs.com/package/is-obj
- `is-plain-obj@4.1.0` (npm) — https://www.npmjs.com/package/is-plain-obj
- `is-promise@2.2.2` (npm) — https://www.npmjs.com/package/is-promise
- `is-regexp@3.1.0` (npm) — https://www.npmjs.com/package/is-regexp
- `is-stream@4.0.1` (npm) — https://www.npmjs.com/package/is-stream
- `is-unicode-supported@2.1.0` (npm) — https://www.npmjs.com/package/is-unicode-supported
- `is-wsl@3.1.1` (npm) — https://www.npmjs.com/package/is-wsl
- `its-fine@2.0.0` (npm) — https://www.npmjs.com/package/its-fine
- `jose@6.2.10` (npm) — https://www.npmjs.com/package/jose
- `js-tokens@4.0.0` (npm) — https://www.npmjs.com/package/js-tokens
- `js-yaml@4.3.2` (npm) — https://www.npmjs.com/package/js-yaml
- `jsesc@3.1.0` (npm) — https://www.npmjs.com/package/jsesc
- `json-parse-even-better-errors@2.3.1` (npm) — https://www.npmjs.com/package/json-parse-even-better-errors
- `json5@2.2.3` (npm) — https://www.npmjs.com/package/json5
- `jsonfile@6.2.1` (npm) — https://www.npmjs.com/package/jsonfile
- `kleur@4.1.5` (npm) — https://www.npmjs.com/package/kleur
- `lie@3.3.0` (npm) — https://www.npmjs.com/package/lie
- `lines-and-columns@1.2.4` (npm) — https://www.npmjs.com/package/lines-and-columns
- `log-symbols@6.0.0` (npm) — https://www.npmjs.com/package/log-symbols
- `chalk@5.6.2` (npm) — https://www.npmjs.com/package/chalk
- `is-unicode-supported@1.3.0` (npm) — https://www.npmjs.com/package/is-unicode-supported
- `maath@0.10.8` (npm) — https://www.npmjs.com/package/maath
- `math-intrinsics@1.1.0` (npm) — https://www.npmjs.com/package/math-intrinsics
- `media-typer@1.1.1` (npm) — https://www.npmjs.com/package/media-typer
- `merge-descriptors@2.0.0` (npm) — https://www.npmjs.com/package/merge-descriptors
- `merge-stream@2.0.0` (npm) — https://www.npmjs.com/package/merge-stream
- `merge2@1.4.1` (npm) — https://www.npmjs.com/package/merge2
- `meshline@3.3.1` (npm) — https://www.npmjs.com/package/meshline
- `meshoptimizer@0.18.1` (npm) — https://www.npmjs.com/package/meshoptimizer
- `micromatch@4.0.8` (npm) — https://www.npmjs.com/package/micromatch
- `picomatch@2.3.2` (npm) — https://www.npmjs.com/package/picomatch
- `mimic-fn@3.1.0` (npm) — https://www.npmjs.com/package/mimic-fn
- `mimic-function@5.0.1` (npm) — https://www.npmjs.com/package/mimic-function
- `minimist@1.2.8` (npm) — https://www.npmjs.com/package/minimist
- `ms@2.1.3` (npm) — https://www.npmjs.com/package/ms
- `nanoid@3.3.18` (npm) — https://www.npmjs.com/package/nanoid
- `negotiator@1.1.0` (npm) — https://www.npmjs.com/package/negotiator
- `content-type@2.1.0` (npm) — https://www.npmjs.com/package/content-type
- `next-themes@0.4.6` (npm) — https://www.npmjs.com/package/next-themes
- `node-releases@2.0.53` (npm) — https://www.npmjs.com/package/node-releases
- `npm-run-path@6.0.0` (npm) — https://www.npmjs.com/package/npm-run-path
- `path-key@4.0.0` (npm) — https://www.npmjs.com/package/path-key
- `object-assign@4.1.1` (npm) — https://www.npmjs.com/package/object-assign
- `object-inspect@1.13.4` (npm) — https://www.npmjs.com/package/object-inspect
- `object-treeify@1.1.33` (npm) — https://www.npmjs.com/package/object-treeify
- `on-finished@2.4.1` (npm) — https://www.npmjs.com/package/on-finished
- `onetime@5.1.2` (npm) — https://www.npmjs.com/package/onetime
- `mimic-fn@2.1.0` (npm) — https://www.npmjs.com/package/mimic-fn
- `open@11.0.1` (npm) — https://www.npmjs.com/package/open
- `ora@8.2.0` (npm) — https://www.npmjs.com/package/ora
- `ansi-regex@6.3.0` (npm) — https://www.npmjs.com/package/ansi-regex
- `chalk@5.6.2` (npm) — https://www.npmjs.com/package/chalk
- `strip-ansi@7.2.0` (npm) — https://www.npmjs.com/package/strip-ansi
- `p-try@2.2.0` (npm) — https://www.npmjs.com/package/p-try
- `parent-module@1.0.1` (npm) — https://www.npmjs.com/package/parent-module
- `parse-json@5.2.0` (npm) — https://www.npmjs.com/package/parse-json
- `parse-ms@4.0.0` (npm) — https://www.npmjs.com/package/parse-ms
- `parseurl@1.3.3` (npm) — https://www.npmjs.com/package/parseurl
- `path-browserify@1.0.1` (npm) — https://www.npmjs.com/package/path-browserify
- `path-key@3.1.1` (npm) — https://www.npmjs.com/package/path-key
- `path-to-regexp@8.4.2` (npm) — https://www.npmjs.com/package/path-to-regexp
- `picomatch@4.0.7` (npm) — https://www.npmjs.com/package/picomatch
- `pkce-challenge@5.0.1` (npm) — https://www.npmjs.com/package/pkce-challenge
- `pkg-up@3.1.0` (npm) — https://www.npmjs.com/package/pkg-up
- `find-up@3.0.0` (npm) — https://www.npmjs.com/package/find-up
- `locate-path@3.0.0` (npm) — https://www.npmjs.com/package/locate-path
- `p-limit@2.3.0` (npm) — https://www.npmjs.com/package/p-limit
- `p-locate@3.0.0` (npm) — https://www.npmjs.com/package/p-locate
- `path-exists@3.0.0` (npm) — https://www.npmjs.com/package/path-exists
- `postcss@8.5.26` (npm) — https://www.npmjs.com/package/postcss
- `postcss-selector-parser@7.1.5` (npm) — https://www.npmjs.com/package/postcss-selector-parser
- `powershell-utils@0.2.0` (npm) — https://www.npmjs.com/package/powershell-utils
- `pretty-ms@9.3.0` (npm) — https://www.npmjs.com/package/pretty-ms
- `prompts@2.4.2` (npm) — https://www.npmjs.com/package/prompts
- `kleur@3.0.3` (npm) — https://www.npmjs.com/package/kleur
- `proxy-addr@2.0.7` (npm) — https://www.npmjs.com/package/proxy-addr
- `queue-microtask@1.2.3` (npm) — https://www.npmjs.com/package/queue-microtask
- `range-parser@1.3.0` (npm) — https://www.npmjs.com/package/range-parser
- `raw-body@3.0.2` (npm) — https://www.npmjs.com/package/raw-body
- `iconv-lite@0.7.3` (npm) — https://www.npmjs.com/package/iconv-lite
- `react@19.2.8` (npm) — https://www.npmjs.com/package/react
- `react-dom@19.2.8` (npm) — https://www.npmjs.com/package/react-dom
- `react-remove-scroll@2.7.2` (npm) — https://www.npmjs.com/package/react-remove-scroll
- `react-remove-scroll-bar@2.3.8` (npm) — https://www.npmjs.com/package/react-remove-scroll-bar
- `react-style-singleton@2.2.3` (npm) — https://www.npmjs.com/package/react-style-singleton
- `react-use-measure@2.1.7` (npm) — https://www.npmjs.com/package/react-use-measure
- `recast@0.23.21` (npm) — https://www.npmjs.com/package/recast
- `require-from-string@2.0.2` (npm) — https://www.npmjs.com/package/require-from-string
- `reselect@5.3.0` (npm) — https://www.npmjs.com/package/reselect
- `resolve-from@4.0.0` (npm) — https://www.npmjs.com/package/resolve-from
- `restore-cursor@5.1.0` (npm) — https://www.npmjs.com/package/restore-cursor
- `onetime@7.0.0` (npm) — https://www.npmjs.com/package/onetime
- `reusify@1.1.0` (npm) — https://www.npmjs.com/package/reusify
- `router@2.2.0` (npm) — https://www.npmjs.com/package/router
- `is-promise@4.0.0` (npm) — https://www.npmjs.com/package/is-promise
- `run-applescript@7.1.0` (npm) — https://www.npmjs.com/package/run-applescript
- `run-parallel@1.2.0` (npm) — https://www.npmjs.com/package/run-parallel
- `safer-buffer@2.1.2` (npm) — https://www.npmjs.com/package/safer-buffer
- `scheduler@0.27.0` (npm) — https://www.npmjs.com/package/scheduler
- `send@1.2.1` (npm) — https://www.npmjs.com/package/send
- `mime-db@1.54.0` (npm) — https://www.npmjs.com/package/mime-db
- `mime-types@3.0.2` (npm) — https://www.npmjs.com/package/mime-types
- `serve-static@2.2.1` (npm) — https://www.npmjs.com/package/serve-static
- `shadcn@4.19.0` (npm) — https://www.npmjs.com/package/shadcn
- `tailwind-merge@3.6.0` (npm) — https://www.npmjs.com/package/tailwind-merge
- `shebang-command@2.0.0` (npm) — https://www.npmjs.com/package/shebang-command
- `shebang-regex@3.0.0` (npm) — https://www.npmjs.com/package/shebang-regex
- `side-channel@1.1.1` (npm) — https://www.npmjs.com/package/side-channel
- `side-channel-list@1.0.1` (npm) — https://www.npmjs.com/package/side-channel-list
- `side-channel-map@1.0.1` (npm) — https://www.npmjs.com/package/side-channel-map
- `side-channel-weakmap@1.0.2` (npm) — https://www.npmjs.com/package/side-channel-weakmap
- `sisteransi@1.0.5` (npm) — https://www.npmjs.com/package/sisteransi
- `smart-buffer@4.2.0` (npm) — https://www.npmjs.com/package/smart-buffer
- `socks@2.8.9` (npm) — https://www.npmjs.com/package/socks
- `sonner@1.7.4` (npm) — https://www.npmjs.com/package/sonner
- `stats-gl@2.4.2` (npm) — https://www.npmjs.com/package/stats-gl
- `stats.js@0.17.0` (npm) — https://www.npmjs.com/package/stats.js
- `statuses@2.0.2` (npm) — https://www.npmjs.com/package/statuses
- `stdin-discarder@0.2.2` (npm) — https://www.npmjs.com/package/stdin-discarder
- `string-width@7.2.0` (npm) — https://www.npmjs.com/package/string-width
- `ansi-regex@6.3.0` (npm) — https://www.npmjs.com/package/ansi-regex
- `strip-ansi@7.2.0` (npm) — https://www.npmjs.com/package/strip-ansi
- `is-obj@3.0.0` (npm) — https://www.npmjs.com/package/is-obj
- `strip-ansi@6.0.1` (npm) — https://www.npmjs.com/package/strip-ansi
- `strip-bom@3.0.0` (npm) — https://www.npmjs.com/package/strip-bom
- `strip-final-newline@4.0.0` (npm) — https://www.npmjs.com/package/strip-final-newline
- `suspend-react@0.1.3` (npm) — https://www.npmjs.com/package/suspend-react
- `systeminformation@5.33.2` (npm) — https://www.npmjs.com/package/systeminformation
- `tailwind-merge@2.6.1` (npm) — https://www.npmjs.com/package/tailwind-merge
- `three@0.170.0` (npm) — https://www.npmjs.com/package/three
- `three-mesh-bvh@0.8.3` (npm) — https://www.npmjs.com/package/three-mesh-bvh
- `three-stdlib@2.36.1` (npm) — https://www.npmjs.com/package/three-stdlib
- `fflate@0.6.11` (npm) — https://www.npmjs.com/package/fflate
- `tiny-invariant@1.3.3` (npm) — https://www.npmjs.com/package/tiny-invariant
- `to-regex-range@5.0.1` (npm) — https://www.npmjs.com/package/to-regex-range
- `toidentifier@1.0.1` (npm) — https://www.npmjs.com/package/toidentifier
- `troika-three-text@0.52.5` (npm) — https://www.npmjs.com/package/troika-three-text
- `troika-three-utils@0.52.5` (npm) — https://www.npmjs.com/package/troika-three-utils
- `troika-worker-utils@0.52.0` (npm) — https://www.npmjs.com/package/troika-worker-utils
- `ts-morph@26.0.0` (npm) — https://www.npmjs.com/package/ts-morph
- `tsconfig-paths@4.2.0` (npm) — https://www.npmjs.com/package/tsconfig-paths
- `tunnel-rat@0.1.2` (npm) — https://www.npmjs.com/package/tunnel-rat
- `zustand@4.5.7` (npm) — https://www.npmjs.com/package/zustand
- `tw-animate-css@1.4.0` (npm) — https://www.npmjs.com/package/tw-animate-css
- `type-is@2.1.0` (npm) — https://www.npmjs.com/package/type-is
- `content-type@2.1.0` (npm) — https://www.npmjs.com/package/content-type
- `mime-db@1.54.0` (npm) — https://www.npmjs.com/package/mime-db
- `mime-types@3.0.2` (npm) — https://www.npmjs.com/package/mime-types
- `undici@7.29.0` (npm) — https://www.npmjs.com/package/undici
- `unicorn-magic@0.3.0` (npm) — https://www.npmjs.com/package/unicorn-magic
- `universalify@2.0.1` (npm) — https://www.npmjs.com/package/universalify
- `unpipe@1.0.0` (npm) — https://www.npmjs.com/package/unpipe
- `update-browserslist-db@1.3.1` (npm) — https://www.npmjs.com/package/update-browserslist-db
- `use-callback-ref@1.3.3` (npm) — https://www.npmjs.com/package/use-callback-ref
- `use-sidecar@1.1.3` (npm) — https://www.npmjs.com/package/use-sidecar
- `use-sync-external-store@1.6.0` (npm) — https://www.npmjs.com/package/use-sync-external-store
- `util-deprecate@1.0.2` (npm) — https://www.npmjs.com/package/util-deprecate
- `utility-types@3.11.0` (npm) — https://www.npmjs.com/package/utility-types
- `vary@1.1.2` (npm) — https://www.npmjs.com/package/vary
- `webgl-sdf-generator@1.1.1` (npm) — https://www.npmjs.com/package/webgl-sdf-generator
- `wsl-utils@1.0.0` (npm) — https://www.npmjs.com/package/wsl-utils
- `powershell-utils@0.1.0` (npm) — https://www.npmjs.com/package/powershell-utils
- `yocto-spinner@1.2.2` (npm) — https://www.npmjs.com/package/yocto-spinner
- `yoctocolors@2.2.0` (npm) — https://www.npmjs.com/package/yoctocolors
- `zod@3.25.76` (npm) — https://www.npmjs.com/package/zod
- `zustand@5.0.15` (npm) — https://www.npmjs.com/package/zustand

```text
MIT License

Copyright (c) 2014-present Sebastian McKenzie and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### MIT-0

Declared by 1 package(s):

- `dunce@1.0.5` (crates.io) — https://gitlab.com/kornelski/dunce

```text
MIT No Attribution

Copyright 2024 Scallop Ye

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### MPL-2.0

Declared by 5 package(s):

- `option-ext@0.2.0` (crates.io) — https://github.com/soc/option-ext.git
- `cssparser@0.36.0` (crates.io) — https://github.com/servo/rust-cssparser
- `cssparser-macros@0.6.1` (crates.io) — https://github.com/servo/rust-cssparser
- `dtoa-short@0.3.5` (crates.io) — https://github.com/upsuper/dtoa-short
- `selectors@0.36.1` (crates.io) — https://github.com/servo/stylo

```text
Mozilla Public License Version 2.0
==================================

1. Definitions
--------------

1.1. "Contributor"
    means each individual or legal entity that creates, contributes to
    the creation of, or owns Covered Software.

1.2. "Contributor Version"
    means the combination of the Contributions of others (if any) used
    by a Contributor and that particular Contributor's Contribution.

1.3. "Contribution"
    means Covered Software of a particular Contributor.

1.4. "Covered Software"
    means Source Code Form to which the initial Contributor has attached
    the notice in Exhibit A, the Executable Form of such Source Code
    Form, and Modifications of such Source Code Form, in each case
    including portions thereof.

1.5. "Incompatible With Secondary Licenses"
    means

    (a) that the initial Contributor has attached the notice described
        in Exhibit B to the Covered Software; or

    (b) that the Covered Software was made available under the terms of
        version 1.1 or earlier of the License, but not also under the
        terms of a Secondary License.

1.6. "Executable Form"
    means any form of the work other than Source Code Form.

1.7. "Larger Work"
    means a work that combines Covered Software with other material, in 
    a separate file or files, that is not Covered Software.

1.8. "License"
    means this document.

1.9. "Licensable"
    means having the right to grant, to the maximum extent possible,
    whether at the time of the initial grant or subsequently, any and
    all of the rights conveyed by this License.

1.10. "Modifications"
    means any of the following:

    (a) any file in Source Code Form that results from an addition to,
        deletion from, or modification of the contents of Covered
        Software; or

    (b) any new file in Source Code Form that contains any Covered
        Software.

1.11. "Patent Claims" of a Contributor
    means any patent claim(s), including without limitation, method,
    process, and apparatus claims, in any patent Licensable by such
    Contributor that would be infringed, but for the grant of the
    License, by the making, using, selling, offering for sale, having
    made, import, or transfer of either its Contributions or its
    Contributor Version.

1.12. "Secondary License"
    means either the GNU General Public License, Version 2.0, the GNU
    Lesser General Public License, Version 2.1, the GNU Affero General
    Public License, Version 3.0, or any later versions of those
    licenses.

1.13. "Source Code Form"
    means the form of the work preferred for making modifications.

1.14. "You" (or "Your")
    means an individual or a legal entity exercising rights under this
    License. For legal entities, "You" includes any entity that
    controls, is controlled by, or is under common control with You. For
    purposes of this definition, "control" means (a) the power, direct
    or indirect, to cause the direction or management of such entity,
    whether by contract or otherwise, or (b) ownership of more than
    fifty percent (50%) of the outstanding shares or beneficial
    ownership of such entity.

2. License Grants and Conditions
--------------------------------

2.1. Grants

Each Contributor hereby grants You a world-wide, royalty-free,
non-exclusive license:

(a) under intellectual property rights (other than patent or trademark)
    Licensable by such Contributor to use, reproduce, make available,
    modify, display, perform, distribute, and otherwise exploit its
    Contributions, either on an unmodified basis, with Modifications, or
    as part of a Larger Work; and

(b) under Patent Claims of such Contributor to make, use, sell, offer
    for sale, have made, import, and otherwise transfer either its
    Contributions or its Contributor Version.

2.2. Effective Date

The licenses granted in Section 2.1 with respect to any Contribution
become effective for each Contribution on the date the Contributor first
distributes such Contribution.

2.3. Limitations on Grant Scope

The licenses granted in this Section 2 are the only rights granted under
this License. No additional rights or licenses will be implied from the
distribution or licensing of Covered Software under this License.
Notwithstanding Section 2.1(b) above, no patent license is granted by a
Contributor:

(a) for any code that a Contributor has removed from Covered Software;
    or

(b) for infringements caused by: (i) Your and any other third party's
    modifications of Covered Software, or (ii) the combination of its
    Contributions with other software (except as part of its Contributor
    Version); or

(c) under Patent Claims infringed by Covered Software in the absence of
    its Contributions.

This License does not grant any rights in the trademarks, service marks,
or logos of any Contributor (except as may be necessary to comply with
the notice requirements in Section 3.4).

2.4. Subsequent Licenses

No Contributor makes additional grants as a result of Your choice to
distribute the Covered Software under a subsequent version of this
License (see Section 10.2) or under the terms of a Secondary License (if
permitted under the terms of Section 3.3).

2.5. Representation

Each Contributor represents that the Contributor believes its
Contributions are its original creation(s) or it has sufficient rights
to grant the rights to its Contributions conveyed by this License.

2.6. Fair Use

This License is not intended to limit any rights You have under
applicable copyright doctrines of fair use, fair dealing, or other
equivalents.

2.7. Conditions

Sections 3.1, 3.2, 3.3, and 3.4 are conditions of the licenses granted
in Section 2.1.

3. Responsibilities
-------------------

3.1. Distribution of Source Form

All distribution of Covered Software in Source Code Form, including any
Modifications that You create or to which You contribute, must be under
the terms of this License. You must inform recipients that the Source
Code Form of the Covered Software is governed by the terms of this
License, and how they can obtain a copy of this License. You may not
attempt to alter or restrict the recipients' rights in the Source Code
Form.

3.2. Distribution of Executable Form

If You distribute Covered Software in Executable Form then:

(a) such Covered Software must also be made available in Source Code
    Form, as described in Section 3.1, and You must inform recipients of
    the Executable Form how they can obtain a copy of such Source Code
    Form by reasonable means in a timely manner, at a charge no more
    than the cost of distribution to the recipient; and

(b) You may distribute such Executable Form under the terms of this
    License, or sublicense it under different terms, provided that the
    license for the Executable Form does not attempt to limit or alter
    the recipients' rights in the Source Code Form under this License.

3.3. Distribution of a Larger Work

You may create and distribute a Larger Work under terms of Your choice,
provided that You also comply with the requirements of this License for
the Covered Software. If the Larger Work is a combination of Covered
Software with a work governed by one or more Secondary Licenses, and the
Covered Software is not Incompatible With Secondary Licenses, this
License permits You to additionally distribute such Covered Software
under the terms of such Secondary License(s), so that the recipient of
the Larger Work may, at their option, further distribute the Covered
Software under the terms of either this License or such Secondary
License(s).

3.4. Notices

You may not remove or alter the substance of any license notices
(including copyright notices, patent notices, disclaimers of warranty,
or limitations of liability) contained within the Source Code Form of
the Covered Software, except that You may alter any license notices to
the extent required to remedy known factual inaccuracies.

3.5. Application of Additional Terms

You may choose to offer, and to charge a fee for, warranty, support,
indemnity or liability obligations to one or more recipients of Covered
Software. However, You may do so only on Your own behalf, and not on
behalf of any Contributor. You must make it absolutely clear that any
such warranty, support, indemnity, or liability obligation is offered by
You alone, and You hereby agree to indemnify every Contributor for any
liability incurred by such Contributor as a result of warranty, support,
indemnity or liability terms You offer. You may include additional
disclaimers of warranty and limitations of liability specific to any
jurisdiction.

4. Inability to Comply Due to Statute or Regulation
---------------------------------------------------

If it is impossible for You to comply with any of the terms of this
License with respect to some or all of the Covered Software due to
statute, judicial order, or regulation then You must: (a) comply with
the terms of this License to the maximum extent possible; and (b)
describe the limitations and the code they affect. Such description must
be placed in a text file included with all distributions of the Covered
Software under this License. Except to the extent prohibited by statute
or regulation, such description must be sufficiently detailed for a
recipient of ordinary skill to be able to understand it.

5. Termination
--------------

5.1. The rights granted under this License will terminate automatically
if You fail to comply with any of its terms. However, if You become
compliant, then the rights granted under this License from a particular
Contributor are reinstated (a) provisionally, unless and until such
Contributor explicitly and finally terminates Your grants, and (b) on an
ongoing basis, if such Contributor fails to notify You of the
non-compliance by some reasonable means prior to 60 days after You have
come back into compliance. Moreover, Your grants from a particular
Contributor are reinstated on an ongoing basis if such Contributor
notifies You of the non-compliance by some reasonable means, this is the
first time You have received notice of non-compliance with this License
from such Contributor, and You become compliant prior to 30 days after
Your receipt of the notice.

5.2. If You initiate litigation against any entity by asserting a patent
infringement claim (excluding declaratory judgment actions,
counter-claims, and cross-claims) alleging that a Contributor Version
directly or indirectly infringes any patent, then the rights granted to
You by any and all Contributors for the Covered Software under Section
2.1 of this License shall terminate.

5.3. In the event of termination under Sections 5.1 or 5.2 above, all
end user license agreements (excluding distributors and resellers) which
have been validly granted by You or Your distributors under this License
prior to termination shall survive termination.

************************************************************************
*                                                                      *
*  6. Disclaimer of Warranty                                           *
*  -------------------------                                           *
*                                                                      *
*  Covered Software is provided under this License on an "as is"       *
*  basis, without warranty of any kind, either expressed, implied, or  *
*  statutory, including, without limitation, warranties that the       *
*  Covered Software is free of defects, merchantable, fit for a        *
*  particular purpose or non-infringing. The entire risk as to the     *
*  quality and performance of the Covered Software is with You.        *
*  Should any Covered Software prove defective in any respect, You     *
*  (not any Contributor) assume the cost of any necessary servicing,   *
*  repair, or correction. This disclaimer of warranty constitutes an   *
*  essential part of this License. No use of any Covered Software is   *
*  authorized under this License except under this disclaimer.         *
*                                                                      *
************************************************************************

************************************************************************
*                                                                      *
*  7. Limitation of Liability                                          *
*  --------------------------                                          *
*                                                                      *
*  Under no circumstances and under no legal theory, whether tort      *
*  (including negligence), contract, or otherwise, shall any           *
*  Contributor, or anyone who distributes Covered Software as          *
*  permitted above, be liable to You for any direct, indirect,         *
*  special, incidental, or consequential damages of any character      *
*  including, without limitation, damages for lost profits, loss of    *
*  goodwill, work stoppage, computer failure or malfunction, or any    *
*  and all other commercial damages or losses, even if such party      *
*  shall have been informed of the possibility of such damages. This   *
*  limitation of liability shall not apply to liability for death or   *
*  personal injury resulting from such party's negligence to the       *
*  extent applicable law prohibits such limitation. Some               *
*  jurisdictions do not allow the exclusion or limitation of           *
*  incidental or consequential damages, so this exclusion and          *
*  limitation may not apply to You.                                    *
*                                                                      *
************************************************************************

8. Litigation
-------------

Any litigation relating to this License may be brought only in the
courts of a jurisdiction where the defendant maintains its principal
place of business and such litigation shall be governed by laws of that
jurisdiction, without reference to its conflict-of-law provisions.
Nothing in this Section shall prevent a party's ability to bring
cross-claims or counter-claims.

9. Miscellaneous
----------------

This License represents the complete agreement concerning the subject
matter hereof. If any provision of this License is held to be
unenforceable, such provision shall be reformed only to the extent
necessary to make it enforceable. Any law or regulation which provides
that the language of a contract shall be construed against the drafter
shall not be used to construe this License against a Contributor.

10. Versions of the License
---------------------------

10.1. New Versions

Mozilla Foundation is the license steward. Except as provided in Section
10.3, no one other than the license steward has the right to modify or
publish new versions of this License. Each version will be given a
distinguishing version number.

10.2. Effect of New Versions

You may distribute the Covered Software under the terms of the version
of the License under which You originally received the Covered Software,
or under the terms of any subsequent version published by the license
steward.

10.3. Modified Versions

If you create software not governed by this License, and you want to
create a new license for such software, you may create and use a
modified version of this License if you rename the license and remove
any references to the name of the license steward (except to note that
such modified license differs from this License).

10.4. Distributing Source Code Form that is Incompatible With Secondary
Licenses

If You choose to distribute Source Code Form that is Incompatible With
Secondary Licenses under the terms of this version of the License, the
notice described in Exhibit B of this License must be attached.

Exhibit A - Source Code Form License Notice
-------------------------------------------

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

If it is not possible or desirable to put the notice in a particular
file, then You may include the notice in a location (such as a LICENSE
file in a relevant directory) where a recipient would be likely to look
for such a notice.

You may add additional accurate notices of copyright ownership.

Exhibit B - "Incompatible With Secondary Licenses" Notice
---------------------------------------------------------

  This Source Code Form is "Incompatible With Secondary Licenses", as
  defined by the Mozilla Public License, v. 2.0.
```

### NOASSERTION

Declared by 1 package(s):

- `webgl-constants@1.1.1` (npm) — https://www.npmjs.com/package/webgl-constants

> **Licence text not bundled.** This identifier appears in the dependency
> graph, but no matching licence file was available on the machine that
> generated this file. See the upstream sources above for the authoritative
> text. This is a recorded limitation, not an omission.

### OFL-1.1

Declared by 1 package(s):

- `@fontsource-variable/geist@5.3.0` (npm) — https://www.npmjs.com/package/@fontsource-variable/geist

```text
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font) Geist-Italic[wght].ttf: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

### Python-2.0

Declared by 1 package(s):

- `argparse@2.0.1` (npm) — https://www.npmjs.com/package/argparse

> **Licence text not bundled.** This identifier appears in the dependency
> graph, but no matching licence file was available on the machine that
> generated this file. See the upstream sources above for the authoritative
> text. This is a recorded limitation, not an omission.

### Unicode-3.0

Declared by 19 package(s):

- `unicode-ident@1.0.24` (crates.io) — https://github.com/dtolnay/unicode-ident
- `icu_normalizer@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_collections@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `potential_utf@0.1.6` (crates.io) — https://github.com/unicode-org/icu4x
- `zerovec@0.11.8` (crates.io) — https://github.com/unicode-org/icu4x
- `yoke@0.8.3` (crates.io) — https://github.com/unicode-org/icu4x
- `yoke-derive@0.8.2` (crates.io) — https://github.com/unicode-org/icu4x
- `zerofrom@0.1.8` (crates.io) — https://github.com/unicode-org/icu4x
- `zerofrom-derive@0.1.7` (crates.io) — https://github.com/unicode-org/icu4x
- `zerovec-derive@0.11.6` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_normalizer_data@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_properties@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_locale_core@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `litemap@0.8.3` (crates.io) — https://github.com/unicode-org/icu4x
- `tinystr@0.8.4` (crates.io) — https://github.com/unicode-org/icu4x
- `writeable@0.6.4` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_properties_data@2.3.0` (crates.io) — https://github.com/unicode-org/icu4x
- `icu_provider@2.3.1` (crates.io) — https://github.com/unicode-org/icu4x
- `zerotrie@0.2.5` (crates.io) — https://github.com/unicode-org/icu4x

```text
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 2020-2024 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.

SPDX-License-Identifier: Unicode-3.0

—

Portions of ICU4X may have been adapted from ICU4C and/or ICU4J.
ICU 1.8.1 to ICU 57.1 © 1995-2016 International Business Machines Corporation and others.
```

### Unlicense

Declared by 11 package(s):

- `memchr@2.8.3` (crates.io) — https://github.com/BurntSushi/memchr
- `byteorder@1.5.0` (crates.io) — https://github.com/BurntSushi/byteorder
- `walkdir@2.5.0` (crates.io) — https://github.com/BurntSushi/walkdir
- `same-file@1.0.6` (crates.io) — https://github.com/BurntSushi/same-file
- `winapi-util@0.1.11` (crates.io) — https://github.com/BurntSushi/winapi-util
- `aho-corasick@1.1.5` (crates.io) — https://github.com/BurntSushi/aho-corasick
- `jiff@0.2.35` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-core@0.1.0` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-static@0.2.35` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-tzdb-platform@0.1.3` (crates.io) — https://github.com/BurntSushi/jiff
- `jiff-tzdb@0.1.8` (crates.io) — https://github.com/BurntSushi/jiff

> **Licence text not bundled.** This identifier appears in the dependency
> graph, but no matching licence file was available on the machine that
> generated this file. See the upstream sources above for the authoritative
> text. This is a recorded limitation, not an omission.

### Zlib

Declared by 22 package(s):

- `lru-slab@0.1.2` (crates.io) — https://github.com/Ralith/lru-slab
- `tinyvec@1.12.0` (crates.io) — https://github.com/Lokathor/tinyvec
- `tinyvec_macros@0.1.1` (crates.io) — https://github.com/Soveu/tinyvec_macros
- `objc2-exception-helper@0.1.1` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-app-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-foundation@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `dispatch2@0.3.1` (crates.io) — https://github.com/madsmtm/objc2
- `miniz_oxide@0.8.9` (crates.io) — https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide
- `objc2-ui-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-cloud-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-data@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-graphics@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-io-surface@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-image@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-location@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-core-text@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-quartz-core@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-user-notifications@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `objc2-web-kit@0.3.2` (crates.io) — https://github.com/madsmtm/objc2
- `raw-window-handle@0.6.2` (crates.io) — https://github.com/rust-windowing/raw-window-handle
- `foldhash@0.2.0` (crates.io) — https://github.com/orlp/foldhash
- `bytemuck@1.25.2` (crates.io) — https://github.com/Lokathor/bytemuck

```text
Copyright (c) 2019 Daniel "Lokathor" Gee.

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.

2. Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
```

---

MeshyForge itself is licensed under the MIT License — see `LICENSE`.
Documents under `Meshy_Documentation/` are third-party material and are
**not** covered by that license; see the notice in that directory.

