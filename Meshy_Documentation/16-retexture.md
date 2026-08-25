# Retexture API

Source: https://docs.meshy.ai/en/api/retexture

Retexture API is a feature that allows you to integrate Meshy's AI retexturing capabilities into your own application.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/retexture` | Create a retexture task |
| GET | `/openapi/v1/retexture/:id` | Retrieve a retexture task |
| DELETE | `/openapi/v1/retexture/:id` | Delete a retexture task |
| GET | `/openapi/v1/retexture` | List retexture tasks (paginated) |
| GET | `/openapi/v1/retexture/:id/stream` | Stream a retexture task via SSE |

---

## Create a Retexture Task

Only one of `input_task_id` or `model_url` is required. If both are provided, `input_task_id` takes priority.

Exactly one style input is required: `text_style_prompt`, `image_style_url`, or `multiview_image_urls`. `multiview_image_urls` cannot be combined with either of the other two; if both `text_style_prompt` and `image_style_url` are provided, `image_style_url` takes priority.

### Parameters

- **`input_task_id`** (string, Required): ID of a completed Text to 3D Preview, Text to 3D Refine, Image to 3D, or Remesh task. Must be `SUCCEEDED`.
- **`model_url`** (string, Required): 3D model to texture. Supported formats: `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl`.
  - Publicly accessible URL, OR
  - Data URI: `data:application/octet-stream;base64,<your base64-encoded model data>`
- **`text_style_prompt`** (string, Required): Describe desired texture style in text. Max 600 chars.
- **`image_style_url`** (string, Required): 2D image to guide texturing. Supports `.jpg`, `.jpeg`, `.png`.
  - Publicly accessible URL, OR
  - Data URI: `data:image/jpeg;base64,<your base64-encoded image data>`
- **`multiview_image_urls`** (string[], Required): 1–4 images showing the same object from different views. First = primary (front) view. Requires explicit `ai_model: "meshy-7"`. Cannot combine with `text_style_prompt` or `image_style_url`.
- **`ai_model`** (string, default `"latest"`): `meshy-5`, `meshy-6`, `meshy-7`, `latest` (Meshy 7).
- **`enable_original_uv`** (boolean, default `false`): Keep the model's existing UV layout instead of generating a new one.
  - `true` for Meshy-generated models (reuse optimized UVs), or third-party models with good UVs.
  - `false` to let Meshy unwrap fresh UVs (best for models lacking proper UV mapping).
- **`enable_pbr`** (boolean, default `false`): Generate PBR maps. Emission for `meshy-6` (not at 8k). `meshy-7`/`latest` no emission.
- **`texture_resolution`** (string, default `"2k"`): `2k`, `4k`, `8k`. `4k`/`8k` require `meshy-6`/`meshy-7`/`latest`. At `8k`, no emission.
- **`hd_texture`** (boolean, ⚠ deprecated, default `false`): Use `texture_resolution` instead.
- **`remove_lighting`** (boolean, default `true`): Remove highlights/shadows. Only `meshy-6`.
- **`target_formats`** (string[]): `glb`, `obj`, `fbx`, `stl`, `usdz`, `3mf`. Omit = all except `3mf`.
- **`alpha_thumbnail`** (boolean, default `false`): Render transparent-background preview.

### Request

```bash
# Retexture with text prompt
curl https://api.meshy.ai/openapi/v1/retexture \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model_url": "https://cdn.meshy.ai/model/example_model_2.glb",
    "text_style_prompt": "red fangs, Samurai outfit that fused with japanese batik style",
    "enable_original_uv": true,
    "enable_pbr": true
  }'

# Retexture with image style and PBR
curl https://api.meshy.ai/openapi/v1/retexture \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model_url": "https://cdn.meshy.ai/model/example_model_2.glb",
    "image_style_url": "https://cdn.meshy.ai/image/example_image.jpg",
    "ai_model": "latest",
    "enable_pbr": true,
    "enable_original_uv": true
  }'
```

### Response

```json
{
  "result": "018a210d-8ba4-705c-b111-1f1776f7f578"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `model_url`/`input_task_id`, missing style input, conflicting style inputs, unsupported model for multi-view, model not available, invalid input task, invalid model format, unreachable URL.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve a Retexture Task

```bash
curl https://api.meshy.ai/openapi/v1/retexture/018a210d-8ba4-705c-b111-1f1776f7f578 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "type": "retexture",
  "model_urls": {
    "glb": "https://assets.meshy.ai/.../model.glb?Expires=***",
    "fbx": "https://assets.meshy.ai/.../model.fbx?Expires=***",
    "obj": "https://assets.meshy.ai/.../model.obj?Expires=***",
    "usdz": "https://assets.meshy.ai/.../model.usdz?Expires=***",
    "mtl": "https://assets.meshy.ai/.../model.mtl?Expires=***",
    "stl": "https://assets.meshy.ai/.../model.stl?Expires=***"
  },
  "thumbnail_url": "https://assets.meshy.ai/.../preview.png?Expires=***",
  "text_style_prompt": "red fangs, Samurai outfit that fused with japanese batik style",
  "image_style_url": "",
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
  "task_error": { "message": "" },
  "consumed_credits": 10
}
```

---

## Delete a Retexture Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/retexture/a43b5c6d-7e8f-901a-234b-567c890d1e2f \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Retexture Tasks

### Parameters

- **`page_num`** (integer, default `1`): Page number.
- **`page_size`** (integer, default `10`): Max `50`.
- **`sort_by`** (string): `+created_at` or `-created_at`.

```bash
curl https://api.meshy.ai/openapi/v1/retexture?page_size=10 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## Stream a Retexture Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/retexture/018a210d-8ba4-705c-b111-1f1776f7f578/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Retexture Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `retexture` |
| `model_urls` | object | `glb`, `fbx`, `obj`, `usdz`, `mtl`, `stl`, `3mf` |
| `text_style_prompt` | string | Text prompt used for texturing |
| `image_style_url` | string | Image input used for texturing |
| `multiview_image_urls` | string[] | Multi-view reference image URLs (if `multiview_image_urls` used) |
| `thumbnail_url` | string | Preview image URL |
| `alpha_thumbnail_url` | string | Transparent-background preview (if `alpha_thumbnail: true`) |
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