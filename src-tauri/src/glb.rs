//! GLB (binary glTF) container surgery — locate, validate, rewrite.
//!
//! `ADR-0019` decision 4 / `LM-04`: when the export path rewrites a
//! provider-owned GLB it must **merge into** the JSON chunk and never replace
//! it, preserve unknown keys and unknown extensions, and **stream** the BIN
//! chunk rather than buffering it (`P-1`: files run to hundreds of MB and the
//! export path must stay O(1) in memory).
//!
//! This module knows nothing about MeshyForge's rights vocabulary — it takes a
//! file and a `serde_json::Value` mutator. Keeping the format rules free of
//! domain language is what makes them testable against synthetic fixtures.

use serde_json::Value;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::ops::Range;
use std::path::Path;

pub const GLB_MAGIC: u32 = 0x4654_6C67; // "glTF"
pub const GLB_VERSION: u32 = 2;
pub const JSON_CHUNK: u32 = 0x4E4F_534A; // "JSON"
pub const BIN_CHUNK: u32 = 0x004E_4942; // "BIN\0"

/// Cap on the JSON chunk, enforced on read AND write (`US-2`).
pub const MAX_JSON_CHUNK: u64 = 16 * 1024 * 1024;

const HEADER_LEN: u64 = 12;
const CHUNK_HEADER_LEN: u64 = 8;
const COPY_BUFFER_LEN: usize = 64 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub enum GlbError {
    NotGlb,
    Truncated,
    UnsupportedVersion(u32),
    LengthMismatch,
    JsonTooLarge,
    JsonUnparseable,
    TooLarge,
    Io,
}

impl GlbError {
    pub fn message(&self) -> &'static str {
        match self {
            Self::NotGlb => "the file is not a GLB container",
            Self::Truncated => "the GLB container is truncated",
            Self::UnsupportedVersion(_) => "the GLB version is not supported",
            Self::LengthMismatch => "the GLB header length disagrees with the file",
            Self::JsonTooLarge => "the GLB JSON chunk exceeds the safety cap",
            Self::JsonUnparseable => "the GLB JSON chunk is not valid JSON",
            Self::TooLarge => "the rewritten GLB would exceed the 4 GiB container limit",
            Self::Io => "the GLB could not be read or written",
        }
    }
}

/// What the container holds, as byte ranges. The BIN chunk is never loaded.
#[derive(Debug)]
pub struct GlbLayout {
    /// JSON chunk content, including any trailing space padding.
    pub json: Vec<u8>,
    pub bin: Option<Range<u64>>,
    /// Chunk types this build does not understand, copied through unchanged.
    /// Dropping them would be `LM-04`'s failure mode: destroying provenance we
    /// cannot see.
    pub trailing: Vec<(u32, Range<u64>)>,
    pub declared_len: u64,
}

fn u32_at(buf: &[u8], at: usize) -> u32 {
    u32::from_le_bytes([buf[at], buf[at + 1], buf[at + 2], buf[at + 3]])
}

fn read_exact_at(file: &mut File, at: u64, buf: &mut [u8]) -> Result<(), GlbError> {
    file.seek(SeekFrom::Start(at)).map_err(|_| GlbError::Io)?;
    file.read_exact(buf).map_err(|_| GlbError::Truncated)
}

