# Meshy API Documentation

Welcome to the Meshy API documentation, fetched from [docs.meshy.ai](https://docs.meshy.ai). This folder contains comprehensive reference for the Meshy REST API and related guides.

## What is Meshy?

Meshy is an AI-powered 3D modeling platform that transforms text descriptions, 2D images, and conversational prompts into production-ready 3D assets. The Meshy API provides REST endpoints for Text to 3D, Image to 3D, Multi-Image to 3D, texturing, remeshing, rigging, animation, and more.

- **Base URL:** `https://api.meshy.ai`
- **Authentication:** Bearer token via `Authorization: Bearer ${MESHY_API_KEY}`
- **Format:** RESTful; JSON request bodies and responses; standard HTTP status codes

## Documentation Index

| Document | Description |
|---|---|
| [Quickstart](./01-quickstart.md) | Get your API key and create your first 3D model |
| [Authentication](./02-authentication.md) | API keys and security |
| [Errors](./03-errors.md) | Request and task error reference |
| [Rate Limits](./04-rate-limits.md) | Rate limits and queue tasks by tier |
| [Webhooks](./05-webhooks.md) | Receive real-time task status updates |
| [Text to 3D API](./10-text-to-3d.md) | Two-step text-to-mesh generation (preview + refine) |
| [Image to 3D API](./11-image-to-3d.md) | Generate 3D models from a single image |
| [Multi-Image to 3D API](./12-multi-image-to-3d.md) | Generate 3D models from 1–4 images |
| [Remesh API](./13-remesh.md) | Remesh and export existing 3D models |
| [Convert API](./14-convert.md) | Convert 3D models to other formats |
| [Resize API](./15-resize.md) | Resize 3D models to real-world dimensions |
| [Retexture API](./16-retexture.md) | Retexture 3D models from text or images |
| [Rigging API](./17-rigging.md) | Add a skeleton to humanoid models |
| [Animation API](./18-animation.md) | Apply animations to rigged characters |
| [Changelog](./20-changelog.md) | API updates and history |

## Generation Models

| Model | Year | Best For | Speed | Quality |
|---|---|---|---|---|
| Smart Topology | 2026 | Game dev & real-time rendering | ~10 sec | ★★★★★ |
| Meshy 7 | 2026 | Higher-fidelity geometry, ultra mode | varies | ★★★★★ |
| Meshy 6 | 2025 | Final assets, production quality | ~2 min | ★★★★★ |
| Meshy 5 | 2024 | Fast iteration, concept exploration | ~45 sec | ★★★★☆ |

## Supported Export Formats

| Format | Use Case | Textures |
|---|---|---|
| GLB | Web, AR, universal exchange | ✅ Embedded |
| FBX | Unity, Unreal, DCC tools | ✅ Separate files |
| OBJ | Legacy workflows, DCC tools | ✅ MTL + textures |
| STL | 3D printing | ❌ Geometry only |
| USDZ | Apple AR Quick Look | ✅ Embedded |
| 3MF | 3D printing (color) | ✅ Embedded |

## Task Status Values

Tasks progress through: `PENDING` → `IN_PROGRESS` → `SUCCEEDED` (or `FAILED` / `CANCELED`).

## Getting Help

- Help Center: https://help.meshy.ai/en/
- API Settings: https://www.meshy.ai/settings/api
- Community: https://discord.com/invite/KgD5yVM9Y4
- Contact: support@meshy.ai

## Source

Documentation fetched from https://docs.meshy.ai — © 2026 Meshy LLC. All rights reserved.