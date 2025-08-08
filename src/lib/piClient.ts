// API Client for communicating with Smart Monitor Pi
interface PiConnection {
  ip: string;
  port: number;
  baseUrl: string;
  isConnected: boolean;
  lastResponse?: Date;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface ApiDiscoveryResponse {
  success: boolean;
  message: string;
  version: string;
  endpoints: string[];
  timestamp: string;
}

export class SmartMonitorPiClient {
  private connection: PiConnection | null = null;

  constructor() {
    this.connection = null;
  }

  // Establish connection to Pi
  async connect(ip: string, port: number = 5000): Promise<boolean> {
    try {
      const baseUrl = `http://${ip}:${port}`;
      console.log(`Connecting to Smart Monitor Pi at ${baseUrl}...`);

      // Test basic connectivity to the backend server
      const response = await fetch(baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        // Backend server is running, but now check if it's actually connected to a Pi
        const piStatusResponse = await fetch(`${baseUrl}/api/pi/status`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (piStatusResponse.ok) {
          const piStatus = await piStatusResponse.json();
          
          if (piStatus.success && piStatus.connected) {
            // Pi is actually connected
            this.connection = {
              ip,
              port,
              baseUrl,
              isConnected: true,
              lastResponse: new Date()
            };

            console.log('✅ Connected to Smart Monitor Pi successfully');
            
            // Discover available endpoints
            await this.discoverEndpoints();
            
            return true;
          } else {
            console.warn('⚠️ Backend server is running but Pi is not connected');
            this.connection = null;
            return false;
          }
        } else {
          throw new Error(`Pi status check failed: ${piStatusResponse.status}`);
        }
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to connect to Pi:', error);
      this.connection = null;
      return false;
    }
  }

  // Disconnect from Pi
  disconnect(): void {
    this.connection = null;
    console.log('🔌 Disconnected from Smart Monitor Pi');
  }

  // Check if connected
  isConnected(): boolean {
    return this.connection?.isConnected ?? false;
  }

  // Check Pi connection status from backend
  async checkPiStatus(): Promise<boolean> {
    if (!this.connection) {
      return false;
    }

    try {
      const response = await fetch(`${this.connection.baseUrl}/api/pi/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const piStatus = await response.json();
        const isConnected = piStatus.success && piStatus.connected;
        
        // Update our connection status based on Pi status
        if (this.connection) {
          this.connection.isConnected = isConnected;
        }
        
        return isConnected;
      }
      return false;
    } catch (error) {
      console.error('Failed to check Pi status:', error);
      if (this.connection) {
        this.connection.isConnected = false;
      }
      return false;
    }
  }

  // Get connection info
  getConnectionInfo(): PiConnection | null {
    return this.connection;
  }

  // Make API request
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<ApiResponse<T>> {
    if (!this.connection?.isConnected) {
      return {
        success: false,
        error: 'Not connected to Pi',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const url = `${this.connection.baseUrl}${endpoint}`;
      console.log(`🔄 API Request: ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
      });

      this.connection.lastResponse = new Date();

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let data: T;

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Handle non-JSON responses
          const textContent = await response.text();
          data = {
            type: 'html_response',
            content: textContent,
            contentType
          } as T;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`❌ API Request failed: ${method} ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Discover available endpoints from the API
  private async discoverEndpoints(): Promise<string[]> {
    console.log('🔍 Discovering available API endpoints...');
    
    try {
      // First, try to get the endpoint list from the API discovery endpoint
      const apiResponse = await this.makeRequest('/api');
      
      // The /api endpoint returns data directly, not wrapped in data property
      if (apiResponse.success && apiResponse.data) {
        const discoveryData = apiResponse.data as ApiDiscoveryResponse;
        if (discoveryData.endpoints) {
          console.log(`📡 Found ${discoveryData.endpoints.length} endpoints from API discovery`);
          
          // Verify each endpoint actually works
          const verifiedEndpoints: string[] = [];
          for (const endpoint of discoveryData.endpoints) {
            try {
              const result = await this.makeRequest(endpoint);
              if (result.success) {
                verifiedEndpoints.push(endpoint);
                console.log(`✅ Verified endpoint: ${endpoint}`);
              }
            } catch (error) {
              console.log(`❌ Endpoint not working: ${endpoint}`);
            }
          }
          
          return verifiedEndpoints;
        }
      }
    } catch (error) {
      console.log('⚠️ API discovery failed, falling back to manual discovery');
    }

    // Fallback: Only check essential endpoints if API discovery fails
    const essentialEndpoints = [
      '/api/status',
      '/api/system/info',
      '/api/bluetooth/status'
    ];

    const availableEndpoints: string[] = [];
    
    for (const endpoint of essentialEndpoints) {
      try {
        const result = await this.makeRequest(endpoint);
        if (result.success) {
          availableEndpoints.push(endpoint);
          console.log(`✅ Available endpoint: ${endpoint}`);
        }
      } catch (error) {
        console.log(`❌ Endpoint not available: ${endpoint}`);
      }
    }

    console.log(`📡 Found ${availableEndpoints.length} available endpoints`);
    return availableEndpoints;
  }

  // Specific API methods for Smart Monitor Pi
  async getSystemStatus() {
    return await this.makeRequest('/api/status') || 
           await this.makeRequest('/status') ||
           await this.makeRequest('/');
  }

  async getSystemInfo() {
    return await this.makeRequest('/api/system') ||
           await this.makeRequest('/system') ||
           await this.makeRequest('/info');
  }

  async getTemperature() {
    return await this.makeRequest('/api/temperature') ||
           await this.makeRequest('/temperature');
  }

  async getCpuInfo() {
    return await this.makeRequest('/api/cpu');
  }

  async getMemoryInfo() {
    return await this.makeRequest('/api/memory');
  }

  async getWallpapers() {
    return await this.makeRequest('/api/wallpapers') ||
           await this.makeRequest('/wallpapers');
  }

  async setWallpaper(wallpaperId: string, wallpaperData: { fileName: string; displayName: string }) {
    console.log('📤 Sending wallpaper change request to Pi:', { wallpaperId, ...wallpaperData });
    
    // Try wallpaper-specific endpoints first
    return await this.makeRequest('/api/wallpapers/set', 'POST', { 
      wallpaperId, 
      fileName: wallpaperData.fileName,
      displayName: wallpaperData.displayName,
      action: 'set_active'
    }) ||
    await this.makeRequest('/wallpapers/set', 'POST', { 
      wallpaperId, 
      fileName: wallpaperData.fileName,
      displayName: wallpaperData.displayName,
      action: 'set_active'
    }) ||
    // Fallback to general command endpoint
    await this.sendCommand('set_wallpaper', {
      wallpaperId,
      fileName: wallpaperData.fileName,
      displayName: wallpaperData.displayName,
      action: 'set_active'
    });
  }

  // Send control commands
  async sendCommand(command: string, params?: unknown) {
    // For Bluetooth commands, try Bluetooth endpoints first
    if (command.includes('bluetooth')) {
      return await this.makeRequest('/api/bluetooth', 'POST', { command, params }) ||
             await this.makeRequest('/bluetooth', 'POST', { command, params }) ||
             await this.makeRequest('/api/controls', 'POST', { command, params }) ||
             await this.makeRequest('/controls', 'POST', { command, params });
    }
    
    // For other commands, try controls endpoints first
    return await this.makeRequest('/api/controls', 'POST', { command, params }) ||
           await this.makeRequest('/controls', 'POST', { command, params }) ||
           await this.makeRequest('/api/bluetooth', 'POST', { command, params }) ||
           await this.makeRequest('/bluetooth', 'POST', { command, params });
  }

  // Bluetooth Audio specific methods
  async connectBluetoothAudio(deviceId: string, deviceName: string) {
    console.log(`🎵 Sending Bluetooth audio connect command for ${deviceName}...`);
    return await this.sendCommand('bluetooth_audio_connect', {
      deviceId,
      deviceName,
      action: 'connect_audio'
    });
  }

  async disconnectBluetoothAudio() {
    console.log(`🔇 Sending Bluetooth audio disconnect command...`);
    return await this.sendCommand('bluetooth_audio_disconnect', {
      action: 'disconnect_audio'
    });
  }

  async disconnectSpecificBluetoothDevice(deviceId: string) {
    console.log(`🔇 Sending specific Bluetooth disconnect command for ${deviceId}...`);
    
    if (!this.connection?.isConnected) {
      return {
        success: false,
        error: 'Not connected to Pi'
      };
    }

    try {
      const url = `${this.connection.baseUrl}/bluetooth/disconnect`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
        signal: AbortSignal.timeout(10000)
      });

      this.connection.lastResponse = new Date();

      if (response.ok) {
        const data = await response.json();
        console.log('📱 Disconnect response:', data);
        return data;
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('❌ Failed to disconnect device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Scan for Bluetooth devices
  async scanBluetoothDevices() {
    if (!this.connection?.isConnected) {
      return {
        success: false,
        error: 'Not connected to Pi',
        devices: []
      };
    }

    try {
      const url = `${this.connection.baseUrl}/bluetooth/scan`;
      console.log(`🔄 Scanning for Bluetooth devices: GET ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // Longer timeout for scanning
      });

      this.connection.lastResponse = new Date();

      if (response.ok) {
        const data = await response.json();
        console.log('📱 Bluetooth scan response:', data);
        return data; // Return the response directly as it contains {success, devices}
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          devices: []
        };
      }
    } catch (error) {
      console.error('❌ Bluetooth scan failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        devices: []
      };
    }
  }

  async getBluetoothStatus() {
    return await this.makeRequest('/api/bluetooth/status') ||
           await this.makeRequest('/bluetooth/status') ||
           await this.makeRequest('/api/bluetooth') ||
           await this.makeRequest('/bluetooth');
  }

  // Get currently connected Bluetooth devices
  async getConnectedBluetoothDevices() {
    if (!this.connection?.isConnected) {
      return {
        success: false,
        error: 'Not connected to Pi',
        connectedDevices: []
      };
    }

    try {
      const url = `${this.connection.baseUrl}/bluetooth/connected`;
      console.log(`🔄 Getting connected Bluetooth devices: GET ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      this.connection.lastResponse = new Date();

      if (response.ok) {
        const data = await response.json();
        console.log('📱 Connected devices response:', data);
        return data;
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          connectedDevices: []
        };
      }
    } catch (error) {
      console.error('❌ Failed to get connected devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectedDevices: []
      };
    }
  }

  // Test connectivity
  async testConnection(): Promise<boolean> {
    if (!this.connection) return false;
    
    const result = await this.makeRequest('/');
    return result.success;
  }
}

// Create singleton instance
export const piClient = new SmartMonitorPiClient();
