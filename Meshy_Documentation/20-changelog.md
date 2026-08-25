# Changelog

Source: https://docs.meshy.ai/en/api/changelog

See all of the latest features and updates to the Meshy API and plugins.

## August 2026

### `Aug 18`
- Added the `texture_image_urls` parameter to the Multi-Image to 3D API: provide 1–4 images of the same object to guide texturing, instead of the single `texture_image_url`. Requires `ai_model` `meshy-7` or `latest`, and is independent of `image_urls` — the two lists can contain different images and different numbers of images.

### `Aug 17`
- Added the `remove_background` parameter to the Text to Image API and Image to Image API. Set `remove_background: true` to receive the generated image as a transparent RGBA PNG with the background removed.

### `Aug 13`
- Added `ai_model: "meshy-7"` to the Text to 3D API: our newest 3D generation model, with higher-fidelity geometry than Meshy 6. It also introduces the `ultra_mode` parameter on the preview task, which enables Ultra generation for even finer surface detail for 5 extra credits. To texture with Meshy 7, pass `ai_model: "meshy-7"` on the refine task or omit `ai_model` entirely.
- Added the Smart Topology `model_type` to the Text to 3D API. Set `model_type: "smart-topology"` to generate with `meshy-t2` — cleaner topology, natively separated parts, triangle output, and a face count you can set with `target_polycount` (100 to 15,000, default 4,000). A Smart Topology preview costs 5 credits instead of 20. The existing `model_type: "lowpoly"` is now deprecated but continues to serve traffic for backward compatibility.

### `Aug 12`
- Added `ai_model: "meshy-7"` to the Image to 3D API: our newest 3D generation model, with higher-fidelity geometry than Meshy 6. It also introduces the `ultra_mode` parameter, which enables Ultra generation for even finer surface detail.
- Added `ai_model: "meshy-7"` to the Multi-Image to 3D API: Meshy's multi-view generation model, which conditions on all of your input views together and drives texturing from them.
- Added `ai_model: "meshy-7"` to the Retexture API: our newest texturing model, with sharper surface detail and cleaner PBR materials than Meshy 6. It also introduces the `multiview_image_urls` parameter — provide 1–4 ordered views of the same object to drive multi-view texturing.

### `Aug 4`
- Expanded `model_url` input support to `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl` for the Analyze Printability and Repair Printability endpoints (previously `.glb`, `.stl`, `.obj`). Repair returns the repaired asset in its input format.

## July 2026

### `Jul 27`
- New Creative Lab — Brick Figure API: turn a photo into a brick-style collectible 3D minifigure. Same two-stage workflow as the Figure API — `prototype` (6 credits) generates a styled concept image, `build` (30 credits) turns it into a textured 3D model with GLB and OBJ + MTL outputs.

### `Jul 22`
- New Creative Lab — Keycap API: turn a photo into a full-color custom mechanical keyboard keycap. Two-stage workflow — `prototype` (12 credits) generates a finished-keycap design render, then `build` (50 credits) turns the design you pick (via `candidate_id`) into a textured 3D keycap model with GLB and OBJ bundle outputs, exported at real-world millimeter scale. Currently supports the standard Cherry MX 1u base (`cherry-mx-1x1-r1`); more standard sizes are planned.

### `Jul 21`
- We now support 8K base color textures via a new `texture_resolution` parameter (`2k` / `4k` / `8k`) on the Image to 3D, Multi-Image to 3D, Text to 3D Refine, and Retexture endpoints. At `8k`, PBR maps are generated at 4K and no emission map is produced. 8K texture generation costs 15 credits (`2k`/`4k` remain 10).
- The `hd_texture` boolean is deprecated in favor of `texture_resolution` — it is still honored and equivalent to `texture_resolution: "4k"` for backward compatibility.

### `Jul 20`
- New Creative Lab — Vinyl Figure API: turn a photo into a big-head vinyl collectible 3D figure. Same two-stage workflow as the Figure API — `prototype` (6 credits) generates a styled concept image, `build` (30 credits) turns it into a textured 3D model with GLB and OBJ + MTL outputs.

### `Jul 13`
- Added a new Smart Topology `model_type` to the Image to 3D API, offering two models via `ai_model`: `meshy-t1` — the current low-poly model — and `meshy-t2` — a new model with cleaner topology, natively separated parts, triangle output, and a face count you can set with `target_polycount`. `meshy-t2` is the default under `smart-topology`. The existing `model_type: lowpoly` is now deprecated but continues to serve traffic for backward compatibility.

