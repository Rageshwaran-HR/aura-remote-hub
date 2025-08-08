import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { promisify } from "util";
import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";
import axios from "axios";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5000;
const execAsync = promisify(exec);

// Pi Configuration
const PI_CONFIG = {
  host: "192.168.234.180",
  port: 5000,
  endpoints: {
    spotifyMirror: "/api/pi/spotify-mirror",
    spotifyCredentials: "/api/pi/spotify-credentials",
  },
  timeout: 5000,
};
const PI_AUTH_TOKEN = process.env.PI_AUTH_TOKEN || "my-super-secret-pi-token";

// Helper function to send data to Pi
async function sendToPi(endpoint, data) {
  const url = `http://${PI_CONFIG.host}:${PI_CONFIG.port}${endpoint}`;
  try {
    console.log(`📡 Sending to Pi: ${url}`, data);

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PI_AUTH_TOKEN}`,
      },
      timeout: PI_CONFIG.timeout,
    });

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("❌ Failed to send to Pi:", error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 500,
      data: error.response?.data,
    };
  }
}

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri:
    process.env.SPOTIFY_REDIRECT_URI ||
    "https://myspotifytest.loca.lt/api/spotify/callback",
});

// Spotify access token storage (in production, use a proper database)
let spotifyTokens = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

app.use(cors());
app.use(express.json());

// Global variables for system info caching
let cachedSystemInfo = null;
let piConnected = false; // Will be determined by actual system checks
let lastSystemInfoUpdate = 0;

// ✅ Health check
app.get("/", (req, res) => {
  res.send("SmartMonitor backend is running 🎯");
});

// ✅ API Root endpoint (for endpoint discovery)
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "SmartMonitor API",
    version: "1.0.0",
    endpoints: [
      "/api/status",
      "/api/pi/status",
      "/api/system/info",
      "/api/bluetooth",
      "/api/bluetooth/status",
      "/bluetooth/connected",
      "/bluetooth/scan",
      "/bluetooth/connect",
      "/bluetooth/disconnect",
      "/api/spotify/auth",
      "/api/spotify/callback",
      "/api/spotify/status",
      "/api/spotify/current",
      "/api/spotify/playback",
      "/api/spotify/skip",
      "/api/spotify/volume",
      "/api/spotify/shuffle",
      "/api/spotify/repeat",
      "/api/spotify/user",
      "/api/pi/spotify-credentials",
      "/api/pi/spotify-credentials/status",
      "/api/pi/spotify-mirror",
      "/api/pi/spotify-mirror-control",
      "/api/wallpapers",
      "/api/wallpapers/set",
      "/api/wallpapers/status",
    ],
    timestamp: new Date().toISOString(),
  });
});

// ✅ Alias endpoints for frontend compatibility
app.get("/api/system", (req, res) => {
  // Redirect to the actual system info endpoint
  res.redirect(308, "/api/system/info");
});

app.get("/api/controls", (req, res) => {
  res.json({
    success: true,
    message: "Controls available via main API endpoints",
    availableControls: {
      bluetooth: "/api/bluetooth",
      system: "/api/system/info",
      status: "/api/status",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/temperature", (req, res) => {
  res.json({
    success: true,
    message: "Temperature data available via system info",
    endpoint: "/api/system/info",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/cpu", (req, res) => {
  res.json({
    success: true,
    message: "CPU data available via system info",
    endpoint: "/api/system/info",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/memory", (req, res) => {
  res.json({
    success: true,
    message: "Memory data available via system info",
    endpoint: "/api/system/info",
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (req, res) => {
  // Redirect to the actual status endpoint
  res.redirect(308, "/api/status");
});

app.get("/system", (req, res) => {
  // Redirect to the actual system info endpoint
  res.redirect(308, "/api/system/info");
});

app.get("/info", (req, res) => {
  // Redirect to the actual system info endpoint
  res.redirect(308, "/api/system/info");
});

app.get("/controls", (req, res) => {
  // Redirect to the controls info endpoint
  res.redirect(308, "/api/controls");
});

app.get("/bluetooth", (req, res) => {
  // Redirect to the bluetooth status endpoint
  res.redirect(308, "/api/bluetooth/status");
});

app.get("/bluetooth/status", (req, res) => {
  // Redirect to the actual bluetooth status endpoint
  res.redirect(308, "/api/bluetooth/status");
});

app.get("/temperature", (req, res) => {
  // Redirect to the temperature info endpoint
  res.redirect(308, "/api/temperature");
});

app.get("/health", (req, res) => {
  // Redirect to the main status endpoint
  res.redirect(308, "/api/status");
});

// ✅ NEW: API endpoint for the frontend's piClient
app.get("/api/status", async (req, res) => {
  try {
    // Get current Bluetooth status including connected devices
    const bluetoothStatus = await getBluetoothStatus();

    res.json({
      success: true,
      status: "online",
      name: "Smart Monitor Pi",
      timestamp: new Date().toISOString(),
      services: ["Bluetooth Audio", "System Control", "HTTP API"],
      bluetooth: {
        serviceActive: bluetoothStatus.serviceActive,
        connectedDevices: bluetoothStatus.connectedDevices,
        currentAudioSink: bluetoothStatus.currentAudioSink,
        hasConnectedAudioDevice: bluetoothStatus.connectedDevices.length > 0,
      },
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.json({
      success: true,
      status: "online",
      name: "Smart Monitor Pi",
      timestamp: new Date().toISOString(),
      services: ["Bluetooth Audio", "System Control", "HTTP API"],
      bluetooth: {
        serviceActive: false,
        connectedDevices: [],
        currentAudioSink: "unknown",
        hasConnectedAudioDevice: false,
        error: error.message,
      },
    });
  }
});

// ✅ NEW: Pi connection status endpoint
app.get("/api/pi/status", async (req, res) => {
  try {
    // Update Pi connection status based on actual system check
    piConnected = await checkPiConnection();

    res.json({
      success: true,
      connected: piConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    piConnected = false;
    res.json({
      success: false,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ✅ NEW: System info endpoint (fetches fresh data on each request - no Pi connection check)
app.get("/api/system/info", async (req, res) => {
  try {
    console.log("📊 Frontend requested system info - fetching fresh data...");

    // Always fetch system information when requested (no Pi connection check)
    const systemInfo = await getSystemInfo();

    // Update cache for future reference
    cachedSystemInfo = systemInfo;
    lastSystemInfoUpdate = Date.now();

    console.log("✅ System info successfully sent to frontend");
    res.json({
      success: true,
      ...systemInfo,
      lastUpdated: new Date(lastSystemInfoUpdate).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching system info:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ✅ NEW: Main Bluetooth API endpoint (matches frontend expectations)
app.post("/api/bluetooth", async (req, res) => {
  try {
    const { command, params } = req.body;
    console.log("🎵 Bluetooth command received:", command, params);

    switch (command) {
      case "bluetooth_scan":
        const scanResult = await scanBluetoothDevices();
        res.json({
          success: true,
          message: "Bluetooth scan completed",
          data: scanResult,
        });
        break;

      case "bluetooth_audio_connect":
        // Handle both MAC address and encoded device ID
        let deviceId = params.deviceId;

        // If deviceId looks like base64, try to decode it
        if (deviceId && deviceId.includes("=") && !deviceId.includes(":")) {
          console.log(
            `⚠️ Received encoded device ID: ${deviceId}, this might not be a MAC address`
          );
          // For now, we'll return an error and ask the frontend to use Pi scanning
          res.status(400).json({
            success: false,
            error:
              "Invalid device ID format. Please use the Pi Bluetooth scanner to get proper MAC addresses.",
            needsPiScan: true,
          });
          return;
        }

        const connectResult = await connectBluetoothAudio(
          deviceId,
          params.deviceName
        );
        res.json({
          success: true,
          message: `Connected to ${params.deviceName}`,
          data: connectResult,
        });
        break;

      case "bluetooth_audio_disconnect":
        const disconnectResult = await disconnectBluetoothAudio();
        res.json({
          success: true,
          message: "Bluetooth audio disconnected",
          data: disconnectResult,
        });
        break;

      default:
        res.status(400).json({
          success: false,
          error: "Unknown Bluetooth command",
        });
    }
  } catch (error) {
    console.error("Bluetooth command error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Bluetooth operation failed",
    });
  }
});

// ✅ NEW: Get Bluetooth status
app.get("/api/bluetooth/status", async (req, res) => {
  try {
    const status = await getBluetoothStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Bluetooth status error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get Bluetooth status",
    });
  }
});

// ✅ NEW: Get currently connected devices for frontend
app.get("/bluetooth/connected", async (req, res) => {
  try {
    console.log("📱 Checking for connected Bluetooth devices...");

    const { stdout: allDevices } = await execAsync("bluetoothctl devices");
    const deviceLines = allDevices.trim().split("\n").filter(Boolean);

    const connectedDevices = [];

    for (const line of deviceLines) {
      const parts = line.split(" ");
      const deviceId = parts[1];
      const deviceName = parts.slice(2).join(" ");

      if (deviceId) {
        try {
          const { stdout: deviceInfo } = await execAsync(
            `bluetoothctl info ${deviceId}`
          );
          if (deviceInfo.includes("Connected: yes")) {
            // Check if it's an audio device
            const isAudioDevice =
              deviceInfo.includes("Audio Sink") ||
              deviceInfo.includes("A2DP") ||
              deviceInfo.includes("audio");

            connectedDevices.push({
              id: deviceId,
              name: deviceName || "Unknown Device",
              mac: deviceId,
              connected: true,
              paired: true,
              isAudioDevice: isAudioDevice,
            });
          }
        } catch (infoErr) {
          // Skip if can't get device info
        }
      }
    }

    // Get current audio sink info
    let currentAudioSink = "unknown";
    let isBluetoothAudio = false;
    try {
      const { stdout: sinkInfo } = await execAsync(
        'pactl info | grep "Default Sink"'
      );
      currentAudioSink = sinkInfo.split(":")[1].trim();
      isBluetoothAudio = currentAudioSink.includes("bluez_sink");
    } catch {
      // Sink info unavailable
    }

    res.json({
      success: true,
      connectedDevices,
      currentAudioSink,
      isBluetoothAudio,
      hasConnectedAudioDevice: connectedDevices.some(
        (device) => device.isAudioDevice
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error getting connected devices:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get connected devices",
      connectedDevices: [],
      currentAudioSink: "unknown",
      isBluetoothAudio: false,
      hasConnectedAudioDevice: false,
    });
  }
});

// ✅ Enhanced connect speaker (improved version of your existing endpoint)
app.post("/connect-speaker", async (req, res) => {
  const { mac, name } = req.body;

  if (!mac) {
    return res.status(400).json({ error: "MAC address is required" });
  }

  try {
    const result = await connectBluetoothAudio(mac, name || "Unknown Device");
    res.json({
      status: "success",
      message: `Connected to ${name || mac}`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Connection error:", error);
    res.status(500).json({
      error: "Bluetooth connection failed",
      details: error.message,
    });
  }
});

// ✅ NEW: Disconnect specific Bluetooth device
app.post("/bluetooth/disconnect", async (req, res) => {
  const { deviceId } = req.body;

  try {
    console.log(`🔌 Disconnecting Bluetooth device ${deviceId || "all"}...`);

    if (deviceId) {
      // Disconnect specific device
      const result = await disconnectSpecificBluetoothDevice(deviceId);
      res.json({
        success: true,
        message: "Device disconnected",
        data: result,
      });
    } else {
      // Disconnect all devices (existing functionality)
      const result = await disconnectBluetoothAudio();
      res.json({
        success: true,
        message: "All Bluetooth devices disconnected",
        data: result,
      });
    }
  } catch (err) {
    console.error("❌ Disconnection error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect device",
      error: err.message,
    });
  }
});

// ✅ Enhanced scan devices (replacing existing scan logic)
app.get("/bluetooth/scan", async (req, res) => {
  try {
    console.log("🔍 Scanning for Bluetooth devices...");
    await execAsync("bluetoothctl --timeout 10 scan on");

    const { stdout } = await execAsync("bluetoothctl devices");
    const devices = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.split(" ");
        return {
          id: parts[1],
          name: parts.slice(2).join(" "),
        };
      });

    res.json({ success: true, devices });
  } catch (err) {
    console.error("❌ Scan error:", err.message);
    res.status(500).json({ success: false, message: "Bluetooth scan failed" });
  }
});

// ✅ Enhanced connect devices (replacing existing connect logic)
app.post("/bluetooth/connect", async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res
      .status(400)
      .json({ success: false, message: "No device ID provided" });
  }

  try {
    console.log(`🔗 Connecting to Bluetooth device ${deviceId}...`);

    // Use the enhanced connectBluetoothAudio function
    const result = await connectBluetoothAudio(deviceId, "Device");

    res.json({
      success: true,
      message: "Connected and audio routed",
      data: result,
    });
  } catch (err) {
    console.error("❌ Connection error:", err.message);
    res.status(500).json({ success: false, message: "Failed to connect" });
  }
});

// ✅ REMOVED: Duplicate /api/system endpoint that was causing automatic system info fetching
// Use /api/system/info instead - it properly checks Pi connection and only fetches on frontend request

// ✅ NEW: Enhanced Bluetooth Audio Functions
async function scanBluetoothDevices() {
  try {
    console.log("📡 Starting Bluetooth scan...");

    // Start scanning
    await execAsync(`echo -e 'scan on\n' | bluetoothctl`);

    // Wait for a few seconds to let devices appear
    await new Promise((resolve) => setTimeout(resolve, 8000)); // You can adjust this

    // Stop scanning (this is the correct way)
    await execAsync(`echo -e 'scan off\n' | bluetoothctl`);

    // Fetch discovered devices
    const { stdout } = await execAsync("bluetoothctl devices");
    const devices = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.split(" ");
        const mac = parts[1];
        const name = parts.slice(2).join(" ");
        return {
          id: mac,
          mac,
          name: name || "Unknown",
        };
      });

    console.log(`✅ Found ${devices.length} devices`);
    return {
      devices,
      count: devices.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Bluetooth scan error:", error);
    throw new Error("Bluetooth scan failed: " + error.message);
  }
}

async function connectBluetoothAudio(deviceId, deviceName) {
  try {
    console.log(
      `🎵 Connecting to Bluetooth audio device: ${deviceName} (${deviceId})`
    );

    // Ensure Bluetooth service is running
    await execAsync("sudo systemctl start bluetooth");

    // First, disconnect any currently connected devices
    console.log("🔄 Checking for existing connections...");
    try {
      const { stdout: allDevices } = await execAsync("bluetoothctl devices");
      const deviceLines = allDevices.trim().split("\n").filter(Boolean);

      for (const line of deviceLines) {
        const parts = line.split(" ");
        const existingDeviceId = parts[1];

        if (existingDeviceId) {
          try {
            const { stdout: deviceInfo } = await execAsync(
              `bluetoothctl info ${existingDeviceId}`
            );
            if (deviceInfo.includes("Connected: yes")) {
              console.log(
                `🔌 Disconnecting existing device: ${existingDeviceId}`
              );
              await execAsync(`bluetoothctl disconnect ${existingDeviceId}`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (infoErr) {
            // Skip if can't get device info
          }
        }
      }
    } catch (disconnectError) {
      console.log("⚠️ Error checking existing connections, continuing...");
    }

    // Trust, pair and connect the device
    console.log(`🤝 Pairing with device ${deviceId}...`);
    try {
      await execAsync(`bluetoothctl trust ${deviceId}`);
      await execAsync(`bluetoothctl pair ${deviceId}`);
    } catch (pairError) {
      console.log("Device might already be paired, continuing...");
    }

    // Connect the device
    console.log(`🔗 Connecting to device ${deviceId}...`);

    // Check if target device is already connected
    let isAlreadyConnected = false;
    try {
      const { stdout: targetDeviceInfo } = await execAsync(
        `bluetoothctl info ${deviceId}`
      );
      if (targetDeviceInfo.includes("Connected: yes")) {
        console.log(
          `🔄 Device ${deviceId} is already connected, reconnecting...`
        );
        await execAsync(`bluetoothctl disconnect ${deviceId}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        isAlreadyConnected = true;
      }
    } catch (checkError) {
      // Continue if can't check connection status
    }

    // Connect (or reconnect) the device
    await execAsync(`bluetoothctl connect ${deviceId}`);

    // Wait a moment for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Try to set as audio output (multiple methods for compatibility)
    console.log(`🔊 Setting as audio output...`);
    const sinkName = `bluez_sink.${deviceId.replace(/:/g, "_")}.a2dp_sink`;

    // Wait a bit more for audio services to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let audioSetSuccess = false;
    try {
      // Method 1: PulseAudio (pacmd)
      await execAsync(`pacmd set-default-sink ${sinkName}`);
      console.log("✅ Audio sink set via pacmd");
      audioSetSuccess = true;
    } catch (audioError) {
      try {
        // Method 2: pactl (newer PulseAudio)
        await execAsync(`pactl set-default-sink ${sinkName}`);
        console.log("✅ Audio sink set via pactl");
        audioSetSuccess = true;
      } catch (audioError2) {
        console.log("⚠️ Audio sink setting failed, but device connected");
        // Try to list available sinks for debugging
        try {
          const { stdout: sinks } = await execAsync("pactl list short sinks");
          console.log("Available sinks:", sinks);
        } catch (listError) {
          console.log("Could not list available sinks");
        }
      }
    }

    // Play connection sound if available
    try {
      console.log("🔊 Playing connection sound...");
      await execAsync("mpg123 /home/username/connected.mp3");
    } catch (soundErr) {
      console.warn("⚠️ Failed to play sound:", soundErr.message);
    }

    return {
      connected: true,
      deviceId,
      deviceName,
      audioSink: sinkName,
      audioSetSuccess,
      wasReconnected: isAlreadyConnected,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bluetooth connection error:", error);
    throw new Error(`Failed to connect to ${deviceName}: ${error.message}`);
  }
}

