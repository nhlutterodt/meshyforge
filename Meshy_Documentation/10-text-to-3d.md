# Text to 3D API

Source: https://docs.meshy.ai/en/api/text-to-3d

Text to 3D API is a feature that allows you to integrate Meshy's Text to 3D capabilities into your own application.

Text to 3D uses a **two-step workflow**. First, create a preview task (`mode: "preview"`) to generate a 3D mesh without texture, so you can evaluate the shape. Then, pass the completed preview's task ID to a refine task (`mode: "refine"`) to apply texture to the mesh. Both steps share the same endpoint: `POST /openapi/v2/text-to-3d`.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v2/text-to-3d` | Create a Text to 3D task (preview or refine) |
| GET | `/openapi/v2/text-to-3d/:id` | Retrieve a task |
| DELETE | `/openapi/v2/text-to-3d/:id` | Delete a task |
| GET | `/openapi/v2/text-to-3d` | List tasks (paginated) |
| GET | `/openapi/v2/text-to-3d/:id/stream` | Stream a task via SSE |

---

## Create a Text to 3D Preview Task

This endpoint creates a Text to 3D preview task, which generates an untextured 3D mesh (geometry only) from a text prompt. This is the first step of the two-step workflow. Once the preview succeeds, use the returned task ID to create a refine task for texturing.

### Parameters

- **`mode`** (string, **Required**): Set to `"preview"` when creating a preview task.
- **`prompt`** (string, **Required**): Describe what kind of object the 3D model is. Maximum 600 characters.
- **`model_type`** (string, default `"standard"`): Type of 3D mesh generation.
  - `standard`: Regular high-detail 3D mesh generation.
  - `smart-topology`: Choose a Smart Topology model with `ai_model` (`meshy-t2`).
  - `lowpoly` (deprecated): Generates low-poly mesh. Use `smart-topology` instead.
- **`ai_model`** (string, default `"latest"`): ID of the model to use.
  - Standard generation: `meshy-5`, `meshy-6`, `meshy-7`, `latest` (Meshy 7)
  - Smart Topology generation: `meshy-t2` (default)
- **`ultra_mode`** (boolean, default `false`): Enables Ultra generation for higher-fidelity geometry. Only supported when `ai_model` is `meshy-7` (or `latest`), and only on the `preview` mode. Adds 5 credits.
- **`should_remesh`** (boolean, default `false` for meshy-6/7, `true` for others): Controls whether to enable the remesh phase. For highest quality, recommend `false`.
  - Applies only when `should_remesh = true`:
    - **`topology`** (string, default `"triangle"`): `quad` or `triangle`. Smart Topology output is triangle-only.
    - **`decimation_mode`** (integer): `1` (ultra), `2` (high), `3` (medium), `4` (low).
    - **`target_polycount`** (integer): Range 100 to 300,000 (standard), or 100 to 15,000 (smart-topology, default 4,000).
- **`symmetry_mode`** (string, ⚠ deprecated, default `"auto"`): No longer affects output.
- **`pose_mode`** (string, default `""`): `a-pose`, `t-pose`, or `""` (no specific pose).
- **`is_a_t_pose`** (boolean, ⚠ deprecated, default `false`): Use `pose_mode` instead.
- **`art_style`** (string, ⚠ deprecated, default `"realistic"`): Not supported by Meshy-6.
- **`moderation`** (boolean, default `false`): Screen input content for harmful content.
- **`target_formats`** (string[]): Which 3D file formats to include. Values: `glb`, `obj`, `fbx`, `stl`, `usdz`, `3mf`. When omitted, all except `3mf` are generated.
- **`alpha_thumbnail`** (boolean, default `false`): Render transparent-background (RGBA) preview.
- **`auto_size`** (boolean, default `false`): AI vision estimates real-world height and resizes model.
  - **`origin_at`** (string, default `"bottom"`): `bottom` or `center`.

### Request

