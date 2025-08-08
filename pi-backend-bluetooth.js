// Add these endpoints to your Pi's index.js file

// Bluetooth Audio Management Endpoints
app.post("/api/bluetooth", async (req, res) => {
  try {
    const { command, params } = req.body;
    console.log("🎵 Bluetooth command received:", command, params);

    switch (command) {
      case "bluetooth_audio_connect":
        const connectResult = await connectBluetoothAudio(
          params.deviceId,
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

// Get Bluetooth status
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

// Alternative endpoint for backward compatibility
app.post("/bluetooth", async (req, res) => {
  // Redirect to main bluetooth endpoint
  req.url = "/api/bluetooth";
  app._router.handle(req, res);
});

app.get("/bluetooth/status", async (req, res) => {
  // Redirect to main bluetooth status endpoint
  req.url = "/api/bluetooth/status";
  app._router.handle(req, res);
});

// Bluetooth Audio Functions
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

async function connectBluetoothAudio(deviceId, deviceName) {
  try {
    console.log(
      `🎵 Connecting to Bluetooth audio device: ${deviceName} (${deviceId})`
    );

    // First, make sure Bluetooth is enabled
    await execAsync("sudo systemctl start bluetooth");
    await execAsync("sudo systemctl enable bluetooth");

    // Scan for devices (if needed)
    console.log("📡 Scanning for Bluetooth devices...");
    await execAsync("bluetoothctl scan on &");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    await execAsync('pkill -f "bluetoothctl scan"');

    // Trust and pair the device
    console.log(`🤝 Pairing with device ${deviceId}...`);
    await execAsync(`bluetoothctl trust ${deviceId}`);
    await execAsync(`bluetoothctl pair ${deviceId}`);

    // Connect the device
    console.log(`🔗 Connecting to device ${deviceId}...`);
    await execAsync(`bluetoothctl connect ${deviceId}`);

    // Set as audio output (for PulseAudio)
    console.log(`🔊 Setting as audio output...`);
    await execAsync(
      `pacmd set-default-sink bluez_sink.${deviceId.replace(
        /:/g,
        "_"
      )}.a2dp_sink`
    );

    return {
      connected: true,
      deviceId,
      deviceName,
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

    // Get connected devices
    const { stdout } = await execAsync("bluetoothctl devices Connected");
    const connectedDevices = stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    // Disconnect all connected devices
    for (const deviceLine of connectedDevices) {
      const deviceId = deviceLine.split(" ")[1];
      if (deviceId) {
        console.log(`Disconnecting device: ${deviceId}`);
        await execAsync(`bluetoothctl disconnect ${deviceId}`);
      }
    }

    // Reset to default audio output
    await execAsync(
      "pacmd set-default-sink alsa_output.platform-bcm2835_audio.analog-mono"
    );

    return {
      disconnected: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bluetooth disconnection error:", error);
    throw new Error(`Failed to disconnect Bluetooth audio: ${error.message}`);
  }
}

async function getBluetoothStatus() {
  try {
    // Get Bluetooth service status
    const { stdout: serviceStatus } = await execAsync(
      "systemctl is-active bluetooth"
    );

    // Get connected devices
    const { stdout: connectedDevices } = await execAsync(
      "bluetoothctl devices Connected"
    );
    const devices = connectedDevices
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(" ");
        return {
          id: parts[1],
          name: parts.slice(2).join(" "),
        };
      });

    // Get current audio sink
    const { stdout: currentSink } = await execAsync(
      'pacmd list-sinks | grep "* index"'
    );

    return {
      serviceActive: serviceStatus.trim() === "active",
      connectedDevices: devices,
      currentAudioSink: currentSink.trim(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bluetooth status error:", error);
    return {
      serviceActive: false,
      connectedDevices: [],
      currentAudioSink: "unknown",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export functions if using modules
module.exports = {
  connectBluetoothAudio,
  disconnectBluetoothAudio,
  getBluetoothStatus,
};
