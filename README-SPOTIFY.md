# 🎧 Aura Remote Hub - Spotify Edition

A clean, focused Spotify Web API integration for controlling your music playback.

## ✨ Features

- 🎵 **Real-time Now Playing** - See current track with album artwork
- ⏯️ **Playback Control** - Play, pause, skip tracks
- 🔊 **Volume Control** - Adjust Spotify volume remotely
- 🔀 **Shuffle & Repeat** - Toggle playback modes
- 📱 **Device Support** - Works with any Spotify-connected device
- 🔄 **Live Updates** - Auto-refreshes track info every 3 seconds
- 🔐 **Secure OAuth** - Proper Spotify authentication flow

## 🚀 Quick Start

### 1. Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app with redirect URI: `http://localhost:5000/api/spotify/callback`
3. Copy your Client ID and Client Secret

### 2. Environment Setup

Create `.env` file:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 3. Run the Application

```bash
# Start Spotify API server
npm run spotify

# Start frontend (in another terminal)
npm run dev
```

### 4. Connect & Enjoy!

1. Open http://localhost:8080
2. Click "Connect to Spotify"
3. Start playing music on any device
4. Control it from your browser! 🎉

## 📋 Requirements

- **Spotify Premium** account (required for playback control)
- **Node.js** v18+
- **Modern browser** with popup support

## 🛠️ Available Scripts

- `npm run spotify` - Start Spotify-only server (recommended)
- `npm run server:full` - Start full featured server
- `npm run dev` - Start frontend development server
- `npm run build` - Build for production

## 📚 API Endpoints

All endpoints are prefixed with `/api/spotify/`:

### Authentication

- `GET /auth` - Get authorization URL
- `GET /callback` - OAuth callback handler
- `GET /status` - Check connection status
- `POST /disconnect` - Disconnect from Spotify

### Playback Control

- `GET /current` - Get currently playing track
- `POST /playback` - Play/pause music
- `POST /skip` - Skip to next/previous track
- `POST /volume` - Set volume (0-100)
- `POST /shuffle` - Toggle shuffle mode
- `POST /repeat` - Set repeat mode (off/track/context)

## 🎯 Architecture

```
Frontend (React + Vite)     Backend (Express + Spotify Web API)
├── SpotifyControl.tsx  ←→  ├── spotify-server.js
├── Real-time updates       ├── OAuth 2.0 flow
├── Modern UI               ├── Token management
└── Error handling          └── API endpoints
```

## 🔧 Troubleshooting

**"Not authenticated" errors?**

- Check your `.env` credentials
- Make sure redirect URI matches exactly
- Reconnect via "Connect to Spotify" button

**No music showing?**

- Start playing music on any Spotify device first
- Requires Spotify Premium for full control
- Check browser console for errors

**Server won't start?**

- Ensure Node.js v18+ is installed
- Run `npm install` to install dependencies
- Check that port 5000 is available

## 📄 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for music lovers who want simple, reliable Spotify control.