```bash
# Simple preview with required params only
curl https://api.meshy.ai/openapi/v2/text-to-3d \
  -H 'Authorization: Bearer ${YOUR_API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
  "mode": "preview",
  "prompt": "a monster mask"
}'

# Preview with remesh and A-pose
curl https://api.meshy.ai/openapi/v2/text-to-3d \
  -H 'Authorization: Bearer ${YOUR_API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
  "mode": "preview",
  "prompt": "a futuristic robot warrior",
  "should_remesh": true,
  "target_polycount": 100000,
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

- `400 - Bad Request`: Missing `prompt`/`mode`, invalid `art_style`, prompt too long.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Create a Text to 3D Refine Task

This endpoint creates a Text to 3D refine task, which applies texture to a completed preview mesh.

### Parameters

- **`mode`** (string, **Required**): Set to `"refine"`.
- **`preview_task_id`** (string, **Required**): The corresponding preview task id. Must be `SUCCEEDED`.
- **`enable_pbr`** (boolean, default `false`): Generate PBR maps (metallic, roughness, normal) + emission (for meshy-6, not at 8k).
- **`texture_resolution`** (string, default `"2k"`): `2k`, `4k`, or `8k`. `4k`/`8k` require `meshy-6`/`meshy-7`/`latest`. At `8k`, no emission map.
- **`hd_texture`** (boolean, ⚠ deprecated, default `false`): Use `texture_resolution` instead.
- **`texture_prompt`** (string): Text prompt to guide texturing. Max 600 chars.
- **`texture_image_url`** (string): Image to guide texturing (URL or Data URI, `.jpg`/`.jpeg`/`.png`).
- **`ai_model`** (string, default `"latest"`): `meshy-5`, `meshy-6`, `meshy-7`, `latest`.
- **`moderation`** (boolean, default `false`): Screen `texture_prompt` and `texture_image_url`.
- **`remove_lighting`** (boolean, default `true`): Remove highlights/shadows. Only `meshy-6`; ignored on meshy-7/latest.
- **`target_formats`** (string[]): `glb`, `obj`, `fbx`, `stl`, `usdz`, `3mf`.
- **`alpha_thumbnail`** (boolean, default `false`): Render transparent-background preview.
- **`auto_size`** (boolean, default `false`): AI vision estimates real-world height.
  - **`origin_at`** (string, default `"bottom"`): `bottom` or `center`.

### Request

```bash
# Basic refine task
curl https://api.meshy.ai/openapi/v2/text-to-3d \
  -H 'Authorization: Bearer ${YOUR_API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
  "mode": "refine",
  "preview_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "enable_pbr": true
}'
```

### Failure Modes

- `400 - Bad Request`: Invalid `preview_task_id`, task not ready, model mismatch.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `404 - Not Found`: Preview task not found.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve a Text to 3D Task

```bash
curl https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response (Preview)

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "type": "text-to-3d-preview",
  "model_urls": {
    "glb": "https://assets.meshy.ai/***/tasks/.../output/model.glb?Expires=***",
    "fbx": "https://assets.meshy.ai/***/tasks/.../output/model.fbx?Expires=***",
    "obj": "https://assets.meshy.ai/***/tasks/.../output/model.obj?Expires=***",
    "mtl": "https://assets.meshy.ai/***/tasks/.../output/model.mtl?Expires=***",
    "usdz": "https://assets.meshy.ai/***/tasks/.../output/model.usdz?Expires=***",
    "stl": "https://assets.meshy.ai/***/tasks/.../output/model.stl?Expires=***"
  },
  "thumbnail_url": "https://assets.meshy.ai/***/tasks/.../output/preview.png?Expires=***",
  "prompt": "a monster mask",
  "progress": 100,
  "started_at": 1692771667037,
  "created_at": 1692771650657,
  "finished_at": 1692771669037,
  "status": "SUCCEEDED",
  "texture_urls": [
    {
      "base_color": "https://assets.meshy.ai/***/tasks/.../output/texture_0.png?Expires=***"
    }
  ],
  "preceding_tasks": 0,
  "task_error": { "message": "" },
  "consumed_credits": 20
}
```

---

## Delete a Text to 3D Task

Permanently deletes a task, including all associated models and data. Irreversible.

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Text to 3D Tasks

### Parameters

- **`page_num`** (integer, default `1`): Page number.
- **`page_size`** (integer, default `10`): Max `50` items.
- **`sort_by`** (string): `+created_at` or `-created_at`.

```bash
curl https://api.meshy.ai/openapi/v2/text-to-3d?page_size=10 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## Stream a Text to 3D Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response Stream

```
event: error
data: { "status_code": 404, "message": "Task not found" }

event: message
data: { "id": "...", "progress": 0, "status": "PENDING" }

event: message
data: { "id": "...", "progress": 50, "status": "IN_PROGRESS" }

event: message
data: { "id": "...", "type": "text-to-3d-preview", "progress": 100, "status": "SUCCEEDED", ... }
```

---

## The Text to 3D Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (k-sortable UUID) |
| `type` | string | `text-to-3d-preview` or `text-to-3d-refine` |
| `model_urls` | object | Downloadable URLs: `glb`, `fbx`, `usdz`, `obj`, `mtl`, `stl`, `3mf` |
| `prompt` | string | Unmodified prompt used to create the task |
| `negative_prompt` | string | ⚠ deprecated, no functional impact |
| `art_style` | string | ⚠ deprecated, not supported by Meshy-6 |
| `texture_richness` | string | ⚠ deprecated |
| `texture_prompt` | string | Additional text prompt for refine texturing |
| `ultra_mode` | boolean | Echoes preview `ultra_mode` (meshy-7/latest only) |
| `texture_image_url` | string | Texture image URL used |
| `thumbnail_url` | string | Preview image URL |
| `alpha_thumbnail_url` | string | Transparent-background preview (if `alpha_thumbnail: true`) |
| `video_url` | string | ⚠ deprecated, will be removed |
| `progress` | integer | 0–100 |
| `started_at` | timestamp | ms since epoch; 0 if not started |
| `created_at` | timestamp | ms since epoch |
| `finished_at` | timestamp | ms since epoch; 0 if not finished |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `texture_urls` | array | Texture map objects: `base_color`, `metallic`, `normal`, `roughness`, `emission` |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |
| `task_error` | object | Error details for failed tasks |
| `consumed_credits` | integer | Credits consumed (0 for `FAILED`) |