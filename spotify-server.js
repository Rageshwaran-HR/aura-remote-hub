import express from "express";
import cors from "cors";
import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 7000;

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri:
    process.env.SPOTIFY_REDIRECT_URI ||
    "http://localhost:7000/api/spotify/callback",
});

// Spotify access token storage (in production, use a proper database)
let spotifyTokens = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Aura Remote Hub - Spotify API Server 🎧");
});

// ✅ API Root endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Aura Remote Hub - Spotify API",
    version: "1.0.0",
    endpoints: [
      "/api/spotify/auth",
      "/api/spotify/callback",
      "/api/spotify/status",
      "/api/spotify/current",
      "/api/spotify/playback",
      "/api/spotify/skip",
      "/api/spotify/volume",
      "/api/spotify/shuffle",
      "/api/spotify/repeat",
      "/api/spotify/disconnect",
    ],
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// SPOTIFY WEB API INTEGRATION
// ========================================

// Helper function to check if token is expired
const isTokenExpired = () => {
  if (!spotifyTokens.expiresAt) return true;
  return Date.now() >= spotifyTokens.expiresAt;
};

// Helper function to refresh access token
const refreshAccessToken = async () => {
  if (!spotifyTokens.refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    spotifyApi.setRefreshToken(spotifyTokens.refreshToken);
    const data = await spotifyApi.refreshAccessToken();

    spotifyTokens.accessToken = data.body.access_token;
    spotifyTokens.expiresAt = Date.now() + data.body.expires_in * 1000;

    if (data.body.refresh_token) {
      spotifyTokens.refreshToken = data.body.refresh_token;
    }

    spotifyApi.setAccessToken(spotifyTokens.accessToken);
    console.log("🎵 Spotify access token refreshed");

    return true;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    spotifyTokens = { accessToken: null, refreshToken: null, expiresAt: null };
    return false;
  }
};

// Helper function to ensure valid token
const ensureValidToken = async (req, res, next) => {
  if (!spotifyTokens.accessToken) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated with Spotify",
      requireAuth: true,
    });
  }

  if (isTokenExpired()) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return res.status(401).json({
        success: false,
        error: "Token expired and refresh failed",
        requireAuth: true,
      });
    }
  }

  next();
};

// 1. Spotify Authentication - Get authorization URL
app.get("/api/spotify/auth", (req, res) => {
  const scopes = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
  ];

  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");

  res.json({
    success: true,
    authUrl: authorizeURL,
    message: "Visit this URL to authorize Spotify access",
  });
});

// 2. Spotify Callback - Handle authorization callback
app.get("/api/spotify/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error("Spotify auth error:", error);
    return res.redirect(`http://localhost:8080/?spotify_error=${error}`);
  }

  if (!code) {
    return res.redirect("http://localhost:8080/?spotify_error=no_code");
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);

    spotifyTokens.accessToken = data.body.access_token;
    spotifyTokens.refreshToken = data.body.refresh_token;
    spotifyTokens.expiresAt = Date.now() + data.body.expires_in * 1000;

    spotifyApi.setAccessToken(spotifyTokens.accessToken);
    spotifyApi.setRefreshToken(spotifyTokens.refreshToken);

    console.log("🎵 Spotify authentication successful");

    // Redirect to frontend with success
    res.redirect("http://localhost:8080/?spotify_auth=success");
  } catch (error) {
    console.error("Error getting Spotify tokens:", error);
    res.redirect(`http://localhost:8080/?spotify_error=token_error`);
  }
});

// 3. Spotify Connection Status
app.get("/api/spotify/status", (req, res) => {
  const isConnected = !!spotifyTokens.accessToken && !isTokenExpired();

  res.json({
    success: true,
    connected: isConnected,
    hasRefreshToken: !!spotifyTokens.refreshToken,
    tokenExpired: isTokenExpired(),
    expiresAt: spotifyTokens.expiresAt,
  });
});

// 4. Get Current Playing Track
app.get("/api/spotify/current", ensureValidToken, async (req, res) => {
  try {
    const data = await spotifyApi.getMyCurrentPlaybackState();

    if (!data.body || !data.body.item) {
      return res.json({
        success: true,
        isPlaying: false,
        track: null,
        message: "No track currently playing",
      });
    }

    const track = data.body.item;
    const playbackState = {
      isPlaying: data.body.is_playing,
      progress: data.body.progress_ms,
      volume: data.body.device ? data.body.device.volume_percent : null,
      shuffleState: data.body.shuffle_state,
      repeatState: data.body.repeat_state,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => artist.name),
        album: track.album.name,
        duration: track.duration_ms,
        image: track.album.images[0]?.url || null,
        external_urls: track.external_urls,
      },
      device: data.body.device
        ? {
            id: data.body.device.id,
            name: data.body.device.name,
            type: data.body.device.type,
            volume: data.body.device.volume_percent,
          }
        : null,
    };

    res.json({
      success: true,
      ...playbackState,
    });
  } catch (error) {
    console.error("Error getting current track:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get current track",
      details: error.message,
    });
  }
});

