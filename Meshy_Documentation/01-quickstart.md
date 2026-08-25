# Quickstart

Source: https://docs.meshy.ai/en/api/quick-start

Four steps to your first 3D model, using the Meshy REST API.

> **AI coding assistant?** See the AI Integration page — install the Meshy MCP server for tool-calling access from Claude Code, Cursor, Windsurf, and other MCP-compatible tools, or point a plain chat agent at `llms.txt`.

## 1. Get your API key

Create an API key from your account settings — you won't be able to view it again after this screen, so store it somewhere safe. Every request authenticates with a `Bearer` token in the `Authorization` header.

**Security tip:** Avoid pasting your key directly into scripts — store it as an environment variable instead:

```bash
export MESHY_API_KEY="msy_..."
```

Run this in your terminal (Terminal on macOS, Command Prompt or PowerShell on Windows) — not in a browser.

## 2. Make your first Image-to-3D request

Export your key, then create your first task with Image to 3D. Working from a text prompt or multiple photos instead? See Text to 3D or Multi-Image to 3D.

```bash
curl https://api.meshy.ai/openapi/v1/image-to-3d \
  -X POST \
  -H "Authorization: Bearer ${MESHY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://docs.meshy.ai/images/api/quick-start/source-photo.webp"
  }'
```

```json
{
  "result": "018a210d-8ba4-705c-b111-1f1776f7f578"
}
```

## 3. Check task status

Requests return a task ID immediately. Poll the same endpoint until `status` is `SUCCEEDED` — replace `<task_id>` below with the ID returned in step 2.

```bash
curl https://api.meshy.ai/openapi/v1/image-to-3d/<task_id> \
  -H "Authorization: Bearer ${MESHY_API_KEY}"
```

**Response — SUCCEEDED**

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "status": "SUCCEEDED",
  "progress": 100,
  "model_urls": {
    "glb": "https://assets.meshy.ai/***/tasks/018a210d-8ba4-705c-b111-1f1776f7f578/output/model.glb?Expires=***",
    "fbx": "https://assets.meshy.ai/***/tasks/018a210d-8ba4-705c-b111-1f1776f7f578/output/model.fbx?Expires=***"
  },
  "thumbnail_url": "https://assets.meshy.ai/***/tasks/018a210d-8ba4-705c-b111-1f1776f7f578/output/preview.png?Expires=***",
  "task_error": {
    "message": ""
  }
}
```

Polling not your style? Use SSE streaming or a webhook to get notified the moment a task finishes.

## 4. Download your model

Grab the model from `model_urls` in the response above. Each format (GLB, FBX, OBJ, USDZ, STL) is a signed, time-limited URL — or skip the command line and paste the URL directly into your browser's address bar to download it.

```bash
curl -L "<model_urls.glb from the response above>" -o model.glb
```

Files are retained for 3 days on non-Enterprise plans — see Asset Retention.

### Full script (JavaScript)

```javascript
import axios from 'axios';
import fs from 'fs';

const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY}` };
const imageUrl = 'https://docs.meshy.ai/images/api/quick-start/source-photo.webp';

// 1. Create the task
const { data: created } = await axios.post(
  'https://api.meshy.ai/openapi/v1/image-to-3d',
  { image_url: imageUrl },
  { headers },
);
const taskId = created.result;

// 2. Poll until it finishes
let task;
while (true) {
  const { data } = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, { headers });
  task = data;
  if (task.status === 'SUCCEEDED' || task.status === 'FAILED') break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// 3. Download the result (only if the task succeeded)
if (task.status !== 'SUCCEEDED') {
  throw new Error(`Task ${task.status}: ${task.task_error?.message || 'unknown error'}`);
}
const { data: model } = await axios.get(task.model_urls.glb, { responseType: 'arraybuffer' });
fs.writeFileSync('model.glb', model);
console.log('Saved model.glb');
```

## Explore common workflows

- **Game-ready character:** Rig a humanoid mesh with a skeleton so it's ready to animate in Unity or Unreal → [Rigging API](./17-rigging.md)
- **Lowpoly asset:** Set `model_type` to `lowpoly` on Image to 3D for a clean, game-ready mesh → [Image to 3D API](./11-image-to-3d.md)
- **3D print model:** Convert a finished model into a multi-color 3MF file, ready to slice and print → Multi-Color Print API

## Next steps

- Prefer a UI? Try the API Playground — configure a request, run it, and copy the generated code.
- Browse the full API reference for every endpoint.
- Check Pricing, Rate Limits, and Errors before you go to production.
- Watch the Changelog for updates and bug fixes.
- Have feedback or facing issues? Join our Discord community.