# pwa Specification

## Purpose

Install the agenda on a phone home screen and open it as a standalone app.

## Requirements

### Requirement: Installable app

The app MUST serve a web app manifest declaring its name, short name, language, theme colour, background colour, `display: standalone` and a `start_url` of `/notas` (the workspace, the app's main screen — not `/`, which only redirects there).

The manifest MUST declare at least a 192x192 and a 512x512 icon of type `image/png`, plus a separate `maskable` icon whose glyph stays inside the safe zone, because a platform that masks an icon to its own shape would otherwise clip the rounded-corner artwork twice.

The app MUST also declare an `apple-touch-icon`, because iOS ignores the manifest icons when adding to the home screen.

#### Scenario: Install prompt is offered

- GIVEN a supported browser on the deployed HTTPS site
- WHEN the manifest, its icons and the service worker are all reachable
- THEN the browser offers to install the app

#### Scenario: Installed app opens on the workspace

- GIVEN the app is installed on a home screen
- WHEN it is opened
- THEN it starts at the workspace in standalone display mode

#### Scenario: Installability assets are public

- GIVEN no session cookie
- WHEN the browser requests the manifest, the service worker script or an icon
- THEN each is served as itself and not redirected to the login page

### Requirement: Service worker

The app MUST register a service worker in production only: in development it would sit between the bundler's hot reload and the browser and serve a stale shell.

The worker MUST NOT cache rendered pages, API responses or attachments. Every screen is session-gated and renders private data, so storing it on the device would leave one person's records readable by the next person who opens the installed app. Only the public, static icons MAY be cached.

Registration MUST be a progressive enhancement: a browser without service worker support, or one that refuses registration, MUST keep working with no user-visible failure.

#### Scenario: Private content is never stored

- GIVEN an installed app used by a signed-in user
- WHEN pages are browsed
- THEN no rendered page or API response is written to the cache

#### Scenario: Icons are available offline

- GIVEN the icons were fetched once
- WHEN the device is offline
- THEN the launcher tile still renders its icon

#### Scenario: No worker in development

- GIVEN the development server
- WHEN a page loads
- THEN no service worker is registered
