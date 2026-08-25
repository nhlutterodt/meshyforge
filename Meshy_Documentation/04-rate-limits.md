# Rate Limits

Source: https://docs.meshy.ai/en/api/rate-limits

Rate limits are restrictions that our API imposes on the number of times a user or client can access our services within a specified period of time.

## Why Limits

- **Safety:** Rate limits protect the service from potential misuse and keeps everything running smoothly.
- **Fairness:** Ensures all users have equal access to the API.
- **Performance:** Manages the overall flow of requests to maintain fast response times and stable service.

## How Limits Work

Rate limits are measured in 2 ways:

- **Requests per Second:** The number of network requests you can make per second.
- **Queue Tasks:** The number of concurrent generation tasks you can run in queue at any given time.

Queue tasks include Text to 3D, Image to 3D, Multi-Image to 3D, Text to Texture, Remesh, Retexture, Rigging, and Animation endpoints. Other endpoints like Upload and Balance are not included in this limit.

The limits are applied on a per-account basis. This means that the limits are shared across all of your API keys.

Besides rate limits, task processing priority will also affect the speed of your tasks.

### Rate Limits by Tier

| Tier | Requests per Second | Concurrent Queue Tasks | Task Priority |
|---|---|---|---|
| Pro | 20 | 10 | Default |
| Premium | 20 | 30 | Higher than Pro |
| Ultra | 20 | 100 | Highest |
| Studio | 20 | 20 | Higher than Pro |
| Enterprise | 100 | Default to 50, can be customized | Highest |

## Hitting the Limit

If you exceed these limits, you'll receive a `429 Too Many Requests` response. There are two types of hits:

- **Request Hit:** Too many requests per second. Response message: `RateLimitExceeded`.
- **Queue Hit:** Too many concurrent generation tasks running. Response message: `NoMoreConcurrentTasks`.