### `Jul 7`
- Added the `aspect_ratio` parameter to the Image to Image API, so you can control the output image ratio when editing. Allowed values are `1:1`, `16:9`, `9:16`, `4:3`, `3:4` for the nano-banana models and `1:1`, `3:2`, `2:3` for `gpt-image-2`. Optional; defaults to `1:1`, and cannot be combined with `generate_multi_view`.

## June 2026

### `Jun 17`
- New API Playground docs page: an interactive console for trying endpoints without writing code, then copying the equivalent cURL, Python, or JavaScript. Available on the Pro, Premium, Ultra, Studio, and Enterprise plans.

### `Jun 15`
- New UV Unwrap API: generate a high-quality UV layout for an existing 3D model — the prerequisite step before texturing, or any time you need a clean, non-overlapping UV layout for downstream tools. Takes either an `input_task_id` (a completed Image to 3D, Text to 3D, or Remesh task) or a `model_url` (`.glb` only) and returns a "UV white model" with brand-new UV coordinates. 5 credits per call. Supports meshes of up to 40,000 faces (run Remesh first if larger); quad and n-gon meshes are triangulated during UV generation.

### `Jun 12`
- Updated Creative Lab API Build pricing to 30 credits per call for Keychain, Fridge Magnet, and Figure (previously 20). Lamp is unchanged at 30 credits. Prototype pricing is unchanged at 6 credits per image.

### `Jun 5`
- Added the optional `alpha_thumbnail` parameter to the Image to 3D, Multi-Image to 3D, Text to 3D, Retexture, Remesh, and Repair Printability APIs. When set to `true`, the task additionally renders a transparent-background (RGBA) version of the preview and returns it under the new `alpha_thumbnail_url` response field. The existing `thumbnail_url` is unchanged. Defaults to `false`.

### `Jun 1`
- New Creative Lab APIs: a family of product-scoped endpoints that turn a source photo (or text prompt) into a 3D-printable consumer product. Four products at launch — Keychain, Fridge Magnet, Figure, and Lamp. Each follows a two-stage `prototype` → `build` workflow chained via `input_task_id`, served under product-scoped URLs (`/openapi/creative-lab/<product>/v1/...`) with per-product versioning so products can evolve on independent version lines. Prototype: 6 credits per call. Build: 30 credits per call.

## May 2026

### `May 26`
- Added `multi_view_thumbnails` parameter to the Multi-Image to 3D API. When set to `true`, the task additionally renders four cardinal-view thumbnails (front, right, back, left) and returns them under the new `thumbnail_urls` response field. The existing `thumbnail_url` field is unchanged. Adds approximately 3 seconds to task latency.

### `May 22`
- The convert and resize functionality from the Remesh API is now available as standalone Convert API and Resize API endpoints. The deprecated parameters on Remesh will continue to work for backward compatibility.

### `May 13`
- Added `multi_view_thumbnails` parameter to the Image to 3D API. When set to `true`, the task additionally renders four cardinal-view thumbnails (front, right, back, left) and returns them under the new `thumbnail_urls` response field. The existing `thumbnail_url` field is unchanged. Adds approximately 3 seconds to task latency.

### `May 12`
- Added `resize_longest_side` parameter to the Remesh API. Resizes the model so the longest bounding-box dimension equals the specified value in meters. Mutually exclusive with `resize_height` and `auto_size`.

### `May 11`
- Deprecated `symmetry_mode` parameter on Text to 3D, Image to 3D, and Multi-Image to 3D endpoints. This parameter no longer affects output.

### `May 7`
- New Analyze Printability API: Analyze a succeeded Meshy task — or any 3D model URL — for FDM 3D printing readiness. Async create + stream pattern: POST returns a task_id, then GET / SSE stream return watertightness, volume, hole and non-manifold-edge metrics once SUCCEEDED. Free, no credits consumed.
- New Repair Printability API: Repair a 3D model for FDM printability — fix non-manifold edges, degenerate faces, holes, and other topology issues. Accepts an existing Meshy `input_task_id` or a `model_url` (`.glb`, `.stl`, `.obj`). Output format matches the input. 10 credits per task.