/// Walk the chunk table, validating every length against the real file size.
///
/// `US-2`: the declared length is CHECKED, never trusted — nothing here
/// allocates from a number a file claims about itself.
pub fn read_layout(file: &mut File) -> Result<GlbLayout, GlbError> {
    let actual_len = file.metadata().map_err(|_| GlbError::Io)?.len();
    if actual_len < HEADER_LEN {
        return Err(GlbError::Truncated);
    }

    let mut header = [0u8; 12];
    read_exact_at(file, 0, &mut header)?;
    if u32_at(&header, 0) != GLB_MAGIC {
        return Err(GlbError::NotGlb);
    }
    let version = u32_at(&header, 4);
    if version != GLB_VERSION {
        return Err(GlbError::UnsupportedVersion(version));
    }
    let declared_len = u64::from(u32_at(&header, 8));
    if declared_len != actual_len {
        return Err(GlbError::LengthMismatch);
    }

    let mut json: Option<Vec<u8>> = None;
    let mut bin: Option<Range<u64>> = None;
    let mut trailing: Vec<(u32, Range<u64>)> = Vec::new();

    let mut cursor = HEADER_LEN;
    let mut chunk_header = [0u8; 8];
    while cursor + CHUNK_HEADER_LEN <= declared_len {
        read_exact_at(file, cursor, &mut chunk_header)?;
        let len = u64::from(u32_at(&chunk_header, 0));
        let kind = u32_at(&chunk_header, 4);
        let start = cursor + CHUNK_HEADER_LEN;
        let end = start.checked_add(len).ok_or(GlbError::Truncated)?;
        if end > declared_len {
            return Err(GlbError::Truncated);
        }
        match kind {
            JSON_CHUNK if json.is_none() => {
                if len > MAX_JSON_CHUNK {
                    return Err(GlbError::JsonTooLarge);
                }
                let mut bytes = vec![0u8; len as usize];
                read_exact_at(file, start, &mut bytes)?;
                json = Some(bytes);
            }
            BIN_CHUNK if bin.is_none() => bin = Some(start..end),
            _ => trailing.push((kind, start..end)),
        }
        cursor = end;
    }
    if cursor != declared_len {
        return Err(GlbError::Truncated);
    }

    Ok(GlbLayout {
        json: json.ok_or(GlbError::Truncated)?,
        bin,
        trailing,
        declared_len,
    })
}

/// Parse the JSON chunk. Trailing space padding is legal and accepted.
pub fn parse_json(layout: &GlbLayout) -> Result<Value, GlbError> {
    serde_json::from_slice(&layout.json).map_err(|_| GlbError::JsonUnparseable)
}

/// Total triangle count across all mesh primitives (TASK-0032).
///
/// Reads only accessor COUNTS from the JSON chunk — the BIN chunk is never
/// loaded. Indexed primitives count `indices/3`; non-indexed count
/// `POSITION/3`. Triangle strips/fans (modes 5/6) count `n-2`; other modes
/// (points/lines) contribute no triangles. `None` means UNKNOWN (no meshes,
/// no primitives, or a missing accessor) — never a sentinel zero: the
/// rigging gate keeps its static warning for unknown counts.
pub fn triangle_count(document: &Value) -> Option<i64> {
    let meshes = document.get("meshes")?.as_array()?;
    let accessors = document.get("accessors").and_then(|a| a.as_array());
    let mut total: i64 = 0;
    let mut counted_any = false;
    for mesh in meshes {
        let Some(primitives) = mesh.get("primitives").and_then(|p| p.as_array()) else {
            continue;
        };
        for primitive in primitives {
            let mode = primitive.get("mode").and_then(|m| m.as_i64()).unwrap_or(4);
            let count = if let Some(indices) = primitive.get("indices").and_then(|i| i.as_i64()) {
                accessors?.get(indices as usize)?.get("count")?.as_i64()?
            } else {
                let position = primitive.get("attributes")?.get("POSITION")?.as_i64()?;
                accessors?.get(position as usize)?.get("count")?.as_i64()?
            };
            total += match mode {
                4 => count / 3,
                5 | 6 => (count - 2).max(0),
                _ => 0,
            };
            counted_any = true;
        }
    }
    counted_any.then_some(total)
}

/// Fail-soft face-count extraction from a GLB on disk (TASK-0032, VP-14:
/// a free local check before a paid rigging call). Any read/parse failure
/// yields `None` (unknown) — a download must never fail because a count
/// could not be extracted.
pub fn face_count_from_file(path: &std::path::Path) -> Option<i64> {
    let mut file = File::open(path).ok()?;
    let layout = read_layout(&mut file).ok()?;
    let document = parse_json(&layout).ok()?;
    triangle_count(&document)
}

/// Chunk bodies are padded to a 4-byte boundary.
fn padded(len: usize) -> u64 {
    ((len as u64) + 3) & !3
}

fn write_chunk_header(out: &mut File, len: u32, kind: u32) -> Result<(), GlbError> {
    out.write_all(&len.to_le_bytes())
        .map_err(|_| GlbError::Io)?;
    out.write_all(&kind.to_le_bytes())
        .map_err(|_| GlbError::Io)?;
    Ok(())
}