// 5. Playback Control (Play/Pause)
app.post("/api/spotify/playback", ensureValidToken, async (req, res) => {
  const { action } = req.body;

  try {
    if (action === "play") {
      await spotifyApi.play();
    } else if (action === "pause") {
      await spotifyApi.pause();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "play" or "pause"',
      });
    }

    res.json({
      success: true,
      action: action,
      message: `Playback ${action}d successfully`,
    });
  } catch (error) {
    console.error(`Error ${action}ing playback:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to ${action} playback`,
      details: error.message,
    });
  }
});

// 6. Skip Track
app.post("/api/spotify/skip", ensureValidToken, async (req, res) => {
  const { direction } = req.body;

  try {
    if (direction === "next") {
      await spotifyApi.skipToNext();
    } else if (direction === "previous") {
      await spotifyApi.skipToPrevious();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction. Use "next" or "previous"',
      });
    }

    res.json({
      success: true,
      direction: direction,
      message: `Skipped to ${direction} track`,
    });
  } catch (error) {
    console.error(`Error skipping ${direction}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to skip ${direction}`,
      details: error.message,
    });
  }
});

// 7. Volume Control
app.post("/api/spotify/volume", ensureValidToken, async (req, res) => {
  const { volume } = req.body;

  if (typeof volume !== "number" || volume < 0 || volume > 100) {
    return res.status(400).json({
      success: false,
      error: "Volume must be a number between 0 and 100",
    });
  }

  try {
    await spotifyApi.setVolume(volume);

    res.json({
      success: true,
      volume: volume,
      message: `Volume set to ${volume}%`,
    });
  } catch (error) {
    console.error("Error setting volume:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set volume",
      details: error.message,
    });
  }
});

// 8. Shuffle Control
app.post("/api/spotify/shuffle", ensureValidToken, async (req, res) => {
  const { enabled } = req.body;

  try {
    await spotifyApi.setShuffle(enabled);

    res.json({
      success: true,
      shuffle: enabled,
      message: `Shuffle ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Error setting shuffle:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set shuffle",
      details: error.message,
    });
  }
});

// 9. Repeat Control
app.post("/api/spotify/repeat", ensureValidToken, async (req, res) => {
  const { mode } = req.body; // 'off', 'track', 'context'

  const validModes = ["off", "track", "context"];
  if (!validModes.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid repeat mode. Use "off", "track", or "context"',
    });
  }

  try {
    await spotifyApi.setRepeat(mode);

    res.json({
      success: true,
      repeat: mode,
      message: `Repeat set to ${mode}`,
    });
  } catch (error) {
    console.error("Error setting repeat:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set repeat",
      details: error.message,
    });
  }
});

// 10. Disconnect Spotify
app.post("/api/spotify/disconnect", (req, res) => {
  spotifyTokens = { accessToken: null, refreshToken: null, expiresAt: null };
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();

  res.json({
    success: true,
    message: "Disconnected from Spotify successfully",
  });
});

// Get Current User Profile
app.get("/api/spotify/user", ensureValidToken, async (req, res) => {
  try {
    const userData = await spotifyApi.getMe();

    res.json({
      success: true,
      user: {
        id: userData.body.id,
        display_name: userData.body.display_name || userData.body.id,
        email: userData.body.email,
        country: userData.body.country,
        followers: userData.body.followers?.total || 0,
        product: userData.body.product, // free, premium
        images: userData.body.images || [],
        external_urls: userData.body.external_urls,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aura Remote Hub - Spotify Server running on port ${PORT}`);
  console.log(`🎧 Spotify Web API integration enabled`);
  console.log(`🔗 Spotify auth URL: http://localhost:${PORT}/api/spotify/auth`);
  console.log(`📱 Frontend URL: http://localhost:8080`);

  // Check if environment variables are set
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log(`⚠️  WARNING: Spotify credentials not found in .env file`);
    console.log(
      `📋 Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file`
    );
    console.log(`📖 See SPOTIFY_SETUP.md for setup instructions`);
  } else {
    console.log(`✅ Spotify credentials loaded from .env file`);
  }
});
