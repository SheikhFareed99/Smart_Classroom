# Voice Service

A standalone Node.js microservice that handles all real-time voice and screen sharing functionality for the Smart Classroom platform. It is built on top of [LiveKit](https://livekit.io/) — a self-hostable WebRTC SFU — and exposes an HTTP/REST API consumed exclusively by the frontend through Vite's reverse proxy.

---

## Architecture

```
Frontend (React)
    |
    | HTTP (proxied via Vite → /voice/api/*)
    v
voice_service  (Express + livekit-server-sdk)
    |                         |
    | REST (token, channels)  | Server API (moderation, room management)
    v                         v
LiveKit Cloud SFU  <----  Participants (browser WebRTC)
    |
    | Webhook events
    v
voice_service (webhook handler → MongoDB session updates)
```

The service does not relay media. LiveKit's SFU handles all peer-to-peer track routing. The service is responsible only for token generation, channel management, and server-side moderation.

---

## Features

### Voice Channels

- Teachers can create named voice channels scoped to a course.
- Any number of channels can exist per course simultaneously.
- Channels are persisted in MongoDB with an `isActive` flag. Deleting a channel performs a soft delete — session history is preserved.
- A participant count is tracked in-memory via a socket participant store and returned via the live participants endpoint.

### Audio — Microphone

- On joining a channel, the client automatically requests microphone access and publishes the track.
- If the browser dismisses the permission dialog (common when the prompt is not triggered in a synchronous user-gesture context), the next click of the Mute/Unmute button retries the publish — the button click serves as a fresh user gesture.
- Local mute/unmute is performed client-side by muting the track directly — no server round-trip is required.
- Teacher-initiated mute is performed server-side via `mutePublishedTrack`. This mutes the track without revoking the participant's publish permission, so the student can unmute themselves.
- Deafen (local audio output suppression) is implemented client-side by muting all remote audio elements in the DOM.

### Screen Sharing

- Any participant (teacher or student) can share their screen. One share is active at a time naturally — LiveKit does not enforce a limit, but the UI surfaces shares individually per participant.
- Screen share uses the browser's native `getDisplayMedia` API. The native OS picker is shown to the user.
- Quality is configured for stable, readable output:

  | Parameter | Value | Rationale |
  |---|---|---|
  | Resolution | 1280 x 720 | Achievable target across typical network conditions |
  | Frame rate | 15 fps | Allocates more bits per frame than 30 fps at the same bitrate — critical for text readability |
  | Max bitrate | 2 Mbps | Generous ceiling for 720p/15fps; ensures clear text and slides |
  | Simulcast | Disabled | With simulcast enabled, the SFU selects the layer matching the viewer's rendered element size. If the viewer's video element is smaller than 720p in CSS pixels, the SFU delivers the lowest-quality layer. Disabling simulcast forces a single layer and guarantees consistent quality regardless of element size |
  | `contentHint` | `"detail"` | W3C hint that biases the browser's codec toward sharpness over motion smoothness |

- The sharer sees a "sharing" badge in the participant list. Viewers see a "View Screen" button next to the sharing participant's name. The overlay is opened explicitly on demand — no screen appears automatically.
- The screen share overlay is a full-viewport modal with a dark blurred backdrop. Clicking outside the modal or the close button dismisses it.
- When the sharer stops sharing, the overlay auto-closes on the viewer's side (the remote track is unsubscribed, which removes it from `remoteScreenShares`).

### Moderation (Teacher Only)

| Action | Mechanism | Notes |
|---|---|---|
| Mute participant | `mutePublishedTrack(muted: true)` | Non-destructive — the student's track stays published and they can unmute themselves |
| Unmute participant | `mutePublishedTrack(muted: false)` | Restores audio server-side |
| Mute all students | Iterates all remote participants, excludes the teacher's identity | Calls the mute endpoint per participant |
| Kick participant | `removeParticipant()` | Issues `PARTICIPANT_REMOVED` disconnect reason on the client — the frontend distinguishes this from a room deletion |
| Delete channel | `deleteRoom()` + soft-delete in MongoDB | Issues `ROOM_DELETED` disconnect reason — the frontend removes the channel from the list entirely |

### Token Generation

Access tokens are generated server-side using `livekit-server-sdk`. Each token:

- Has a 1-hour TTL.
- Contains the participant's identity as `{userId}-{timestamp}` to prevent LiveKit from kicking a user who rejoins quickly with the same identity.
- Grants `canPublish`, `canSubscribe`, `canPublishData`.
- Explicitly whitelists `canPublishSources: [MICROPHONE, SCREEN_SHARE, SCREEN_SHARE_AUDIO]`. LiveKit Cloud enforces this whitelist — omitting any source causes a publish rejection even with `canPublish: true`.
- Grants `roomAdmin` to teachers, enabling server-side moderation operations from the client's perspective.

### Audio Feedback (Client-side)

All user actions produce synthesised audio feedback generated via the Web Audio API — no audio files are bundled. Tones are kept low-gain and non-intrusive.

| Action | Sound |
|---|---|
| Join channel | Two rising notes |
| Leave channel | Two falling notes |
| Mute microphone | Short downward frequency glide |
| Unmute microphone | Short upward frequency glide |
| Deafen | Muffled low tone |
| Undeafen | Bright pop |
| Start screen share | Ascending three-note triad |
| Open screen share overlay | Soft double-ding |
| Stop screen share / close overlay | Descending sweep |

### Graceful Shutdown

The service handles `SIGTERM` (Docker/PM2) and `SIGINT` (Ctrl+C) by closing the HTTP server, disconnecting all active Socket.IO clients, and closing the MongoDB connection before exiting.

---

## REST API Reference

All endpoints require a valid session cookie (`requireAuth` middleware).

### Token

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/livekit/token` | `{ roomName, participantName, participantId, role }` | `{ token, identity }` |

### Channels

| Method | Path | Body / Params | Response |
|---|---|---|---|
| POST | `/api/channels` | `{ name, courseId, createdBy, creatorName, role }` | `{ channel }` |
| GET | `/api/channels/:courseId` | — | `{ channels[] }` |
| GET | `/api/channels/:id/participants` | — | `{ participants[], count }` |
| DELETE | `/api/channels/:id` | — | `{ message, channel }` |

### Moderation

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/moderation/mute` | `{ roomName, participantIdentity }` | `{ success, action }` |
| POST | `/api/moderation/unmute` | `{ roomName, participantIdentity }` | `{ success, action }` |
| POST | `/api/moderation/kick` | `{ roomName, participantIdentity }` | `{ success, action }` |
| POST | `/api/moderation/mute-all` | `{ roomName, excludeIdentity }` | `{ success }` |
| POST | `/api/moderation/delete-channel` | `{ channelId }` | `{ success, channelId }` |

### Health

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok", service: "voice_service" }` |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Description |
|---|---|
| `PORT` | Port the service listens on (default: `4001`) |
| `MONGO_URI` | MongoDB connection string (same cluster as the main backend) |
| `SESSION_SECRET` | Must match the main backend's session secret for `requireAuth` to validate cookies |
| `LIVEKIT_URL` | WebSocket URL of your LiveKit server or LiveKit Cloud project (e.g. `wss://your-project.livekit.cloud`) |
| `LIVEKIT_API_KEY` | LiveKit project API key |
| `LIVEKIT_API_SECRET` | LiveKit project API secret |
| `CLIENT_ORIGIN` | Frontend origin used for CORS configuration |
| `STUN_URLS` | STUN server URL for the legacy ICE config endpoint |
| `VOICE_SERVICE_SECRET` | Internal secret used by the webhook handler for request verification |

---

## Running Locally

```bash
cd voice_service
npm install
npm run dev     # ts-node-dev with hot reload
```

The service starts on port `4001` by default. The Vite dev server proxies `/voice/api/*` to `http://localhost:4001/api/*`, so no CORS configuration is required during development.

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server |
| `livekit-server-sdk` | Token generation and server-side room/participant management |
| `socket.io` | Legacy P2P signaling channel (retained for compatibility) |
| `mongoose` | Channel and session persistence |
| `dotenv` | Environment variable loading |
| `cors` | Cross-origin request headers |