async function disconnectBluetoothAudio() {
  try {
    console.log("🔇 Disconnecting Bluetooth audio...");

    // Get all devices and check which ones are connected
    const { stdout: allDevices } = await execAsync("bluetoothctl devices");
    const deviceLines = allDevices.trim().split("\n").filter(Boolean);

    const connectedDevices = [];

    // Check each device to see if it's connected
    for (const line of deviceLines) {
      const parts = line.split(" ");
      const deviceId = parts[1];

      if (deviceId) {
        try {
          const { stdout: deviceInfo } = await execAsync(
            `bluetoothctl info ${deviceId}`
          );
          if (deviceInfo.includes("Connected: yes")) {
            connectedDevices.push(deviceId);
          }
        } catch (infoErr) {
          // Skip if can't get device info
        }
      }
    }

    // Disconnect all connected devices
    for (const deviceId of connectedDevices) {
      console.log(`Disconnecting device: ${deviceId}`);
      try {
        await execAsync(`bluetoothctl disconnect ${deviceId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait between disconnections
      } catch (disconnectErr) {
        console.log(`Failed to disconnect ${deviceId}:`, disconnectErr.message);
      }
    }

    // Reset to default audio output (try multiple options)
    try {
      await execAsync(
        "pacmd set-default-sink alsa_output.platform-bcm2835_audio.analog-mono"
      );
      console.log("✅ Audio reset to default via pacmd");
    } catch {
      try {
        await execAsync(
          "pactl set-default-sink alsa_output.platform-bcm2835_audio.analog-mono"
        );
        console.log("✅ Audio reset to default via pactl");
      } catch {
        console.log("⚠️ Could not reset to default audio sink");
      }
    }

    return {
      disconnected: true,
      devicesDisconnected: connectedDevices.length,
      disconnectedDevices: connectedDevices,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bluetooth disconnection error:", error);
    throw new Error(`Failed to disconnect Bluetooth audio: ${error.message}`);
  }
}

async function disconnectSpecificBluetoothDevice(deviceId) {
  try {
    console.log(`🔇 Disconnecting specific Bluetooth device: ${deviceId}...`);

    // Check if the device is actually connected
    try {
      const { stdout: deviceInfo } = await execAsync(
        `bluetoothctl info ${deviceId}`
      );
      if (!deviceInfo.includes("Connected: yes")) {
        return {
          disconnected: false,
          message: "Device was not connected",
          deviceId,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (infoErr) {
      throw new Error(`Could not get device info for ${deviceId}`);
    }

    // Disconnect the specific device
    await execAsync(`bluetoothctl disconnect ${deviceId}`);

    // Wait a moment for disconnection to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reset to default audio output if this was an audio device
    try {
      await execAsync(
        "pacmd set-default-sink alsa_output.platform-bcm2835_audio.analog-mono"
      );
      console.log("✅ Audio reset to default via pacmd");
    } catch {
      try {
        await execAsync(
          "pactl set-default-sink alsa_output.platform-bcm2835_audio.analog-mono"
        );
        console.log("✅ Audio reset to default via pactl");
      } catch {
        console.log("⚠️ Could not reset to default audio sink");
      }
    }

    return {
      disconnected: true,
      deviceId,
      message: "Device disconnected successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Specific Bluetooth disconnection error:", error);
    throw new Error(
      `Failed to disconnect device ${deviceId}: ${error.message}`
    );
  }
}

async function getBluetoothStatus() {
  try {
    // Get Bluetooth service status
    const { stdout: serviceStatus } = await execAsync(
      "systemctl is-active bluetooth"
    );

    // Use 'bluetoothctl info' on known devices instead of invalid 'devices Connected'
    const { stdout: allDevices } = await execAsync("bluetoothctl devices");
    const deviceLines = allDevices.trim().split("\n").filter(Boolean);

    const connectedDevices = [];
    const audioDevices = [];

    for (const line of deviceLines) {
      const parts = line.split(" ");
      const deviceId = parts[1];
      const deviceName = parts.slice(2).join(" ");

      // Check if device is connected
      try {
        const { stdout: deviceInfo } = await execAsync(
          `bluetoothctl info ${deviceId}`
        );
        if (deviceInfo.includes("Connected: yes")) {
          const deviceObj = {
            id: deviceId,
            name: deviceName,
            mac: deviceId,
            connected: true,
            paired: true,
          };

          connectedDevices.push(deviceObj);

          // Check if it's an audio device
          if (
            deviceInfo.includes("Audio Sink") ||
            deviceInfo.includes("A2DP") ||
            deviceInfo.includes("audio")
          ) {
            audioDevices.push({
              ...deviceObj,
              isAudioDevice: true,
            });
          }
        }
      } catch (infoErr) {
        // Could not get device info; skip
      }
    }

    // Get current audio sink
    let currentSink = "unknown";
    let isBluetoothAudio = false;
    try {
      const { stdout: sinkInfo } = await execAsync(
        'pactl info | grep "Default Sink"'
      );
      currentSink = sinkInfo.split(":")[1].trim();
      isBluetoothAudio = currentSink.includes("bluez_sink");
    } catch {
      // Sink info unavailable
    }

    return {
      serviceActive: serviceStatus.trim() === "active",
      connectedDevices,
      audioDevices,
      currentAudioSink: currentSink,
      isBluetoothAudio,
      hasConnectedAudioDevice: audioDevices.length > 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bluetooth status error:", error);
    return {
      serviceActive: false,
      connectedDevices: [],
      audioDevices: [],
      currentAudioSink: "unknown",
      isBluetoothAudio: false,
      hasConnectedAudioDevice: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ✅ NEW: Get System Information Function (always fetches real data)
async function getSystemInfo() {
  try {
    console.log("📊 Gathering system information...");

    // Get system uptime
    let uptime = "unknown";
    try {
      const { stdout: uptimeOutput } = await execAsync("uptime -p");
      uptime = uptimeOutput.trim().replace("up ", "");
    } catch (uptimeError) {
      console.warn("Could not get uptime:", uptimeError.message);
    }

    // Get CPU temperature (for Raspberry Pi)
    let temperature = 0;
    try {
      const { stdout: tempOutput } = await execAsync(
        "cat /sys/class/thermal/thermal_zone0/temp"
      );
      temperature = Math.round(parseInt(tempOutput.trim()) / 1000);
    } catch (tempError) {
      console.warn("Could not get temperature:", tempError.message);
      // Fallback for non-RPi systems
      try {
        const { stdout: sensorsOutput } = await execAsync(
          "sensors | grep 'Core 0' | awk '{print $3}' | head -1"
        );
        const tempMatch = sensorsOutput.match(/(\d+\.\d+)/);
        if (tempMatch) {
          temperature = Math.round(parseFloat(tempMatch[1]));
        }
      } catch (sensorsError) {
        console.warn(
          "Could not get temperature from sensors:",
          sensorsError.message
        );
      }
    }

    // Get OS version
    let version = "unknown";
    try {
      const { stdout: versionOutput } = await execAsync(
        "cat /etc/os-release | grep PRETTY_NAME"
      );
      const versionMatch = versionOutput.match(/PRETTY_NAME="(.+)"/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } catch (versionError) {
      console.warn("Could not get OS version:", versionError.message);
      // Try alternative method
      try {
        const { stdout: unameOutput } = await execAsync("uname -sr");
        version = unameOutput.trim();
      } catch (unameError) {
        console.warn("Could not get uname:", unameError.message);
      }
    }

    // Get memory information
    let memoryUsage = 0;
    let memory = { used: 0, total: 0 };
    try {
      const { stdout: memInfo } = await execAsync("free -m");
      const lines = memInfo.trim().split("\n");
      const memLine = lines[1].split(/\s+/);

      const totalMem = parseInt(memLine[1]);
      const usedMem = parseInt(memLine[2]);

      memory.total = Math.round((totalMem / 1024) * 100) / 100; // Convert to GB
      memory.used = Math.round((usedMem / 1024) * 100) / 100; // Convert to GB
      memoryUsage = Math.round((usedMem / totalMem) * 100);
    } catch (memError) {
      console.warn("Could not get memory info:", memError.message);
    }

    // Get storage information
    let storage = { used: 0, total: 0 };
    try {
      const { stdout: dfOutput } = await execAsync("df -h / | tail -1");
      const dfParts = dfOutput.trim().split(/\s+/);

      const totalStorage = dfParts[1];
      const usedStorage = dfParts[2];

      // Convert sizes to GB
      storage.total =
        parseFloat(totalStorage.replace("G", "").replace("M", "")) *
        (totalStorage.includes("M") ? 0.001 : 1);
      storage.used =
        parseFloat(usedStorage.replace("G", "").replace("M", "")) *
        (usedStorage.includes("M") ? 0.001 : 1);

      storage.total = Math.round(storage.total * 100) / 100;
      storage.used = Math.round(storage.used * 100) / 100;
    } catch (storageError) {
      console.warn("Could not get storage info:", storageError.message);
    }

    // Get CPU information
    let cpu = { usage: 0, model: "unknown" };
    try {
      // Get CPU model
      const { stdout: cpuModelOutput } = await execAsync(
        "cat /proc/cpuinfo | grep 'model name' | head -1"
      );
      const modelMatch = cpuModelOutput.match(/model name\s*:\s*(.+)/);
      if (modelMatch) {
        cpu.model = modelMatch[1].trim();
      }
    } catch (cpuModelError) {
      console.warn("Could not get CPU model:", cpuModelError.message);
    }

    try {
      // Get CPU usage (1 second average)
      const { stdout: cpuUsageOutput } = await execAsync(
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
      );
      cpu.usage = Math.round(parseFloat(cpuUsageOutput.trim()) || 0);
    } catch (cpuUsageError) {
      console.warn("Could not get CPU usage:", cpuUsageError.message);
    }

    const systemInfo = {
      uptime,
      temperature,
      version,
      memoryUsage,
      memory,
      storage,
      cpu,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ System info gathered successfully:", systemInfo);
    return systemInfo;
  } catch (error) {
    console.error("❌ Error gathering system info:", error);
    throw new Error("Failed to gather system information: " + error.message);
  }
}

// ✅ REMOVED: getSystemInfoSilently() - No longer needed since we only fetch on demand

// ✅ NEW: Check if running on a Raspberry Pi (with development mode support)
async function checkPiConnection() {
  try {
    // If we're in development mode (NODE_ENV=development), consider Pi always connected
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Development mode: Bypassing Pi hardware checks");
      return true;
    }

    // More reliable Pi detection - check for any Pi-specific indicator
    const checks = [
      // Check for RPi-specific temperature sensor (most reliable)
      async () => {
        const { stdout } = await execAsync(
          "cat /sys/class/thermal/thermal_zone0/temp"
        );
        return parseInt(stdout.trim()) > 0; // Temperature should be a positive number
      },
      // Check for RPi-specific CPU info
      async () => {
        const { stdout } = await execAsync(
          "cat /proc/cpuinfo | grep -i 'raspberry\\|broadcom\\|bcm'"
        );
        return stdout.trim().length > 0;
      },
      // Check if we can run basic system commands and get meaningful output
      async () => {
        const { stdout } = await execAsync("uname -m");
        return stdout.includes("arm") || stdout.includes("aarch64");
      },
    ];

    let successCount = 0;
    const results = [];

    for (let i = 0; i < checks.length; i++) {
      try {
        const result = await checks[i]();
        if (result) {
          successCount++;
          results.push(`Check ${i + 1}: PASS`);
        } else {
          results.push(`Check ${i + 1}: FAIL (no data)`);
        }
      } catch (error) {
        results.push(`Check ${i + 1}: FAIL (${error.message})`);
      }
    }

    console.log(`🔍 Pi connection checks: ${results.join(", ")}`);

    // Consider Pi connected if at least 1 out of 3 checks pass (more lenient)
    const isConnected = successCount >= 1;
    console.log(
      `🔌 Pi connection result: ${
        isConnected ? "Connected" : "Disconnected"
      } (${successCount}/3 checks passed)`
    );

    return isConnected;
  } catch (error) {
    console.log(`❌ Pi connection check error: ${error.message}`);
    return false;
  }
}

// ✅ Periodic Pi connection check function (ONLY checks Pi status - no system info fetching)
async function updateSystemInfoPeriodically() {
  try {
    // ONLY update Pi connection status - never fetch system info automatically
    piConnected = await checkPiConnection();
    console.log(
      `🔌 Pi status check: ${piConnected ? "Connected" : "Disconnected"}`
    );
  } catch (error) {
    piConnected = false;
    console.log("❌ Pi connection check failed");
  }
}

// ✅ Start periodic Pi connection checks ONLY (every 1 minute) - NO automatic system info fetching
setInterval(updateSystemInfoPeriodically, 60000); // 60 seconds

// Initial Pi connection check ONLY - no automatic system info fetching
checkPiConnection().then((connected) => {
  piConnected = connected;
  console.log(
    `🔌 Initial Pi connection status: ${
      connected ? "Connected" : "Disconnected"
    }`
  );
  console.log(
    "📊 System details will ONLY be fetched when frontend requests them via /api/system/info"
  );
});

// ✅ System Control Endpoints
// Volume Control
app.post("/api/system/volume", async (req, res) => {
  try {
    const { level, muted } = req.body;
    console.log(`🔊 Volume control request: level=${level}, muted=${muted}`);

    // First, check if we have a Bluetooth audio device connected
    let currentSink = null;
    let isBluetoothAudio = false;

    try {
      const { stdout: sinkInfo } = await execAsync(
        'pactl info | grep "Default Sink"'
      );
      currentSink = sinkInfo.split(":")[1].trim();
      isBluetoothAudio = currentSink.includes("bluez_sink");
      console.log(
        `🎵 Current audio sink: ${currentSink}, isBluetooth: ${isBluetoothAudio}`
      );
    } catch (sinkError) {
      console.log("Could not get current sink info:", sinkError.message);
    }

    if (muted !== undefined) {
      // Handle mute/unmute
      if (isBluetoothAudio && currentSink) {
        // For Bluetooth devices, use pactl with specific sink
        const muteCommand = muted
          ? `pactl set-sink-mute ${currentSink} 1`
          : `pactl set-sink-mute ${currentSink} 0`;
        await execAsync(muteCommand);
        console.log(
          `🎵 Bluetooth audio ${muted ? "muted" : "unmuted"} via pactl`
        );
      } else {
        // For regular audio, use amixer
        const muteCommand = muted
          ? "amixer sset Master mute"
          : "amixer sset Master unmute";
        await execAsync(muteCommand);
        console.log(
          `🔊 System audio ${muted ? "muted" : "unmuted"} via amixer`
        );
      }

      res.json({
        success: true,
        message: muted ? "Audio muted" : "Audio unmuted",
        volume: level || 50,
        muted: muted,
        audioSink: currentSink,
        isBluetoothAudio: isBluetoothAudio,
      });
    } else if (level !== undefined) {
      // Set volume level
      if (isBluetoothAudio && currentSink) {
        // For Bluetooth devices, use pactl with specific sink and percentage
        const volumeCommand = `pactl set-sink-volume ${currentSink} ${level}%`;
        await execAsync(volumeCommand);
        console.log(`🎵 Bluetooth volume set to ${level}% via pactl`);

        // Also try to unmute if it was muted
        await execAsync(`pactl set-sink-mute ${currentSink} 0`);
      } else {
        // For regular audio, use amixer
        await execAsync(`amixer sset Master ${level}%`);
        console.log(`🔊 System volume set to ${level}% via amixer`);
      }

      res.json({
        success: true,
        message: `Volume set to ${level}%`,
        volume: level,
        muted: false,
        audioSink: currentSink,
        isBluetoothAudio: isBluetoothAudio,
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Missing level or muted parameter",
      });
    }
  } catch (error) {
    console.error("Error controlling volume:", error);
    res.status(500).json({
      success: false,
      error: "Failed to control volume",
      details: error.message,
    });
  }
});

// Brightness Control
app.post("/api/system/brightness", async (req, res) => {
  try {
    const { level } = req.body;

    if (level === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing brightness level",
      });
    }

    // For Raspberry Pi, we'll use the backlight control
    const brightnessValue = Math.round((level / 100) * 255);
    await execAsync(
      `echo ${brightnessValue} | sudo tee /sys/class/backlight/rpi_backlight/brightness`
    );

    res.json({
      success: true,
      message: `Brightness set to ${level}%`,
      brightness: level,
    });
  } catch (error) {
    console.error("Error controlling brightness:", error);
    res.status(500).json({
      success: false,
      error: "Failed to control brightness",
      details: error.message,
    });
  }
});

// Screen Power Control
app.post("/api/system/screen", async (req, res) => {
  try {
    const { on } = req.body;

    if (on === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing screen state parameter",
      });
    }

    // Use vcgencmd to control HDMI output
    const command = on
      ? "vcgencmd display_power 1"
      : "vcgencmd display_power 0";
    await execAsync(command);

    res.json({
      success: true,
      message: on ? "Screen turned on" : "Screen turned off",
      screenOn: on,
    });
  } catch (error) {
    console.error("Error controlling screen:", error);
    res.status(500).json({
      success: false,
      error: "Failed to control screen power",
      details: error.message,
    });
  }
});

// System Status (for loading current settings)
app.get("/api/system/status", async (req, res) => {
  try {
    // Get current audio sink info
    let currentSink = null;
    let isBluetoothAudio = false;

    try {
      const { stdout: sinkInfo } = await execAsync(
        'pactl info | grep "Default Sink"'
      );
      currentSink = sinkInfo.split(":")[1].trim();
      isBluetoothAudio = currentSink.includes("bluez_sink");
      console.log(
        `🎵 Getting status for sink: ${currentSink}, isBluetooth: ${isBluetoothAudio}`
      );
    } catch (sinkError) {
      console.log("Could not get current sink info:", sinkError.message);
    }

    // Get current volume
    let volume = 50;
    let muted = false;

    if (isBluetoothAudio && currentSink) {
      // For Bluetooth devices, use pactl
      try {
        const { stdout: volumeResult } = await execAsync(
          `pactl get-sink-volume ${currentSink}`
        );
        const volumeMatch = volumeResult.match(/(\d+)%/);
        if (volumeMatch) {
          volume = parseInt(volumeMatch[1]);
        }

        const { stdout: muteResult } = await execAsync(
          `pactl get-sink-mute ${currentSink}`
        );
        muted = muteResult.includes("yes");

        console.log(
          `🎵 Bluetooth audio status: volume=${volume}%, muted=${muted}`
        );
      } catch (e) {
        console.log("Could not get Bluetooth volume info:", e.message);
      }
    } else {
      // For regular audio, use amixer
      try {
        const volumeResult = await execAsync(
          "amixer get Master | grep -o '[0-9]*%' | head -1"
        );
        volume = parseInt(volumeResult.stdout.replace("%", ""));

        const muteResult = await execAsync(
          "amixer get Master | grep -o '\\[on\\]\\|\\[off\\]'"
        );
        muted = muteResult.stdout.trim() === "[off]";

        console.log(
          `🔊 System audio status: volume=${volume}%, muted=${muted}`
        );
      } catch (e) {
        console.log("Could not get system volume info:", e.message);
      }
    }

    // Get screen power status
    let screenOn = true;
    try {
      const screenResult = await execAsync("vcgencmd display_power");
      screenOn = screenResult.stdout.includes("display_power=1");
    } catch (e) {
      console.log("Could not get screen power status:", e.message);
    }

    // Get brightness (approximate)
    let brightness = 75;
    try {
      const brightnessResult = await execAsync(
        "cat /sys/class/backlight/rpi_backlight/brightness"
      );
      const currentBrightness = parseInt(brightnessResult.stdout.trim());
      brightness = Math.round((currentBrightness / 255) * 100);
    } catch (e) {
      console.log("Could not get brightness info:", e.message);
    }

    res.json({
      success: true,
      volume: volume,
      muted: muted,
      brightness: brightness,
      screenOn: screenOn,
      audioSink: currentSink,
      isBluetoothAudio: isBluetoothAudio,
    });
  } catch (error) {
    console.error("Error getting system status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system status",
      details: error.message,
    });
  }
});

// System Shutdown
app.post("/api/system/shutdown", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Shutdown initiated",
    });

    // Delay the shutdown to allow response to be sent
    setTimeout(() => {
      execAsync("sudo shutdown -h now");
    }, 1000);
  } catch (error) {
    console.error("Error initiating shutdown:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initiate shutdown",
      details: error.message,
    });
  }
});

// System Reboot
app.post("/api/system/reboot", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Reboot initiated",
    });

    // Delay the reboot to allow response to be sent
    setTimeout(() => {
      execAsync("sudo reboot");
    }, 1000);
  } catch (error) {
    console.error("Error initiating reboot:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initiate reboot",
      details: error.message,
    });
  }
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
    return res.redirect(`http://localhost:5173/?spotify_error=${error}`);
  }

  if (!code) {
    return res.redirect("http://localhost:5173/?spotify_error=no_code");
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
    res.redirect("http://localhost:5173/?spotify_auth=success");
  } catch (error) {
    console.error("Error getting Spotify tokens:", error);
    res.redirect(`http://localhost:5173/?spotify_error=token_error`);
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

// ========================================
// PI-SPOTIFY INTEGRATION ENDPOINTS
// ========================================

// Global variables for Spotify mirroring
let spotifyMirrorEnabled = false;
let spotifyMirrorSuccess = false;
let spotifyCredentialsSent = false;

// Pi Spotify Credentials - Send Spotify credentials to Pi when connected
app.post("/api/pi/spotify-credentials", async (req, res) => {
  try {
    console.log("🎵 Sending Spotify credentials to Pi...");

    // Check if we have valid Spotify tokens
    if (!spotifyTokens.accessToken) {
      return res.status(401).json({
        success: false,
        error: "No Spotify credentials available. Please authenticate first.",
        requireAuth: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare credentials data to send to Pi
    const credentialsData = {
      accessToken: spotifyTokens.accessToken,
      refreshToken: spotifyTokens.refreshToken,
      expiresAt: spotifyTokens.expiresAt,
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      timestamp: new Date().toISOString(),
      action: "credentials_update",
    };

    // Send credentials to Pi
    const piResponse = await sendToPi(
      PI_CONFIG.endpoints.spotifyCredentials,
      credentialsData
    );

    if (piResponse.success) {
      spotifyCredentialsSent = true;
      console.log("✅ Spotify credentials successfully sent to Pi");

      res.json({
        success: true,
        message: "Spotify credentials sent to Pi successfully",
        credentialsSent: true,
        piResponse: piResponse.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("❌ Failed to send credentials to Pi:", piResponse.error);
      spotifyCredentialsSent = false;

      res.status(500).json({
        success: false,
        error: "Failed to send credentials to Pi",
        details: piResponse.error,
        piStatus: piResponse.status,
        credentialsSent: false,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Spotify Credentials Error:", error);
    spotifyCredentialsSent = false;
    res.status(500).json({
      success: false,
      error: "Failed to send credentials to Pi",
      details: error.message,
      credentialsSent: false,
      timestamp: new Date().toISOString(),
    });
  }
});

// Pi Spotify Credentials Status - Check if credentials have been sent
app.get("/api/pi/spotify-credentials/status", async (req, res) => {
  try {
    res.json({
      success: true,
      credentialsSent: spotifyCredentialsSent,
      hasSpotifyTokens: !!spotifyTokens.accessToken,
      tokenExpired: isTokenExpired(),
      message: spotifyCredentialsSent
        ? "Credentials have been sent to Pi"
        : "Credentials not yet sent to Pi",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Credentials Status Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get credentials status",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Pi Spotify Mirror - Send mirror status to Pi and credentials if successful
app.post("/api/pi/spotify-mirror", async (req, res) => {
  try {
    console.log("🎵 Sending Spotify mirror status to Pi...");

    // Simple mirror data
    const mirrorData = {
      mirrorEnabled: true,
    };

    // Send to Pi
    const piResponse = await sendToPi(
      PI_CONFIG.endpoints.spotifyMirror,
      mirrorData
    );

    if (piResponse.success) {
      console.log("✅ Mirror sent to Pi successfully");
      res.json({
        success: true,
        message: "Mirror enabled",
      });
    } else {
      console.error("❌ Failed to send to Pi:", piResponse.error);
      res.status(500).json({
        success: false,
        error: "Failed to send to Pi",
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// Pi Spotify Mirror Control - Enable/disable mirroring
app.post("/api/pi/spotify-mirror-control", async (req, res) => {
  try {
    const { enabled, action } = req.body;

    console.log(`🔄 Spotify Mirror Control: ${action} (enabled: ${enabled})`);

    // Prepare control data to send to Pi
    const controlData = {
      enabled: enabled,
      action: action,
      mirrorStatus: enabled ? "mirror_on" : "mirror_off",
      timestamp: new Date().toISOString(),
      message: enabled ? "Spotify mirror enabled" : "Spotify mirror disabled",
    };

    // Send control data to Pi
    const piResponse = await sendToPi(
      PI_CONFIG.endpoints.spotifyControl,
      controlData
    );

    if (piResponse.success) {
      // Update local state based on action
      spotifyMirrorEnabled = enabled;
      if (!enabled) {
        spotifyMirrorSuccess = false;
      }

      if (action === "start" && enabled) {
        console.log("✅ Spotify mirror ON status sent to Pi");
      } else if (action === "stop" && !enabled) {
        console.log("⏹️ Spotify mirror OFF status sent to Pi");
      }

      res.json({
        success: true,
        message: enabled ? "Spotify mirror enabled" : "Spotify mirror disabled",
        mirrorActive: enabled,
        mirrorStatus: enabled ? "mirror_on" : "mirror_off",
        piResponse: piResponse.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Pi communication failed but update local state anyway
      spotifyMirrorEnabled = enabled;
      console.error("❌ Failed to send mirror status to Pi:", piResponse.error);

      res.status(500).json({
        success: false,
        error: "Failed to send mirror status to Pi",
        details: piResponse.error,
        mirrorActive: enabled,
        mirrorStatus: enabled ? "mirror_on" : "mirror_off",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Spotify Mirror Control Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to control Spotify mirror",
      details: error.message,
      mirrorActive: false,
      timestamp: new Date().toISOString(),
    });
  }
});

// ========================================
// WALLPAPER API ENDPOINTS (Conditional on Spotify Mirror Success)
// ========================================

// Get available wallpapers - only works if Spotify is successfully mirrored
app.get("/api/wallpapers", async (req, res) => {
  try {
    // Check if Spotify mirror is successful before allowing wallpaper access
    if (!spotifyMirrorSuccess) {
      return res.status(403).json({
        success: false,
        error: "Wallpaper access requires successful Spotify mirroring",
        requiresSpotifyMirror: true,
        message:
          "Please ensure Spotify is connected and a track is successfully mirrored before accessing wallpapers",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🖼️ Wallpaper API called - Spotify mirror verified");

    // Mock wallpaper data (in production, this would fetch from actual wallpaper directory)
    const mockWallpapers = [
      {
        id: "wp1",
        name: "Abstract Waves",
        category: "Abstract",
        resolution: "1920x1080",
        preview: "/wallpapers/previews/abstract_waves.jpg",
        fullSize: "/wallpapers/full/abstract_waves.jpg",
        active: true,
      },
      {
        id: "wp2",
        name: "Nature Landscape",
        category: "Nature",
        resolution: "1920x1080",
        preview: "/wallpapers/previews/nature_landscape.jpg",
        fullSize: "/wallpapers/full/nature_landscape.jpg",
        active: false,
      },
      {
        id: "wp3",
        name: "City Lights",
        category: "Urban",
        resolution: "1920x1080",
        preview: "/wallpapers/previews/city_lights.jpg",
        fullSize: "/wallpapers/full/city_lights.jpg",
        active: false,
      },
      {
        id: "wp4",
        name: "Minimalist Dark",
        category: "Minimalist",
        resolution: "1920x1080",
        preview: "/wallpapers/previews/minimalist_dark.jpg",
        fullSize: "/wallpapers/full/minimalist_dark.jpg",
        active: false,
      },
    ];

    res.json({
      success: true,
      wallpapers: mockWallpapers,
      activeWallpaper:
        mockWallpapers.find((wp) => wp.active) || mockWallpapers[0],
      totalCount: mockWallpapers.length,
      spotifyMirrorActive: spotifyMirrorSuccess,
      spotifyCredentialsSent: spotifyCredentialsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Wallpaper API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch wallpapers",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Set active wallpaper - also requires Spotify mirror success
app.post("/api/wallpapers/set", async (req, res) => {
  try {
    const { wallpaperId } = req.body;

    if (!spotifyMirrorSuccess) {
      return res.status(403).json({
        success: false,
        error: "Wallpaper changes require successful Spotify mirroring",
        requiresSpotifyMirror: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (!wallpaperId) {
      return res.status(400).json({
        success: false,
        error: "Wallpaper ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`🖼️ Setting wallpaper: ${wallpaperId}`);

    // Mock wallpaper setting (in production, this would actually change the wallpaper)
    const wallpaperSet = {
      id: wallpaperId,
      name: `Wallpaper ${wallpaperId}`,
      setAt: new Date().toISOString(),
      previousWallpaper: "wp1", // Mock previous
    };

    res.json({
      success: true,
      message: `Wallpaper changed to ${wallpaperId}`,
      wallpaper: wallpaperSet,
      spotifyMirrorActive: spotifyMirrorSuccess,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Wallpaper Set Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to set wallpaper",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get current wallpaper status
app.get("/api/wallpapers/status", async (req, res) => {
  try {
    res.json({
      success: true,
      spotifyMirrorRequired: true,
      spotifyMirrorActive: spotifyMirrorSuccess,
      spotifyMirrorEnabled: spotifyMirrorEnabled,
      spotifyCredentialsSent: spotifyCredentialsSent,
      wallpaperAccessAllowed: spotifyMirrorSuccess,
      message: spotifyMirrorSuccess
        ? "Wallpaper access available"
        : "Spotify mirror required for wallpaper access",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Wallpaper Status Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get wallpaper status",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://smartmonitor.local:${PORT}`);
  console.log(`📱 Frontend can connect via: http://192.168.234.180:${PORT}`);
  console.log(`🎵 Bluetooth audio endpoints available`);
  console.log(`🎧 Spotify Web API integration enabled`);
  console.log(`🔗 Spotify auth URL: http://localhost:${PORT}/api/spotify/auth`);
});
