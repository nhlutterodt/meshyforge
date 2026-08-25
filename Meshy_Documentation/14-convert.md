# Convert API

Source: https://docs.meshy.ai/en/api/convert

The Convert API allows you to convert existing 3D models into different file formats.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/convert` | Create a convert task |
| GET | `/openapi/v1/convert/:id` | Retrieve a convert task |
| DELETE | `/openapi/v1/convert/:id` | Delete a convert task |
| GET | `/openapi/v1/convert` | List convert tasks (paginated) |
| GET | `/openapi/v1/convert/:id/stream` | Stream a convert task via SSE |

---

## Create a Convert Task

Only one of `input_task_id` or `model_url` is required. If both are provided, `input_task_id` takes priority.

### Parameters

- **`input_task_id`** (string, Required): ID of a completed Meshy task. Must be `SUCCEEDED`.
- **`model_url`** (string, Required): Publicly accessible URL or Data URI. Supported formats: `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl`. For Data URIs, use MIME type: `application/octet-stream`.
- **`target_formats`** (string[], **Required**): Output formats. Values: `glb`, `fbx`, `obj`, `usdz`, `blend`, `stl`, `3mf`.

### Request

```bash
curl https://api.meshy.ai/openapi/v1/convert \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "input_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578",
    "target_formats": ["fbx", "stl"]
  }'
```

### Response

```json
{
  "result": "0193bfc5-ee4f-73f8-8525-44b398884ce9"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `model_url`/`input_task_id`, missing `target_formats`, invalid input task, invalid model format, unreachable URL.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve a Convert Task

```bash
curl https://api.meshy.ai/openapi/v1/convert/a43b5c6d-7e8f-901a-234b-567c890d1e2f \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "0193bfc5-ee4f-73f8-8525-44b398884ce9",
  "type": "convert",
  "model_urls": {
    "glb": "",
    "fbx": "https://assets.meshy.ai/.../model.fbx?Expires=...",
    "obj": "",
    "usdz": "",
    "stl": "https://assets.meshy.ai/.../model.stl?Expires=..."
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

## Delete a Convert Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/convert/a43b5c6d-7e8f-901a-234b-567c890d1e2f \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Convert Tasks

### Parameters

- **`page_num`** (integer, default `1`): Page number.
- **`page_size`** (integer, default `10`): Max `50`.
- **`sort_by`** (string): `+created_at` or `-created_at`.

```bash
curl https://api.meshy.ai/openapi/v1/convert?page_size=10 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## Stream a Convert Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/convert/a43b5c6d-7e8f-901a-234b-567c890d1e2f/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Convert Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `convert` |
| `model_urls` | object | URLs for converted model files (only requested formats have URLs) |
| `progress` | integer | 0–100 |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |
| `created_at` | timestamp | ms since epoch |
| `started_at` | timestamp | ms since epoch; 0 if not started |
| `finished_at` | timestamp | ms since epoch; 0 if not finished |
| `task_error` | object | Error details |
| `consumed_credits` | integer | Credits consumed (1 per convert task; 0 for `FAILED`) |