## April 2026

### `Apr 27`
- Added `consumed_credits` field to all task responses across every API endpoint. Shows the number of credits consumed by each task. The field is present for tasks in `PENDING`, `IN_PROGRESS`, and `SUCCEEDED` statuses. Returns `0` for `FAILED` tasks (credits are automatically refunded on failure).

### `Apr 24`
- Added `model_url` parameter to the Multi-Color Print endpoint. Submit a textured 3D model directly (via URL or Data URI) instead of an `input_task_id` from a prior Meshy task. Supported formats: `.glb`, `.fbx`. When both `model_url` and `input_task_id` are provided, `input_task_id` takes priority.

### `Apr 21`
- Added `input_task_id` parameter to the Image to 3D and Multi-Image to 3D endpoints. Reference a completed Text to Image or Image to Image task's output directly instead of providing `image_url` / `image_urls`. When both are supplied, `input_task_id` takes priority.

### `Apr 20`
- Added `hd_texture` parameter to the Image to 3D, Multi-Image to 3D, Text to 3D Refine, and Retexture endpoints. When enabled, the base color texture is generated at 4K (4096×4096) resolution for higher detail. Only supported for `meshy-6` and `latest`. Defaults to `false`.
- The PBR bundle returned when `enable_pbr` is `true` now includes an `emission` map under `texture_urls` for `meshy-6` and `latest` tasks across Image to 3D, Multi-Image to 3D, Text to 3D Refine, and Retexture. No request change is required.

### `Apr 14`
- Added `decimation_mode` parameter to the Image to 3D, Multi-Image to 3D, Text to 3D Preview, and Remesh endpoints. Sets the adaptive decimation polycount level: `1` (ultra), `2` (high), `3` (medium), or `4` (low).

### `Apr 12`
- Restructured API documentation: added parameter grouping with dependent fields, inline defaults, required/deprecated badges, expandable sub-navigation, and split Multi-Image, Rigging, and Animation into separate pages.

## March 2026

### `Apr 2`
- Added `3mf` format support to `target_formats` parameter across all endpoints (Image to 3D, Text to 3D, Remesh, Retexture). Note: 3MF is opt-in only and must be explicitly requested.
- New Multi-Color Print API: Convert 3D models to multi-color 3MF format for 3D printing. Supports 1-16 color palettes with configurable precision. 10 credits per task.

### `Mar 20`
- Retired the Meshy-4 AI model. All API requests using `meshy-4` are no longer supported. Please migrate to `meshy-6` or `latest`.
- Added `auto_size` and `origin_at` parameters to the Image to 3D, Multi-Image to 3D, Text to 3D, and Remesh endpoints. When `auto_size` is enabled, the service uses AI vision to estimate real-world height and resize the model automatically. `origin_at` sets the origin position (`bottom` or `center`). In the Remesh API, `auto_size` is mutually exclusive with `resize_height`.

### `Mar 17`
- Added optional `target_formats` parameter to Image to 3D, Multi-Image to 3D, Text to 3D, and Retexture endpoints. Specify which 3D formats to generate (e.g., `["glb", "fbx"]`) to reduce task completion time.

## February 2026

### `Feb 28`
- Added `remove_lighting` parameter to the Image to 3D, Multi-Image to 3D, Text to 3D Refine, and Retexture APIs. Removes highlights and shadows from the base color texture for cleaner results under custom lighting. Only supported for `meshy-6` and `latest`. Defaults to `true`.
- The Retexture and Text to 3D Refine APIs now support `meshy-6` as an `ai_model` value for full Meshy 6 texturing.

### `Feb 25`
- Added `image_enhancement` parameter to the Image to 3D and Multi-Image to 3D APIs for users who want to opt out of input image optimization and preserve the exact appearance of their input. Only supported for `meshy-6` and `latest`. Defaults to `true`.

### `Feb 20`
- Added `model_type` parameter to the Text to 3D Preview API for generating low-poly meshes optimized for cleaner polygons.

## January 2026

### `Jan 27`
- Added detailed Failure Modes documentation for all API endpoints, including common HTTP error codes (400, 401, 402, 404, 422, 429) and task failure reasons.

### `Jan 26`
- The Multi-Image to 3D API now supports Meshy-6 for full mesh generation. The `ai_model` parameter now accepts `meshy-6` and `latest` resolves to Meshy 6.

