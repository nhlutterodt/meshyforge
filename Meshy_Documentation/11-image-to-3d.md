# Image to 3D API

Source: https://docs.meshy.ai/en/api/image-to-3d

Image to 3D API is a feature that allows you to integrate Meshy's Image to 3D capabilities into your own application.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/image-to-3d` | Create an Image to 3D task |
| GET | `/openapi/v1/image-to-3d/:id` | Retrieve a task |
| DELETE | `/openapi/v1/image-to-3d/:id` | Delete a task |
| GET | `/openapi/v1/image-to-3d` | List tasks (paginated) |
| GET | `/openapi/v1/image-to-3d/:id/stream` | Stream a task via SSE |

---

## Create an Image to 3D Task

Only one of `input_task_id` or `image_url` is required. If both are provided, `input_task_id` takes priority.

### Parameters

- **`input_task_id`** (string, Required): ID of a completed image-generation task (Text to Image or Image to Image). Must be `SUCCEEDED` and produce exactly one image.
- **`image_url`** (string, Required): Image for model creation. Supports `.jpg`, `.jpeg`, `.png`.
  - Publicly accessible URL, OR
  - Data URI: `data:image/jpeg;base64,<your base64-encoded image data>`
- **`model_type`** (string, default `"standard"`):
  - `standard`: Regular high-detail 3D mesh generation.
  - `smart-topology`: Smart Topology model with `ai_model` (`meshy-t1` or `meshy-t2`).
  - `lowpoly` (deprecated): Use `smart-topology` instead.
- **`ai_model`** (string, default `"latest"`):
  - Standard: `meshy-5`, `meshy-6`, `meshy-7`, `latest` (Meshy 7)
  - Smart Topology: `meshy-t2` (default, recommended), `meshy-t1`
- **`ultra_mode`** (boolean, default `false`): Ultra generation for higher-fidelity geometry. Only `meshy-7`/`latest`.
- **`should_texture`** (boolean, default `true`): Whether to generate textures. `false` = mesh only.
  - Applies only when `should_texture = true`:
    - **`enable_pbr`** (boolean, default `false`): Generate PBR maps. Emission map included for `meshy-6` (not at 8k). `meshy-7`/`latest` no emission.
    - **`texture_resolution`** (string, default `"2k"`): `2k`, `4k`, `8k`. `4k`/`8k` not available with `meshy-5`. At `8k`, no emission.
    - **`hd_texture`** (boolean, ⚠ deprecated, default `false`): Use `texture_resolution` instead.
    - **`texture_prompt`** (string): Text prompt to guide texturing. Max 600 chars.
    - **`texture_image_url`** (string): Image to guide texturing. Only one of `texture_image_url` or `texture_prompt`; if both, `texture_prompt` used by default. Costs 10 credits.
- **`should_remesh`** (boolean, default `false` for meshy-6/7, `true` for others):
  - Applies only when `should_remesh = true`:
    - **`topology`** (string, default `"triangle"`): `quad` or `triangle`.
    - **`decimation_mode`** (integer): `1` (ultra), `2` (high), `3` (medium), `4` (low).
- **`save_pre_remeshed_model`** (boolean, default `false`): Store extra GLB before remesh phase.
- **`target_polycount`** (integer): Target faces. Standard remesh: 100–300,000 (default 30,000). Smart Topology: 100–15,000 (default 4,000).
- **`symmetry_mode`** (string, ⚠ deprecated, default `"auto"`): No longer affects output.
- **`pose_mode`** (string, default `""`): `a-pose`, `t-pose`, or `""`.
- **`is_a_t_pose`** (boolean, ⚠ deprecated, default `false`): Use `pose_mode` instead.
- **`image_enhancement`** (boolean, default `true`): Optimize input image. `false` preserves exact appearance. Only `meshy-6`/`meshy-7`/`latest`.
- **`remove_lighting`** (boolean, default `true`): Remove highlights/shadows. Only `meshy-6`.
- **`moderation`** (boolean, default `false`): Screen `image_url`, `texture_image_url`, `texture_prompt`.
- **`target_formats`** (string[]): `glb`, `obj`, `fbx`, `stl`, `usdz`, `3mf`. Omit = all except `3mf`.
- **`auto_size`** (boolean, default `false`): AI vision estimates real-world height.
  - **`origin_at`** (string, default `"bottom"`): `bottom` or `center`.