/// Copy exactly `range` from `src` to `out` through a fixed buffer.
///
/// `P-1`: this is the only place the BIN payload is touched, and it never holds
/// more than 64 KiB of it. A short read is an error, not a silent truncation —
/// a delivered file must never be quietly incomplete.
fn copy_range(src: &mut File, range: Range<u64>, out: &mut File) -> Result<(), GlbError> {
    src.seek(SeekFrom::Start(range.start))
        .map_err(|_| GlbError::Io)?;
    let mut remaining = range.end - range.start;
    let mut buffer = vec![0u8; COPY_BUFFER_LEN];
    while remaining > 0 {
        let want =
            usize::try_from(remaining.min(COPY_BUFFER_LEN as u64)).unwrap_or(COPY_BUFFER_LEN);
        let read = src.read(&mut buffer[..want]).map_err(|_| GlbError::Io)?;
        if read == 0 {
            return Err(GlbError::Truncated);
        }
        out.write_all(&buffer[..read]).map_err(|_| GlbError::Io)?;
        remaining -= read as u64;
    }
    Ok(())
}

/// Rewrite `src` into `dest`, applying `transform` to the JSON document.
///
/// `transform` returns whether it actually changed anything. `Ok(false)` means
/// it declined — for example because merging would have overwritten a field it
/// does not understand — and in that case **nothing is written**, so the caller
/// can keep the original bytes.
pub fn rewrite(
    src: &Path,
    dest: &Path,
    transform: impl FnOnce(&mut Value) -> bool,
) -> Result<bool, GlbError> {
    let mut input = File::open(src).map_err(|_| GlbError::Io)?;
    let layout = read_layout(&mut input)?;
    let mut document = parse_json(&layout)?;
    if !transform(&mut document) {
        return Ok(false);
    }

    let json = serde_json::to_vec(&document).map_err(|_| GlbError::JsonUnparseable)?;
    if json.len() as u64 > MAX_JSON_CHUNK {
        return Err(GlbError::JsonTooLarge);
    }
    let json_padded = padded(json.len());

    let bin_len = layout.bin.as_ref().map(|range| range.end - range.start);
    let trailing_bytes: u64 = layout
        .trailing
        .iter()
        .map(|(_, range)| range.end - range.start)
        .sum();

    let mut total = HEADER_LEN + CHUNK_HEADER_LEN + json_padded;
    if let Some(len) = bin_len {
        total += CHUNK_HEADER_LEN + padded(len as usize);
    }
    total += CHUNK_HEADER_LEN * layout.trailing.len() as u64 + trailing_bytes;
    if total > u64::from(u32::MAX) {
        return Err(GlbError::TooLarge);
    }

    let mut out = File::create(dest).map_err(|_| GlbError::Io)?;
    out.write_all(&GLB_MAGIC.to_le_bytes())
        .map_err(|_| GlbError::Io)?;
    out.write_all(&GLB_VERSION.to_le_bytes())
        .map_err(|_| GlbError::Io)?;
    out.write_all(&(total as u32).to_le_bytes())
        .map_err(|_| GlbError::Io)?;

    write_chunk_header(&mut out, json_padded as u32, JSON_CHUNK)?;
    out.write_all(&json).map_err(|_| GlbError::Io)?;
    for _ in json.len() as u64..json_padded {
        out.write_all(b" ").map_err(|_| GlbError::Io)?;
    }

    if let (Some(range), Some(len)) = (layout.bin.clone(), bin_len) {
        write_chunk_header(&mut out, padded(len as usize) as u32, BIN_CHUNK)?;
        copy_range(&mut input, range, &mut out)?;
        for _ in len..padded(len as usize) {
            out.write_all(&[0u8]).map_err(|_| GlbError::Io)?;
        }
    }

    for (kind, range) in &layout.trailing {
        write_chunk_header(&mut out, (range.end - range.start) as u32, *kind)?;
        copy_range(&mut input, range.clone(), &mut out)?;
    }

    out.flush().map_err(|_| GlbError::Io)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

    /// Build a well-formed GLB. `bin` may be large so a test can prove the BIN
    /// is never buffered.
    fn chunk(kind: u32, body: &[u8], pad_with: u8) -> Vec<u8> {
        let padded_len = padded(body.len()) as usize;
        let mut out = Vec::new();
        out.extend_from_slice(&(padded_len as u32).to_le_bytes());
        out.extend_from_slice(&kind.to_le_bytes());
        out.extend_from_slice(body);
        out.resize(8 + padded_len, pad_with);
        out
    }

    fn build(json_text: &str, bin: Option<&[u8]>, extra: Option<(u32, &[u8])>) -> Vec<u8> {
        let mut body = chunk(JSON_CHUNK, json_text.as_bytes(), b' ');
        if let Some(bin) = bin {
            body.extend_from_slice(&chunk(BIN_CHUNK, bin, 0));
        }
        if let Some((kind, data)) = extra {
            body.extend_from_slice(&chunk(kind, data, 0));
        }
        let total = 12 + body.len();
        let mut out = Vec::new();
        out.extend_from_slice(&GLB_MAGIC.to_le_bytes());
        out.extend_from_slice(&GLB_VERSION.to_le_bytes());
        out.extend_from_slice(&(total as u32).to_le_bytes());
        out.extend_from_slice(&body);
        out
    }

    fn write_tmp(dir: &Path, name: &str, bytes: &[u8]) -> std::path::PathBuf {
        let path = dir.join(name);
        fs::write(&path, bytes).unwrap();
        path
    }

    #[test]
    fn locates_chunks_and_never_loads_the_bin_payload() {
        let dir = tempfile::tempdir().unwrap();
        let bin = vec![0xABu8; 1024 * 1024];
        let src = write_tmp(
            dir.path(),
            "a.glb",
            &build(r#"{"asset":{"version":"2.0"}}"#, Some(&bin), None),
        );

        let mut file = File::open(&src).unwrap();
        let layout = read_layout(&mut file).unwrap();

        let range = layout
            .bin
            .as_ref()
            .expect("BIN chunk must be located")
            .clone();
        assert_eq!(range.end - range.start, bin.len() as u64);
        assert!(parse_json(&layout).unwrap()["asset"]["version"] == "2.0");
        // The layout holds the JSON chunk only, not the megabyte of BIN.
        assert!(layout.json.len() < 1024);
    }

    /// The `LM-04` gate: a foreign `asset.extras` key and an unknown
    /// `extensions` entry must both survive, and the BIN must be unchanged.
    #[test]
    fn rewrite_preserves_foreign_fields_and_the_bin_chunk() {
        let dir = tempfile::tempdir().unwrap();
        let bin = vec![7u8; 4096];
        let source_json = r#"{
            "asset": {
                "version": "2.0",
                "generator": "Meshy",
                "copyright": "Meshy LLC",
                "extras": { "providerTrace": "abc123" },
                "extensions": { "VENDOR_material": { "roughness": 0.4 } }
            },
            "scenes": []
        }"#;
        let src = write_tmp(
            dir.path(),
            "src.glb",
            &build(source_json, Some(&bin), Some((0x5A5A_5A5A, b"future"))),
        );
        let dest = dir.path().join("out.glb");

        let applied = rewrite(&src, &dest, |doc| {
            doc["asset"]["extras"]["meshyforge"] = json!({ "identifier": "CC-BY-4.0" });
            true
        })
        .unwrap();
        assert!(applied);

        let mut file = File::open(&dest).unwrap();
        let layout = read_layout(&mut file).unwrap();
        let doc = parse_json(&layout).unwrap();

        assert_eq!(doc["asset"]["extras"]["providerTrace"], "abc123");
        assert_eq!(
            doc["asset"]["extensions"]["VENDOR_material"]["roughness"],
            0.4
        );
        // The provider's copyright is untouched; ours is namespaced.
        assert_eq!(doc["asset"]["copyright"], "Meshy LLC");
        assert_eq!(
            doc["asset"]["extras"]["meshyforge"]["identifier"],
            "CC-BY-4.0"
        );
        // Unknown chunk type copied through.
        assert_eq!(layout.trailing.len(), 1);
        assert_eq!(layout.trailing[0].0, 0x5A5A_5A5A);

        // BIN byte-identical.
        let range = layout.bin.clone().unwrap();
        file.seek(SeekFrom::Start(range.start)).unwrap();
        let mut out_bin = Vec::new();
        file.take(range.end - range.start)
            .read_to_end(&mut out_bin)
            .unwrap();
        assert_eq!(out_bin, bin);
    }

    #[test]
    fn rewrite_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let src = write_tmp(
            dir.path(),
            "src.glb",
            &build(r#"{"asset":{"version":"2.0"}}"#, Some(b"bin"), None),
        );
        let first = dir.path().join("first.glb");
        let second = dir.path().join("second.glb");

        let apply = |doc: &mut Value| {
            doc["asset"]["extras"]["meshyforge"] = json!({ "identifier": "X" });
            true
        };
        rewrite(&src, &first, apply).unwrap();
        rewrite(&first, &second, apply).unwrap();

        assert_eq!(fs::read(&first).unwrap(), fs::read(&second).unwrap());
    }

    /// A transform that declines writes NOTHING, so the caller keeps the
    /// original bytes rather than a half-merged file.
    #[test]
    fn rewrite_writes_nothing_when_the_transform_declines() {
        let dir = tempfile::tempdir().unwrap();
        let src = write_tmp(
            dir.path(),
            "src.glb",
            &build(r#"{"asset":{"version":"2.0"}}"#, None, None),
        );
        let dest = dir.path().join("out.glb");

        let applied = rewrite(&src, &dest, |_| false).unwrap();

        assert!(!applied);
        assert!(!dest.exists(), "a declined merge must not create a file");
    }

    #[test]
    fn rejects_a_header_that_disagrees_with_the_file_length() {
        let dir = tempfile::tempdir().unwrap();
        let mut bytes = build(r#"{"asset":{"version":"2.0"}}"#, None, None);
        bytes[8] = 0xFF; // corrupt the declared total length
        let src = write_tmp(dir.path(), "bad.glb", &bytes);

        let mut file = File::open(&src).unwrap();
        assert_eq!(
            read_layout(&mut file).unwrap_err(),
            GlbError::LengthMismatch
        );
    }

    #[test]
    fn rejects_truncated_and_non_glb_files() {
        let dir = tempfile::tempdir().unwrap();
        let full = build(r#"{"asset":{"version":"2.0"}}"#, Some(b"bin"), None);
        let short = write_tmp(dir.path(), "short.glb", &full[..full.len() - 3]);

        let mut file = File::open(&short).unwrap();
        assert_eq!(
            read_layout(&mut file).unwrap_err(),
            GlbError::LengthMismatch
        );

        let not_glb = write_tmp(dir.path(), "x.glb", b"not a glb at all!!");
        let mut file = File::open(&not_glb).unwrap();
        assert_eq!(read_layout(&mut file).unwrap_err(), GlbError::NotGlb);
    }

    /// JSON is space-padded to a 4-byte boundary and the declared total matches
    /// the bytes actually written — the two things a reader validates first.
    #[test]
    fn triangle_count_sums_indexed_and_non_indexed_primitives() {
        let doc = serde_json::json!({
            "meshes": [{"primitives": [
                {"attributes": {"POSITION": 0}, "indices": 1},
                {"attributes": {"POSITION": 2}}
            ]}],
            "accessors": [{"count": 9}, {"count": 12}, {"count": 9}]
        });
        assert_eq!(triangle_count(&doc), Some(4 + 3));
    }

    #[test]
    fn triangle_count_handles_strips_fans_and_non_triangle_modes() {
        let doc = serde_json::json!({
            "meshes": [{"primitives": [
                {"attributes": {"POSITION": 0}, "mode": 5},
                {"attributes": {"POSITION": 0}, "mode": 6},
                {"attributes": {"POSITION": 0}, "mode": 0}
            ]}],
            "accessors": [{"count": 5}]
        });
        assert_eq!(triangle_count(&doc), Some(3 + 3));
    }

    #[test]
    fn triangle_count_is_unknown_without_meshes_or_accessors() {
        assert_eq!(triangle_count(&serde_json::json!({})), None);
        assert_eq!(triangle_count(&serde_json::json!({"meshes": []})), None);
        assert_eq!(
            triangle_count(&serde_json::json!({
                "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}]
            })),
            None
        );
    }

    #[test]
    fn pads_the_json_chunk_and_declares_the_true_length() {
        let dir = tempfile::tempdir().unwrap();
        let src = write_tmp(
            dir.path(),
            "src.glb",
            &build(r#"{"asset":{"version":"2.0"}}"#, None, None),
        );
        let dest = dir.path().join("out.glb");

        rewrite(&src, &dest, |doc| {
            doc["asset"]["extras"] = json!({ "odd": "x" });
            true
        })
        .unwrap();

        let bytes = fs::read(&dest).unwrap();
        let declared = u64::from(u32::from_le_bytes([
            bytes[8], bytes[9], bytes[10], bytes[11],
        ]));
        assert_eq!(declared, bytes.len() as u64);

        let json_len = u64::from(u32::from_le_bytes([
            bytes[12], bytes[13], bytes[14], bytes[15],
        ]));
        assert_eq!(json_len % 4, 0, "JSON chunk must be 4-byte aligned");

        let mut file = File::open(&dest).unwrap();
        assert!(read_layout(&mut file).is_ok(), "output must re-parse");
    }
}
