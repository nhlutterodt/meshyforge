# Rigging API

Source: https://docs.meshy.ai/en/api/rigging

The Rigging API allows you to programmatically add a skeleton (armature) to 3D humanoid models, binding the mesh to it so they are ready for animation. For applying animations to a rigged character, see the [Animation API](./18-animation.md).

> **Note:** Programmatic rigging currently only works well with standard humanoid (bipedal) assets with clearly defined limbs and body structure.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/openapi/v1/rigging` | Create a rigging task |
| GET | `/openapi/v1/rigging/:id` | Retrieve a rigging task |
| DELETE | `/openapi/v1/rigging/:id` | Delete a rigging task |
| GET | `/openapi/v1/rigging` | List rigging tasks (paginated) |
| GET | `/openapi/v1/rigging/:id/stream` | Stream a rigging task via SSE |

---

## Create a Rigging Task

Only one of `input_task_id` or `model_url` is required. If both are provided, `input_task_id` takes priority.

### Important Notes

- Auto-rigging is **not suitable** for: untextured meshes, non-humanoid assets, humanoid assets with unclear limb and body structure.
- When using `input_task_id`, models with more than **300,000 faces** are not supported. Use the [Remesh API](./13-remesh.md) to reduce face count first.
- When using `model_url`, the character's face must point toward the **+Z axis** (standard glTF forward direction). Models facing other axes will fail pose estimation.

### Parameters

- **`input_task_id`** (string, Required): The input task that needs to be rigged. We currently support textured humanoid models.
- **`model_url`** (string, Required): 3D model for Meshy to rig via publicly accessible URL or Data URI. We currently support textured humanoid GLB files (`.glb` format).
- **`height_meters`** (number, default `1.7`): The approximate height of the character model in meters. Must be a positive number.
- **`texture_image_url`** (string): The model's UV-unwrapped base color texture image. Publicly accessible URL or Data URI. We currently support `.png` formats.

### Request

```bash
# Rig a model from a URL
curl https://api.meshy.ai/openapi/v1/rigging \
  -X POST \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model_url": "YOUR_MODEL_URL_OR_DATA_URI",
    "height_meters": 1.8
  }'
```

### Response

```json
{
  "result": "018b314a-a1b5-716d-c222-2f1776f7f579"
}
```

### Failure Modes

- `400 - Bad Request`: Missing `model_url`/`input_task_id`, invalid model format (only `.glb` supported), unreachable URL, invalid input task, face count exceeded (>300,000 — use Remesh first).
- `401 - Unauthorized`: Authentication failed.
- `402 - Payment Required`: Insufficient credits.
- `422 - Unprocessable Entity`: Pose estimation failed. The provided model may not be a valid humanoid character.
- `429 - Too Many Requests`: Rate limit exceeded.

---

## Retrieve a Rigging Task

```bash
curl https://api.meshy.ai/openapi/v1/rigging/018b314a-a1b5-716d-c222-2f1776f7f579 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

### Response

```json
{
  "id": "018b314a-a1b5-716d-c222-2f1776f7f579",
  "type": "rig",
  "status": "SUCCEEDED",
  "created_at": 1747032400453,
  "progress": 100,
  "started_at": 1747032401314,
  "finished_at": 1747032418417,
  "expires_at": 1747291618417,
  "task_error": { "message": "" },
  "consumed_credits": 5,
  "result": {
    "rigged_character_fbx_url": "https://assets.meshy.ai/.../Character_output.fbx?Expires=...",
    "rigged_character_glb_url": "https://assets.meshy.ai/.../Character_output.glb?Expires=...",
    "basic_animations": {
      "walking_glb_url": "https://assets.meshy.ai/.../Animation_Walking_withSkin.glb?Expires=...",
      "walking_fbx_url": "https://assets.meshy.ai/.../Animation_Walking_withSkin.fbx?Expires=...",
      "walking_armature_glb_url": "https://assets.meshy.ai/.../Animation_Walking_withSkin_armature.glb?Expires=...",
      "running_glb_url": "https://assets.meshy.ai/.../Animation_Running_withSkin.glb?Expires=...",
      "running_fbx_url": "https://assets.meshy.ai/.../Animation_Running_withSkin.fbx?Expires=...",
      "running_armature_glb_url": "https://assets.meshy.ai/.../Animation_Running_withSkin_armature.glb?Expires=..."
    }
  },
  "preceding_tasks": 0
}
```

---

## Delete a Rigging Task

```bash
curl --request DELETE \
  --url https://api.meshy.ai/openapi/v1/rigging/018b314a-a1b5-716d-c222-2f1776f7f579 \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

Returns `200 OK` on success.

---

## List Rigging Tasks

Returns a paginated list of the caller's rigging tasks, newest first.

```bash
curl "https://api.meshy.ai/openapi/v1/rigging?page_num=1&page_size=20" \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

> **Note:** Tasks created through the API are managed through the API — they do not appear in the web app's My Assets.

---

## Stream a Rigging Task (SSE)

```bash
curl -N https://api.meshy.ai/openapi/v1/rigging/018b314a-a1b5-716d-c222-2f1776f7f579/stream \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

---

## The Rigging Task Object

| Property | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `type` | string | `rig` |
| `status` | string | `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED` |
| `progress` | integer | 0–100 |
| `created_at` | timestamp | ms since epoch |
| `started_at` | timestamp | ms since epoch; 0 if not started |
| `finished_at` | timestamp | ms since epoch; 0 if not finished |
| `expires_at` | timestamp | ms since epoch; when result assets expire |
| `task_error` | object | Error details |
| `consumed_credits` | integer | Credits consumed (0 for `FAILED`) |
| `result` | object | Output asset URLs (if `SUCCEEDED`, else `null`) |
| `result.rigged_character_fbx_url` | string | Rigged character in FBX |
| `result.rigged_character_glb_url` | string | Rigged character in GLB |
| `result.basic_animations` | object | Default walking/running animations |
| `result.basic_animations.walking_glb_url` | string | Walking animation (GLB, with skin) |
| `result.basic_animations.walking_fbx_url` | string | Walking animation (FBX, with skin) |
| `result.basic_animations.walking_armature_glb_url` | string | Walking animation armature (GLB) |
| `result.basic_animations.running_glb_url` | string | Running animation (GLB, with skin) |
| `result.basic_animations.running_fbx_url` | string | Running animation (FBX, with skin) |
| `result.basic_animations.running_armature_glb_url` | string | Running animation armature (GLB) |
| `preceding_tasks` | integer | Count of preceding tasks (meaningful when `PENDING`) |