- **`alpha_thumbnail`** (boolean, default `false`): Render transparent-background preview.
- **`multi_view_thumbnails`** (boolean, default `false`): Render 4 cardinal-view thumbnails. Adds ~3 sec latency.

### Request

```bash
# Simple request with required params
curl https://api.meshy.ai/openapi/v1/image-to-3d \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "image_url": "<your publicly accessible image url or base64-encoded data URI>"
  }'

# With remesh, PBR, and A-pose
curl https://api.meshy.ai/openapi/v1/image-to-3d \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "image_url": "<your publicly accessible image url or base64-encoded data URI>",
    "enable_pbr": true,
    "should_remesh": true,
    "target_polycount": 100000,
    "should_texture": true,
    "pose_mode": "a-pose",
    "target_formats": ["glb"]
  }'
```

### Response

```json
{
  "result": "018a210d-8ba4-705c-b111-1f1776f7f578"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `image_url`/`input_task_id`, invalid input task, invalid image format, unreachable URL, invalid Data URI, `enable_pbr` without `should_texture`.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve an Image to 3D Task

```bash
curl https://api.meshy.ai/openapi/v1/image-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "type": "image-to-3d",
  "model_urls": {
    "glb": "https://assets.meshy.ai/.../model.glb?Expires=***",
    "fbx": "https://assets.meshy.ai/.../model.fbx?Expires=***",
    "obj": "https://assets.meshy.ai/.../model.obj?Expires=***",
    "usdz": "https://assets.meshy.ai/.../model.usdz?Expires=***",
    "stl": "https://assets.meshy.ai/.../model.stl?Expires=***",
    "pre_remeshed_glb": "https://assets.meshy.ai/.../pre_remeshed_model.glb?Expires=***"
  },
  "thumbnail_url": "https://assets.meshy.ai/.../preview.png?Expires=***",
  "thumbnail_urls": {
    "front": "...", "right": "...", "back": "...", "left": "..."
  },
  "texture_prompt": "",
  "texture_image_url": "",
  "progress": 100,
  "status": "SUCCEEDED",
  "texture_urls": [
    {
      "base_color": "...",
      "metallic": "...",
      "normal": "...",
      "roughness": "...",
      "emission": "..."
    }
  ],
  "preceding_tasks": 0,
  "task_error": { "message": "" },
  "consumed_credits": 30
}
```

---

## Delete an Image to 3D Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/image-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Image to 3D Tasks

### Parameters

- **`page_num`** (integer, default `1`): Page number.
- **`page_size`** (integer, default `10`): Max `50`.
- **`sort_by`** (string): `+created_at` or `-created_at`.

```bash
curl https://api.meshy.ai/openapi/v1/image-to-3d?page_size=10 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## Stream an Image to 3D Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/image-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Image to 3D Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `image-to-3d` |
| `model_urls` | object | `glb`, `fbx`, `obj`, `usdz`, `mtl`, `stl`, `3mf`, `pre_remeshed_glb` |
| `thumbnail_url` | string | Preview image URL |
| `alpha_thumbnail_url` | string | Transparent-background preview (if `alpha_thumbnail: true`) |
| `thumbnail_urls` | object | 4 cardinal-view thumbnails (if `multi_view_thumbnails: true`): `front`, `right`, `back`, `left` |
| `texture_prompt` | string | Text prompt used for texturing |
| `texture_image_url` | string | Texture image URL used |
| `ultra_mode` | boolean | Echoes `ultra_mode` (meshy-7/latest only) |
| `progress` | integer | 0–100 |
| `started_at` | timestamp | ms since epoch |
| `created_at` | timestamp | ms since epoch |
| `expires_at` | timestamp | ms since epoch |
| `finished_at` | timestamp | ms since epoch |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `texture_urls` | array | `base_color`, `metallic`, `normal`, `roughness`, `emission` |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |
| `task_error` | object | Error details |
| `consumed_credits` | integer | Credits consumed (0 for `FAILED`) |