# Spotify API Setup Guide for Aura Remote Hub

## 🎧 Pure Spotify Integration

This is a streamlined Spotify Web API server focused solely on music control and playback.

## Prerequisites

1. Create a Spotify Developer Account at https://developer.spotify.com/
2. Create a new app in your Spotify Developer Dashboard
3. Add the following redirect URI to your app settings:
   - `http://localhost:5000/api/spotify/callback`

## Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback
```

## How to Get Your Spotify Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - App Name: "Aura Remote Hub"
   - App Description: "Spotify Remote Control"
   - Redirect URI: `http://localhost:5000/api/spotify/callback`
   - APIs Used: Web API
5. Save the app
6. Copy the Client ID and Client Secret to your `.env` file

## Running the Server

### Spotify-Only Server (Recommended)

```bash
node spotify-server.js
```

## Required Scopes

The app requests the following Spotify scopes:

- `user-read-playback-state`: Read current playback state
- `user-modify-playback-state`: Control playback (play/pause/skip)
- `user-read-currently-playing`: Read currently playing track
- `streaming`: Stream music (Web Playback SDK)
- `user-library-read`: Access user's library
- `playlist-read-private`: Access private playlists
- `playlist-read-collaborative`: Access collaborative playlists

## API Endpoints

### Authentication

- `GET /api/spotify/auth` - Get authorization URL
- `GET /api/spotify/callback` - OAuth callback
- `GET /api/spotify/status` - Connection status
- `POST /api/spotify/disconnect` - Disconnect

### Playback Control

- `GET /api/spotify/current` - Get current playing track
- `POST /api/spotify/playback` - Play/pause (body: `{action: "play"|"pause"}`)
- `POST /api/spotify/skip` - Skip track (body: `{direction: "next"|"previous"}`)
- `POST /api/spotify/volume` - Set volume (body: `{volume: 0-100}`)
- `POST /api/spotify/shuffle` - Toggle shuffle (body: `{enabled: boolean}`)
- `POST /api/spotify/repeat` - Set repeat mode (body: `{mode: "off"|"track"|"context"}`)

## Setup Instructions

1. Complete the environment variables setup above
2. Start the Spotify server: `node spotify-server.js`
3. Frontend should be running on `http://localhost:8080`
4. In the Spotify Control component, click "Connect to Spotify"
5. You'll be redirected to Spotify for authorization
6. After approval, you'll be redirected back with an active connection

## Requirements

- **Spotify Premium** account (required for playback control)
- **Active Spotify session** on any device
- **Modern browser** with popup support

## Features

- ✅ **Real-time now playing** with album art
- ✅ **Play/Pause/Skip** controls
- ✅ **Volume control**
- ✅ **Shuffle/Repeat** toggle
- ✅ **Progress tracking** with live updates
- ✅ **Device switching** support
- ✅ **Connection status** monitoring
- ✅ **Token refresh** handling
