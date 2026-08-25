# Webhooks

Source: https://docs.meshy.ai/en/api/webhooks

Webhooks allow you to receive real-time updates from Meshy when your API tasks are completed or change status. Once configured, Meshy will POST event payloads in JSON format to the URLs you specify.

## Why Create Webhooks

Using webhooks has several advantages, especially with regards to checking on API task statuses automatically:

- Webhooks require less effort and cost than continuously polling the API to get task status updates.
- Webhooks allow near real-time updates and ultimately scale better than API polling.
- This enables you to better manage your rate limits, especially if you are polling constantly.

## Setup & Configuration

To enable webhooks, navigate to the API settings page when logged in to the Meshy web application. Find the "Webhooks" section below your API Keys and click the "Create Webhook" button. Provide your desired https URL to receive webhooks from and enable the webhook to automatically receive task updates from Meshy.

- You may have a maximum of **5 active webhooks** per Meshy account.
- When a webhook is enabled, **all API task status updates** will be automatically sent to the payload URL.
- For security purposes, we only allow sending webhooks to **https URLs** at this time.

## Webhook Delivery Requirements

For your webhook to function normally and continue receiving events:

- Your server must respond with an HTTP status code below 400 (e.g., `200 OK`, `202 Accepted`).
- Any response with a status code `>= 400` will be treated as a failed delivery.
- Multiple consecutive failures may:
  - Cause progress updates to be delayed or arrive out of order
  - Automatically disable your webhook after repeated attempts

**Tip:** Always return a success response after you validate and store the webhook payload, even if further processing happens asynchronously.

## Forwarding Webhooks for Local Testing

If you would like to test your webhook code locally (typically an http address), you can use a webhook proxy URL to forward webhooks to your computer. The recommended approach uses [smee.io](https://smee.io/).

### 1. Get a webhook proxy URL

1. Navigate to https://smee.io/
2. Click "Start a new channel"
3. Copy the full URL under "Webhook Proxy URL"

### 2. Forward webhooks

Install the smee-client:

```bash
npm install --global smee-client
```

Run the forwarder:

```bash
smee --url WEBHOOK_PROXY_URL --path /webhook --port 3000
```

You should see output like:

```
Forwarding WEBHOOK_PROXY_URL to http://127.0.0.1:3000/webhook
Connected WEBHOOK_PROXY_URL
```

### 3. Create a webhook

Use the webhook proxy URL to create a new webhook in the Meshy API settings page.

## Sample Response

When a task status changes, Meshy will POST a webhook payload to your configured URL. The payload contains the task object in JSON format. For complete descriptions of all task object properties and example payloads, see:

- [Text to 3D Task Object](./10-text-to-3d.md)
- [Image to 3D Task Object](./11-image-to-3d.md)
- [Multi-Image to 3D Task Object](./12-multi-image-to-3d.md)
- [Remesh Task Object](./13-remesh.md)
- [Retexture Task Object](./16-retexture.md)
- [Rigging Task Object](./17-rigging.md)
- [Animation Task Object](./18-animation.md)