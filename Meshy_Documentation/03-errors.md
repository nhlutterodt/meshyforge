# Errors

Source: https://docs.meshy.ai/en/api/errors

In this guide, we will talk about what happens when something goes wrong while you work with the Meshy API.

## Request Errors

These errors are returned immediately when your API request is rejected. Check the HTTP status code and `message` field to understand what went wrong.

### Response Format

The error response contains a single `message` field describing what went wrong:

- **`message`** (string): A short description of the error.

### Status Codes

#### 2xx — Successful response

- **`200 - OK`**: By default if everything worked as expected a 200 status code will be returned.
- **`202 - Accepted`**: Your request has been accepted for processing, but the processing has not been completed. For example, a request to create a new task will return a 202 status code.

#### 4xx — Client error

- **`400 - Bad Request`**: The request was unacceptable, often due to missing a mandatory parameter or one of the parameters was malformed.
- **`401 - Unauthorized`**: No valid API key provided or the API key provided is not authorized to access the Meshy API endpoint.
- **`402 - Payment Required`**: Insufficient funds in the account associated with the provided API key.
- **`403 - Forbidden`**: Access to the requested resource is forbidden. This might happen if you try to access the Meshy API directly from client-side JavaScript code, as Cross-Origin Resource Sharing (CORS) requests from browsers are not permitted. Consider using a server-side proxy for such requests.
- **`404 - Not Found`**: The requested resource doesn't exist. For example, when you try to retrieve a task by its ID but provided an invalid ID.
- **`429 - Too Many Requests`**: Too many requests hit the Meshy API too quickly. Please refer to the Rate Limits guide for details.

#### 5xx — Server error

A 5xx status code indicates a server error. If you see one, please check our [status page](https://status.meshy.ai/) for more information and contact us via [Discord](https://discord.com/invite/KgD5yVM9Y4) for help.

### Example: 400 Bad Request

```json
{
  "message": "Invalid model file extension: .3dm"
}
```

## Task Errors

These errors occur after a task has been created and is processing. Check the `task_error` object on the task response for error details.

The `task_error` object contains the following fields:

- **`type`** (string): The error category. Always present on failed tasks. See Error Types below.
- **`message`** (string): A human-readable description of the error. Always present on failed tasks.
- **`code`** (string, optional): A specific error code identifying the problem. Present when additional details are available. See Error Codes below.
- **`doc_url`** (string, optional): A link to detailed documentation for this error code, including resolution guidance. Present when `code` is present.

### Error with details

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "status": "FAILED",
  "task_error": {
    "type": "invalid_input",
    "code": "image_too_complex",
    "message": "The uploaded image is too complex for 3D generation.",
    "doc_url": "https://docs.meshy.ai/en/api/errors#image-too-complex"
  }
}
```

### Error without details

```json
{
  "id": "018a210d-8ba4-705c-b111-1f1776f7f578",
  "status": "FAILED",
  "task_error": {
    "type": "server_error",
    "message": "An internal error occurred. Please retry."
  }
}
```

## Error Types

The `type` field tells you the broad category of the failure. Use it to decide your retry strategy.

- **`invalid_input`**: Something is wrong with the input you provided. Check the `code` and `message` fields for specifics, fix the issue, and retry.
- **`timeout`**: Processing exceeded the time limit. This is often transient. Retry the request, and if it keeps failing, try simplifying your input.
- **`service_unavailable`**: The service is temporarily unavailable. Wait a moment and retry.
- **`server_error`**: An internal error occurred during processing. Retry the request. If the issue persists, contact support with your task ID.

## Error Codes

When the `code` field is present, it identifies a specific, actionable problem.

### `image_too_complex`

This error occurs when the input image or prompt describes a subject that is too geometrically complex for the 3D generation model to process.

Common examples include:
- Dense piles of small objects (e.g., a crate full of fruit, a stack of books)
- Intricate repeating patterns (e.g., lattice structures, scaffolding, wire meshes)
- Complex building structures (e.g., multi-story buildings with many windows and balconies)
- Multiple distinct objects in one image instead of a single subject

**Resolution:**
1. Use a single object per image. The model works best with one clear subject.
2. Simplify your subject. Reduce the level of detail.
3. Avoid scene-level prompts (entire buildings, city blocks, interiors, landscapes).
4. Avoid dense repeating structures (scaffolding, wire meshes, lattice patterns, piles of small items).

### `model_missing_uv`

This error occurs when you upload a model for texturing with `enable_original_uv` set to `true`, but the model has no UV coordinates.

**Resolution:**
- If you need to preserve your model's original UV layout: verify UVs exist in your 3D software's UV editor before uploading. STL files cannot store UV data, so use GLB, FBX, or OBJ instead.
- If you don't need specific UV control: omit `enable_original_uv` or set it to `false`. The system will automatically generate a UV layout for your model.

### `model_insufficient_uv`

This error occurs when a model has UV coordinates, but the UV coverage is too small for quality texturing. This commonly happens with models exported from 3D tools that generate placeholder or collapsed UVs without a proper unwrap.

**Resolution:**
- If you need to preserve your original UV layout: re-unwrap the model's UVs in your 3D software.
- If you don't need specific UV control: omit `enable_original_uv` or set it to `false`.

### `invalid_input`

Fallback error code when the input fails validation but no more specific code applies. Common causes: empty or corrupted model files, unsupported file format variations (e.g., ASCII FBX files, meshopt-compressed GLB), no valid 3D objects found, content that does not pass safety filters.

### `moderation_blocked`

This error occurs when your prompt or reference images are rejected by AI safety filters.

**Resolution:** Rephrase your text prompt to remove suggestive or sensitive descriptions. Adjust reference images if they depict content that may trigger safety filters.

### `timeout`

Processing time exceeded the allowed limit. This can happen due to high system load or because the input is too complex.

**Resolution:** Retry the request. If retries keep failing, simplify your input.

### `format_conversion_failed`

The generated 3D model could not be converted to your requested output format.

**Resolution:** Retry the request. Try a different output format if a specific format keeps failing.

## Best Practices

1. **Implement retry logic.** For `timeout` and `service_unavailable` errors, implement exponential backoff retry logic.
2. **Log task IDs.** Always log the task ID for debugging purposes. Include it when contacting support.
3. **Validate inputs.** Ensure your input images and models meet the format requirements before submission.