### `Jan 22`
- Deprecated `art_style` for the Text to 3D Preview API (Meshy-6). The parameter was designed for legacy models (Meshy-4 / Meshy-5) and will be removed in a future release.
- Deprecated `enable_pbr` for the Text to 3D and Image to 3D APIs when `ai_model` is `meshy-4`. This parameter will be removed in a future release.
- Updated the default value of `should_remesh` parameter for Meshy-6 in the Text to 3D and Image to 3D APIs. The parameter now defaults to `false` for `meshy-6`, and `true` for other models if not specified.

### `Jan 19`
- The `latest` option for `ai_model` in the Text to 3D (Preview) and Image to 3D APIs now resolves to Meshy 6.

### `Jan 12`
- Added a new `model_type` parameter to the Image to 3D API for generating low-poly meshes optimized for cleaner polygons.

## December 2025

### `Dec 31`
- Launched the API Playground, a dedicated space for developers to explore API parameters and test requests directly on the Meshy website.
- Introduced the Text to Image API and Image to Image API, enabling AI-powered image generation from text prompts and image editing from reference images. Both APIs support the `nano-banana` and `nano-banana-pro` models, with optional multi-view generation.

### `Dec 22`
- The `video_url` field in the Text to 3D API response is now deprecated and will be removed in a future release.

### `Dec 04`
- Added a new `pose_mode` parameter to the Text to 3D Preview, Image to 3D, and Multi-Image to 3D APIs. This parameter accepts `a-pose`, `t-pose`, or an empty string (default). The `is_a_t_pose` parameter is now deprecated in favor of `pose_mode`.

## November 2025

### `Nov 24`
- The Image to 3D and Multi-Image to 3D APIs add an optional `save_pre_remeshed_model` parameter and expose `model_urls.pre_remeshed_glb` when a pre-remesh backup is requested.

### `Nov 06`
- The Text to 3D Refine API now supports `ai_model = latest`, which resolves to Meshy 6 Preview.
- The Image to 3D API now defaults to Meshy-6-preview texturing when `ai_model = latest` and `should_texture = true`.
- The Multi-Image to 3D API now supports `ai_model = latest`, running Meshy-6-preview for texturing by default while mesh generation remains Meshy-5.
- The Retexture API adds a `latest` option for `ai_model` (Meshy-6-preview) and now defaults to it when omitted.

### `Nov 04`
- The Remesh API now preserves textures for uploaded models.
- The Retexture API now preserves textures for uploaded models when the `enable_original_uv` option is enabled.

## October 2025

### `Oct 28`
- Added the `x-api-version` response header to indicate the current API server version.

### `Oct 20`
- Added an optional `convert_format_only` boolean parameter to the Remesh API to support converting the format of the input model file only.
- Added `rigged_character_glb_url` to the response of The Rigging Task Object.

### `Oct 01`
- Remove `text-to-voxel` APIs

## September 2025

### `Sep 23`
- Added a `latest` option for `ai_model` in the Text to 3D API to use Meshy 6 Preview.
- Temporary 50% discount in place for Meshy-6-preview generation tasks to 10 credits that will last until Sep 30, 2025. After the discount period, the cost of Meshy-6-preview tasks will return to the normal 20 credits.

### `Sep 18`
- Updated API pricing for Text to 3D and Image to 3D to reflect different costs for Meshy 6 and other models.

### `Sep 16`
- Added a `latest` option for `ai_model` in the Image to 3D API to use Meshy 6 Preview.

### `Sep 4`
- Expanded `model_url` input support to `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl` for Remesh and Retexture.

## August 2025

### `Aug 18`
- Added an optional `is_a_t_pose` parameter to the Text to 3D Preview, Image to 3D, and Multi-Image to 3D APIs to generate models in an A/T pose.

### `Aug 13`
- Meshy 5 is now stable for Text to 3D and Image to 3D (`ai_model`: `meshy-5`), delivering improved quality and consistency.

## July 2025

### `Jul 31`
- Support PBR texture maps in API via `enable_pbr` parameter for latest `meshy-5` model for Text to 3D, Image to 3D, Multi-Image to 3D, and Retexture endpoints.

## June 2025

### `Jun 25`
- Added the Retexture API, which allows users to retexture 3D models based on Meshy's latest foundation AI models.

