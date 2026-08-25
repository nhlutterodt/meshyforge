# Resize API

Source: https://docs.meshy.ai/en/api/resize

The Resize API allows you to resize existing 3D models to real-world dimensions. You can specify an exact height, a longest-side constraint, or let AI automatically estimate the appropriate size.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/resize` | Create a resize task |
| GET | `/openapi/v1/resize/:id` | Retrieve a resize task |
| DELETE | `/openapi/v1/resize/:id` | Delete a resize task |
| GET | `/openapi/v1/resize` | List resize tasks (paginated) |
| GET | `/openapi/v1/resize/:id/stream` | Stream a resize task via SSE |

---

## Create a Resize Task

Only one of `input_task_id` or `model_url` is required. If both are provided, `input_task_id` takes priority.

Exactly one resize mode is required: `resize_height`, `resize_longest_side`, or `auto_size`. These three parameters are mutually exclusive.

### Parameters

- **`input_task_id`** (string, Required): ID of a completed Meshy task. Must be `SUCCEEDED`. Output format will be GLB.
- **`model_url`** (string, Required): Publicly accessible URL or Data URI. Supported formats: `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl`. For Data URIs, use MIME type: `application/octet-stream`. Output preserves the original format.
- **`resize_height`** (number): Resize the model to a specific height in meters.
- **`resize_longest_side`** (number): Resize so the longest side matches this value in meters. Aspect ratio preserved.
- **`auto_size`** (boolean): When `true`, AI vision estimates real-world height and resizes accordingly. Origin defaults to `bottom` unless `origin_at` is set.
- **`origin_at`** (string, default `"bottom"`): Position of the origin after resizing. Values: `bottom`, `center`.

### Request

```bash
# Simple: resize to a specific height
curl https://api.meshy.ai/openapi/v1/resize \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "input_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
    "resize_height": 1.8
  }'

# Advanced: resize longest side with custom origin
curl https://api.meshy.ai/openapi/v1/resize \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model_url": "https://example.com/model.glb",
    "resize_longest_side": 2.0,
    "origin_at": "center"
  }'
```

### Response

```json
{
  "result": "0193bfc5-ee4f-73f8-8525-44b398884ce9"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `model_url`/`input_task_id`, missing resize mode, mutually exclusive parameters, invalid input task, invalid model format, unreachable URL.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve a Resize Task

```bash
curl https://api.meshy.ai/openapi/v1/resize/a43b5c6d-7e8f-901a-234b-567c890d1e2f \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "0193bfc5-ee4f-73f8-8525-44b398884ce9",
  "type": "resize",
  "model_urls": {
    "glb": "https://assets.meshy.ai/.../model.glb?Expires=..."
  },
  "progress": 100,
  "status": "SUCCEEDED",
  "created_at": 1699999999000,
  "started_at": 1700000000000,
  "finished_at": 1700000001000,
  "task_error": null,
  "consumed_credits": 1
}
```

---

## Delete a Resize Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/resize/a43b5c6d-7e8f-901a-234b-567c890d1e2f \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Resize Tasks

### Parameters

- **`page_num`** (integer, default `1`): Page number.
- **`page_size`** (integer, default `10`): Max `50`.
- **`sort_by`** (string): `+created_at` or `-created_at`.

```bash
curl https://api.meshy.ai/openapi/v1/resize?page_size=10 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## Stream a Resize Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/resize/a43b5c6d-7e8f-901a-234b-567c890d1e2f/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Resize Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `resize` |
| `model_urls` | object | Downloadable URL for resized model (GLB for `input_task_id`; original format for `model_url`) |
| `progress` | integer | 0–100 |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |
| `created_at` | timestamp | ms since epoch |
| `started_at` | timestamp | ms since epoch; 0 if not started |
| `finished_at` | timestamp | ms since epoch; 0 if not finished |
| `task_error` | object | Error details |
| `consumed_credits` | integer | Credits consumed (1 per resize task; 0 for `FAILED`) |