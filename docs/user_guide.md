# User Guide — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | End-User Guide |
| **Version** | 1.0.0 |
| **Date** | 2026 |
| **Status** | Reference (produced per project decision, overriding Documentation Gap Assessment v1.0.0 Gap 9) |
| **Dependencies** | FRD v1.0.0 §2–4 (product vision, features), UI/UX v1.0.0 §9 (empty/error states), GREB v1.0.0 §14 |

> **A note on this guide.** This guide was written from the design specification and may need refinement against the finished UI. Screens, button labels, and exact wording may differ slightly from what is described here. Treat this as a solid reference for "how MeshyForge is meant to work," and expect minor updates as the product evolves.

---

## Table of Contents
1. [Welcome to MeshyForge](#1-welcome-to-meshyforge)
2. [Getting Started](#2-getting-started)
3. [Generating 3D Models](#3-generating-3d-models)
4. [Monitoring Your Tasks](#4-monitoring-your-tasks)
5. [Browsing Your Gallery](#5-browsing-your-gallery)
6. [Organizing Your Assets](#6-organizing-your-assets)
7. [Post-Processing an Existing Asset](#7-post-processing-an-existing-asset)
8. [Exporting Your Work](#8-exporting-your-work)
9. [Settings & Preferences](#9-settings--preferences)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. Welcome to MeshyForge

MeshyForge is a desktop app for anyone who generates 3D models with Meshy AI and is tired of doing it through a browser tab or a pile of one-off scripts. It gives you one place to:

- Turn a text prompt or a photo into a 3D model
- Watch your generations happen in real time
- Keep every model you've ever made in a searchable local library
- Clean up, retexture, rig, and animate models after the fact
- Export finished assets in whatever format your game engine, slicer, or renderer needs

It runs on macOS, Windows, and Linux, and everything you've already downloaded — your gallery, your tags, your notes — works even when you're offline. The only time MeshyForge needs the internet is when it's actually talking to Meshy: generating something new, running a post-processing job, or checking your credit balance.

You'll need a Meshy account with API access to use it (the free web app and the API are separate things — more on that in the next section).

---

## 2. Getting Started

### 2.1 Installing MeshyForge

Download the installer for your operating system and run it like you would any other desktop app — there's no special setup, no command line, and no developer tools required. Once it's installed, launch it from your applications menu (or Start menu, or dock) the same way you'd open any other program.

### 2.2 Launching the App for the First Time

The first time you open MeshyForge, your asset gallery will be empty and you won't be able to generate anything yet — that's expected. Before you can do anything else, MeshyForge needs your Meshy API key.

### 2.3 Entering Your Meshy API Key

Your API key is what lets MeshyForge talk to Meshy on your behalf. You'll find it in your account settings on Meshy's website (look for an "API" or "Developer" section — it's a long string of letters and numbers, not your account password).

To connect it:

1. Open MeshyForge's **Settings**.
2. Paste your API key into the key field.
3. MeshyForge checks the key with Meshy — you'll see a small spinner while it validates.
4. If the key is good, you'll get a quick confirmation message showing how many credits you have available, and you're ready to generate.

If nothing is entered yet, MeshyForge will show a simple reminder screen ("No API key configured. Add your Meshy API key to start generating 3D assets.") with a button that takes you straight to Settings — you can't miss it.

Your key is stored securely on your own computer, in the same protected storage your operating system uses for passwords and other secrets. It is never sent anywhere except to Meshy itself.

MeshyForge does not read API keys from `.env` or other plaintext configuration files. If your key appears in a screenshot, log, repository, issue, or chat, revoke it in Meshy and enter a replacement directly in Settings. Deleting the exposed text does not make the old key safe again.

### 2.4 Understanding Your Credit Balance

Generating models and running post-processing jobs on Meshy costs credits, drawn from your Meshy account — not a separate MeshyForge balance. Your current balance is always visible near the top of the app.

- While it's being checked, you'll briefly see a placeholder dash (`—`) instead of a number.
- MeshyForge refreshes your balance automatically, so it stays current as you generate and process assets.
- Every time you kick off a paid action, MeshyForge tells you up front how many credits it will use, and confirms the deduction once the task is created.
- If you ever run out, MeshyForge will let you know clearly and point you to Meshy's pricing page to top up (see §10 for what that message looks like).

---

## 3. Generating 3D Models

Everything you can generate lives behind one **Generate** area of the app, organized into a few different modes. Each one follows the same basic rhythm: fill in a form, submit, and watch the task run (see §4 for monitoring).

### 3.1 Text to 3D

Describe what you want in plain language, and MeshyForge sends the prompt to Meshy to build a 3D model. This happens in two stages:

1. **Preview** — a quick, untextured version of your model, so you can check the shape and silhouette before spending more credits.
2. **Refine** — once you're happy with the preview, refine it to add full texturing and detail. This produces the finished, textured model.

You can adjust prompt details, style options, and other generation settings right on the form before submitting.

### 3.2 Image to 3D

Have a photo or reference image instead of words? Upload a single image — either by dragging it straight onto the upload area or by picking it from a file dialog — and MeshyForge turns it into a 3D model.

### 3.3 Multi-Image to 3D

For trickier subjects, you can upload between one and four images of the same object from different angles. Meshy uses all of them together to build a more accurate model than a single photo could produce on its own.

### 3.4 Creative Lab

Creative Lab is a set of purpose-built generators for specific physical objects, rather than general shapes. Instead of a blank prompt, each one gives you a form tailored to what you're making:

- **Keychain**
- **Fridge Magnet**
- **Figure**
- **Vinyl Figure**
- **Brick Figure**
- **Lamp**
- **Keycap**

These are great when you know exactly what kind of object you want and would rather fill in a few relevant fields than describe the whole thing from scratch.

### 3.5 2D Image Generation

Not every job needs to end in 3D. MeshyForge also supports generating flat, 2D images:

- **Text to Image** — describe an image and generate it from scratch.
- **Image to Image** — start from an existing image and transform it into something new.

These are handy for concept art, texture references, or source images you'll later turn into a 3D model.

### 3.6 3D Printing Helpers

If you're printing your models rather than (or in addition to) using them digitally, MeshyForge includes a few helpers aimed specifically at that:

- **Multi-color conversion** — prepares a model for multi-color 3D printing.
- **Analyze printability** — checks a model for issues that would cause problems on a printer (thin walls, non-manifold geometry, and similar) before you send it to a slicer.
- **Repair printability** — automatically fixes the issues the analysis step finds.

---

## 4. Monitoring Your Tasks

Every generation or post-processing job you start becomes a **task**, and MeshyForge gives you a live view of everything currently running.

- **Progress bars and status badges** show you exactly where each task is — queued, in progress, or complete — with a percentage where Meshy provides one.
- **Notifications** — MeshyForge sends you a normal desktop notification from your operating system when a task finishes, so you don't have to keep the app in the foreground and watch a progress bar the whole time.
- **Auto-download** — when a task succeeds, MeshyForge automatically pulls the finished asset down and saves it to your local library. You don't need to manually save anything.
- **Retry** — if a task fails, you can retry it directly from the task list instead of rebuilding the request from scratch.
- **Cancel** — tasks that are still running can be cancelled if you change your mind or realize you made a mistake in the settings.
- **Task history** — completed and failed tasks stay visible in a history log, so you can see what you ran and when, even after the fact.

If you don't have anything running, the task area simply says "No active tasks. Tasks you create will appear here." — that's normal, not an error.

---

## 5. Browsing Your Gallery

Every asset MeshyForge has downloaded for you lives in the **Gallery** — your permanent, local, offline-friendly library.

- **Thumbnail grid** — assets appear as cards with a thumbnail image, so you can visually scan your whole collection at a glance. The gallery stays smooth even with a large number of assets.
- **Search** — type part of the original prompt or name to find an asset by what it is, not just when you made it.
- **Tag filtering** — narrow the gallery down to only assets carrying a specific tag (see §6 for tagging).
- **Sort by date** — see your newest work first, or go back and find something older.
- **Favorites** — mark assets you want to keep close at hand so they're easy to find again later.
- **Asset detail panel** — click any card to open a closer look at that asset, including its full metadata and a 3D preview.

### 5.1 3D Preview Controls

Clicking into an asset opens an interactive 3D viewer, not just a static picture:

- **Orbit** — drag to rotate the model and view it from any angle.
- **Zoom** — scroll or pinch to move in and out.
- If a model can't be loaded for some reason, MeshyForge falls back to showing its thumbnail image with a short note ("Unable to load 3D preview. Showing thumbnail instead.") instead of leaving the viewer blank.

### 5.2 Empty Gallery

If you haven't generated anything yet, the gallery says "No assets yet. Generate your first 3D model to get started." with a button that jumps you straight to the Generate area. If you've searched or filtered your way to a dead end instead, you'll see "No assets match your search or filter." with a one-click way to clear your filters and start over.

---

## 6. Organizing Your Assets

As your library grows, MeshyForge gives you a few lightweight tools to keep it organized:

- **Tags** — add or remove tags on any asset to group related work (by project, by style, by client — however you think about your own library). Tags feed directly into the gallery's tag filter.
- **Notes** — write free-form notes on an asset: reminders about a prompt tweak that worked well, context for a client, or anything else you'd want to remember later.
- **Metadata display** — every asset shows the details behind how it was made: the original prompt or source image, the generation settings used, and timestamps.
- **Task chain** — for assets that went through multiple steps (say, generated, then remeshed, then rigged), MeshyForge can show you that chain of steps so you can see the asset's full history at a glance.
- **Favorites and deletion** — mark assets as favorites to keep them easy to find, or delete assets you no longer need. Deleting an asset removes it from the gallery and from your computer's storage, so use it deliberately.

---

## 7. Post-Processing an Existing Asset

You don't have to get everything right on the first generation. Select any existing asset in your gallery and run it through one or more post-processing steps:

- **Remesh** — change the polygon count of a model (useful for lowering detail for real-time use, or raising it for a cleaner render).
- **Retexture** — apply a new texture or style to an existing model without regenerating its shape.
- **Rig** — add a skeleton to a model so it can be posed or animated.
- **Animate** — apply an animation preset to a rigged model (you'll need to rig a model before you can animate it).
- **Convert format** — change a model's file format without altering its geometry.
- **Resize** — adjust a model's real-world dimensions, which matters especially if you're 3D printing.
- **UV unwrap** — regenerate a model's UV layout, useful if you plan to retexture it in another tool.

Each post-processing job is its own task, so it shows up in the same task monitor described in §4, and the result is saved back into your gallery as either an update to the original asset or a new linked asset, depending on the operation.

---

## 8. Exporting Your Work

Once an asset is ready, get it out of MeshyForge and into whatever tool you're using next.

- **Single export** — pick one asset, choose a format, and save it to a folder on your computer.
- **Batch export** — select multiple assets at once and export them all together in one step, rather than one at a time.
- **Format selection** — MeshyForge supports exporting to GLB, FBX, OBJ, STL, USDZ, and 3MF, so you can hand assets off to game engines, 3D printing software, or other 3D tools without a separate conversion step.
- **Reveal in file manager** — jump straight from an exported (or downloaded) asset to its location on disk, in your operating system's normal file browser.
- **Storage usage** — see how much disk space your asset library is currently taking up, so you can decide when it's time to clean house.

---

## 9. Settings & Preferences

The Settings area is where you manage everything about how MeshyForge behaves, separate from any individual asset:

- **API key management** — update or replace your Meshy API key at any time (also reachable directly from any "key invalid" notice — see §10).
- **Preferences** — adjust general app behavior to fit how you like to work.
- **About & API status** — check which version of MeshyForge you're running and confirm Meshy's API is reachable.
- **Prompt presets** — save prompt setups you use often (a particular style, a recurring set of options) and reload them later instead of retyping them each time.

---

## 10. Troubleshooting & FAQ

MeshyForge shows problems as short, plain-language notifications rather than raw error codes. Here's what the common ones mean and what to do about them.

| What you'll see | What it means | What to do |
|---|---|---|
| **"Insufficient credits"** (with a link to Meshy's pricing page) | Your Meshy account doesn't have enough credits left to run the action you just tried. | Follow the link to top up your credits on Meshy, then try again. |
| **"API key invalid or expired"** (with an "Update Key" button) | The key MeshyForge has on file is no longer accepted by Meshy — it may have been revoked, regenerated, or mistyped. | Click "Update Key" to jump to Settings, and paste in a current key from your Meshy account. |
| **"Network error. Check your connection."** (with a Retry button) | MeshyForge couldn't reach Meshy at all — usually a local internet connection issue, not a problem with your account or the app. | Check your connection, then click Retry. Anything already downloaded stays available offline in the meantime. |
| **"Server error. Retrying..."** | Meshy's service hit a temporary problem on its end. | No action needed — MeshyForge retries automatically. If it keeps happening, try again later. |
| **"Rate limit reached. Waiting before retry..."** | You (or the app) sent requests to Meshy faster than it currently allows. | No action needed — MeshyForge automatically waits and retries on its own. |
| **A red message under a form field** | Something in the form isn't valid yet — a required field is empty, or a value is out of range. | Fix the highlighted field; the message clears once it's valid. |
| **"Unable to load 3D preview. Showing thumbnail instead."** | The interactive 3D viewer couldn't load this particular model, but the asset itself is fine. | You can still work with the asset normally (tag it, export it, and so on) using its thumbnail image. |

**A few other common questions:**

- **Do I need to be online to use MeshyForge?** Only for generating new assets, running post-processing, or refreshing your credit balance. Browsing your existing gallery, previewing models, adding tags and notes, and exporting already-downloaded assets all work fully offline.
- **Where are my files stored?** Locally on your own computer, in MeshyForge's local asset storage. You can jump to any asset's exact location using "Reveal in file manager" (§8).
- **What happens if I delete an asset?** It's removed from both the gallery and your computer's storage — this can't be undone from within the app, so make sure it's really the one you meant to remove.
- **Can I use MeshyForge without a Meshy Pro plan?** You need a Meshy account with API access to generate or process anything. Check Meshy's own plan details for what tier that requires.
- **Something looks different from what this guide describes.** Confirm that you are running the current MeshyForge release, then report the documentation mismatch without including credentials or signed asset URLs.

---

*End of User Guide — MeshyForge v1.0.0*