### `Jun 19`
- Added deletion APIs for Text to 3D, Image to 3D, Remesh, Rigging, and Animation.
- Added the `ai_model` parameter to the Text to 3D Refine API.

### `Jun 17`
- Added documentation for Webhooks.

### `Jun 10`
- The Remesh API now supports base64-encoded GLB format models in the `model_url` parameter via Data URI.

## May 2025

### `May 20`
- Added an optional `moderation` parameter to the Text to 3D Preview, Text to 3D Refine, Image to 3D, and Multi-Image to 3D APIs. When enabled, input content is automatically screened for potentially harmful content before generation.

### `May 15`
- Introduced the Auto-rigging & Animation API, enabling users to automatically rig and animate 3D models.

## April 2025

### `Apr 29`
- Introduced the Multi-Image to 3D API, allowing generation of 3D models from 1 to 4 input images using the `meshy-5` AI model.
- Added the `meshy-5` AI model option to the Text to 3D and Image to 3D APIs. The `latest` tag now also resolves to `meshy-5`.

### `Apr 17`
- Added the `texture_image_url` parameter to the Image to 3D and Text to 3D Refine APIs, allowing users to guide the texture generation process with an image.

## March 2025

### `Mar 28`
- Added the `latest` parameter to the Text to 3D and Image to 3D APIs, enabling access to our upcoming advanced AI models for improved generation quality.

### `Mar 14`
- The Text to Texture API now supports base64-encoded models in the `model_url` parameter via Data URI, similar to the `image_url` in the Image to 3D API.

### `Mar 06`
- Updated pricing for API generation tasks:
  - Text to 3D (Preview): Increased from 2 to 5 credits per call
  - Text to 3D (Refine): Increased from 5 to 10 credits per call
  - Image to 3D: Now 5 credits without texture, 15 credits with texture
  - Text to Texture: Increased from 5 to 10 credits per call
  - Text to Voxel: Remains at 5 credits per call

## February 2025

### `Feb 18`
- Added a test mode API key that allows developers to test API integration without consuming credits. All valid requests using this key will return the same sample task results.

### `Feb 13`
- **Breaking Changes:** Free tier task creation will end on `March 20, 2025`. After that, all API task requests will require a paid subscription. Use coupon code `APIACCESS` to enjoy a `40%` discount.
- Added Server-Sent Events (SSE) streaming endpoints for real-time task updates: Text to 3D Stream API, Image to 3D Stream API, Remesh Stream API, Text to Texture Stream API.

### `Feb 6`
- Added the `texture_prompt` parameter to the Image to 3D and Text to 3D Refine APIs, allowing users to guide the texture generation process with a text prompt.

## January 2025

### `Jan 23`
- Added endpoints for listing tasks to the Text to 3D, Image to 3D, Remesh and Text to Texture APIs.

### `Jan 14`
- Deprecated the legacy Text to 3D and Image to 3D APIs powered by Meshy-3 AI models.

### `Jan 07`
- Added the `symmetry_mode` parameter to the Text to 3D Preview and Image to 3D APIs, allowing for configurable symmetry settings.

## December 2024

### `Dec 19`
- Added the Remesh APIs, which allow users to remesh and export existing 3D models generated by other Meshy APIs into various formats.
- Updated the polycount limits for our APIs to a range of 100-300,000 for Premium users.

### `Dec 12`
- Deprecated the `model_url` property in all response objects.
- Separated legacy Meshy-3 API from the latest Meshy-4 API.

### `Dec 10`
- Added an `enable_pbr` parameter to the Image to 3D and Text to 3D Refine APIs.
- Added a `should_texture` parameter to the Image to 3D API.
- Deprecated the `pbr` option in `art_style` parameter for the Text to 3D Preview API when using the `meshy-4` AI model.
- Deprecated the `low-poly` option in `art_style` parameter for the Text to 3D Preview API.

### `Dec 5`
- Added a Get Balance API to allow users to retrieve their credit balance.
- Added a `should_remesh` parameter to the Image to 3D and Text to 3D Preview APIs.

### `Dec 3`
- External APIs now use the `/openapi` prefix. Legacy paths remain supported, but we recommend switching to the new paths.

## November 2024

### `Nov 14`
- The Image to 3D API now supports base64-encoded images.