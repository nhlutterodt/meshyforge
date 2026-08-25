# Animation API

Source: https://docs.meshy.ai/en/api/animation

Endpoints for discovering available animations and applying them to rigged characters.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/animations` | Create an animation task |
| GET | `/openapi/v1/animations/:id` | Retrieve an animation task |
| DELETE | `/openapi/v1/animations/:id` | Delete an animation task |
| GET | `/openapi/v1/animations` | List animation tasks (paginated) |
| GET | `/openapi/v1/animations/:id/stream` | Stream an animation task via SSE |

---

## Create an Animation Task

This endpoint allows you to create a new task to apply a specific animation action to a previously rigged character. Includes post-processing options.

### Parameters

- **`rig_task_id`** (string, **Required**): The `id` of a successfully completed rigging task (from `POST /openapi/v1/rigging`). The character from this task will be animated.
- **`action_id`** (integer, **Required**): The identifier of the animation action to apply. See the Animation Library Reference for a complete list of available animations.
- **`post_process`** (object, optional): Optional post-processing for the animation output. Omit it to receive the standard animation files.
  - **`operation_type`** (string, **Required**): The type of operation to perform. Values: `change_fps`, `fbx2usdz`, `extract_armature`.
  - **`fps`** (integer, default `30`): The target frame rate. Applicable only when `operation_type` is `change_fps`. Allowed values: `24`, `25`, `30`, `60`.

### Request

```bash
# Animate a rigged model with required params only
curl https://api.meshy.ai/openapi/v1/animations \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "rig_task_id": "018b314a-a1b5-716d-c222-2f1776f7f579",
    "action_id": 92
  }'

# With post-processing to change FPS
curl https://api.meshy.ai/openapi/v1/animations \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "rig_task_id": "018b314a-a1b5-716d-c222-2f1776f7f579",
    "action_id": 92,
    "post_process": {
      "operation_type": "change_fps",
      "fps": 24
    }
  }'
```

### Response

```json
{
  "result": "018c425b-b2c6-727e-d333-3c1887i9h791"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `rig_task_id`/`action_id`, invalid rig task, invalid action ID.
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `404 - Not Found`: Rigging task specified by `rig_task_id` was not found.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve an Animation Task

```bash
curl https://api.meshy.ai/openapi/v1/animations/018c425b-b2c6-727e-d333-3c1887i9h791 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "018c425b-b2c6-727e-d333-3c1887i9h791",
  "type": "animate",
  "status": "SUCCEEDED",
  "created_at": 1747032440896,
  "progress": 100,
  "started_at": 1747032441210,
  "finished_at": 1747032457530,
  "expires_at": 1747291657530,
  "task_error": { "message": "" },
  "consumed_credits": 3,
  "result": {
    "animation_glb_url": "https://assets.meshy.ai/.../Animation_Reaping_Swing_withSkin.glb?Expires=...",
    "animation_fbx_url": "https://assets.meshy.ai/.../Animation_Reaping_Swing_withSkin.fbx?Expires=...",
    "processed_usdz_url": "https://assets.meshy.ai/.../processed.usdz?Expires=...",
    "processed_armature_fbx_url": "https://assets.meshy.ai/.../processed_armature.fbx?Expires=...",
    "processed_animation_fps_fbx_url": "https://assets.meshy.ai/.../processed_60fps.fbx?Expires=..."
  },
  "preceding_tasks": 0
}
```

---

## Delete an Animation Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/animations/018b314a-a1b5-716d-c222-2f1776f7f579 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Animation Tasks

Returns a paginated list of the caller's animation tasks, newest first.

```bash
curl "https://api.meshy.ai/openapi/v1/animations?page_num=1&page_size=20" \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

> **Note:** Tasks created through the API are managed through the API — they do not appear in the web app's My Assets.

---

## Stream an Animation Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/animations/018c425b-b2c6-727e-d333-3c1887i9h791/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Animation Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `animate` |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `progress` | integer | 0–100 |
| `created_at` | timestamp | ms since epoch |
| `started_at` | timestamp | ms since epoch; 0 if not started |
| `finished_at` | timestamp | ms since epoch; 0 if not finished |
| `expires_at` | timestamp | ms since epoch; when result assets expire |
| `task_error` | object | Error details |
| `consumed_credits` | integer | Credits consumed (0 for `FAILED`) |
| `result` | object | Output animation URLs (if `SUCCEEDED`) |
| `result.animation_glb_url` | string | Animation in GLB format |
| `result.animation_fbx_url` | string | Animation in FBX format |
| `result.processed_usdz_url` | string | Processed animation in USDZ (if `fbx2usdz` operation) |
| `result.processed_armature_fbx_url` | string | Processed armature in FBX (if `extract_armature` operation) |
| `result.processed_animation_fps_fbx_url` | string | Animation with changed FPS in FBX (if `change_fps` operation) |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |