import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, Wifi, Bluetooth, Monitor, WifiOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NetworkScanner } from '../smart-monitor/NetworkScanner';
import { BluetoothScanner } from '../smart-monitor/BluetoothScanner';
import { NetworkDebugger } from '../smart-monitor/NetworkDebugger';
import { piClient } from '../../lib/piClient';

interface NetworkDevice {
  id: string;
  name: string;
  type: 'raspberry-pi' | 'smart-tv' | 'computer';
  ip: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

interface Wallpaper {
  id: string;
  displayName: string;
  category: string;
  size: string;
  url: string;
  fileName?: string;
  resolution?: string;
  isActive?: boolean;
  path?: string;
}

interface PiWallpaper {
  id: string;
  fileName: string;
  displayName: string;
  size: string;
  resolution: string;
  category?: string;
  url?: string;
  isActive?: boolean;
  path?: string;
}

interface WallpaperResponse {
  wallpapers: Wallpaper[];
  totalCount: number;
  totalSize: string;
}

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  systemStatus: {
    connected: boolean;
    temperature: number;
    lastSeen: string;
  };
  onConnectionChange?: (connected: boolean, device?: NetworkDevice) => void;
  onWallpapersUpdate?: (wallpapers: PiWallpaper[]) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isDarkMode, 
  onToggleTheme, 
  systemStatus,
  onConnectionChange,
  onWallpapersUpdate
}) => {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeConnectionTab, setActiveConnectionTab] = useState('wifi');

  // Fetch wallpaper details from Pi
  const fetchWallpapers = async () => {
    try {
      console.log('🎯 Fetching wallpaper details from Pi...');
      
      // Use piClient to get wallpapers from the connected Pi
      const response = await piClient.getWallpapers();
      
      if (response && response.data) {
        const wallpaperData = response.data as WallpaperResponse;
        console.log('✅ Wallpapers fetched successfully:', wallpaperData);
        
        if (wallpaperData.wallpapers) {
          // Convert to PiWallpaper format for the callback, preserving isActive status from server
          const piWallpapers: PiWallpaper[] = wallpaperData.wallpapers.map((wallpaper: Wallpaper) => ({
            id: wallpaper.id,
            fileName: wallpaper.fileName || `${wallpaper.id}.mp4`,
            displayName: wallpaper.displayName,
            size: wallpaper.size,
            resolution: wallpaper.resolution || 'Unknown',
            category: wallpaper.category,
            url: wallpaper.url,
            isActive: wallpaper.isActive || false, // Preserve active status from server
            path: wallpaper.path
          }));
          
          onWallpapersUpdate?.(piWallpapers);
          
          // Debug: Show which wallpaper is marked as active
          const activeWallpaper = piWallpapers.find(w => w.isActive);
          console.log('🎯 Active wallpaper from server:', activeWallpaper?.displayName || 'None');
          
          toast({
            title: "Wallpapers Loaded 🎨",
            description: `Found ${wallpaperData.totalCount || wallpaperData.wallpapers.length} wallpapers`,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error fetching wallpapers:', error);
      toast({
        title: "Wallpaper Error",
        description: "Failed to load wallpaper details from Pi",
        variant: "destructive"
      });
    }
  };

  const handleNetworkDeviceSelect = async (device: NetworkDevice) => {
    setIsConnecting(true);
    try {
      console.log(`Attempting to establish real connection to ${device.ip}:5000`);
      
      // Use the real PI client to establish connection
      const connected = await piClient.connect(device.ip, 5000);
      
      if (connected) {
        console.log('✅ Real connection established successfully');
        
        // Test the connection by getting system status
        const statusResult = await piClient.getSystemStatus();
        console.log('📊 System status:', statusResult);
        
        // Store connection info for real communication
        const connectedDevice = {
          ...device,
          connectionData: {
            connectedAt: new Date().toISOString(),
            baseUrl: `http://${device.ip}:5000`,
            client: piClient,
            lastStatusCheck: statusResult
          }
        };
        
        onConnectionChange?.(true, connectedDevice);
        setIsConnectDialogOpen(false);
        
        // Automatically fetch wallpapers when Pi connects
        await fetchWallpapers();
        
        toast({
          title: "Real Connection Established! 🎉",
          description: `Successfully connected to ${device.name} at ${device.ip}:5000`,
        });
        
      } else {
        throw new Error('Failed to establish connection with Pi client');
      }
    } catch (error) {
      console.error('Failed to establish real connection:', error);
      toast({
        title: "Connection Failed",
        description: `Could not establish real connection to ${device.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBluetoothDeviceSelect = async (device: { id: string; name?: string }) => {
    setIsConnecting(true);
    try {
      onConnectionChange?.(true, { 
        id: device.id, 
        name: device.name || 'Unknown Device', 
        type: 'raspberry-pi', 
        ip: 'bluetooth', 
        status: 'online' 
      });
      setIsConnectDialogOpen(false);
      
      toast({
        title: "Bluetooth Connected",
        description: `Connected to ${device.name || 'Unknown Device'}`,
      });
    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${device.name || 'Unknown Device'}`,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBluetoothAudioConnect = async (device: { id: string; name?: string }) => {
    setIsConnecting(true);
    try {
      console.log(`🎵 Connecting audio device ${device.name} to Pi Bluetooth...`);
      
      // Check if Pi is connected first
      if (!piClient.isConnected()) {
        throw new Error('Pi not connected. Please connect to your Smart Monitor Pi first.');
      }

      // Send Bluetooth audio connection command to Pi
      const connectResult = await piClient.sendCommand('bluetooth_audio_connect', {
        deviceId: device.id,
        deviceName: device.name || 'Unknown Device',
        action: 'connect_audio'
      });

      if (connectResult.success) {
        toast({
          title: "Audio Device Connected! 🎵",
          description: `${device.name || 'Audio device'} connected to Pi for audio output`,
        });
        console.log('✅ Audio device connected successfully:', connectResult);
      } else {
        throw new Error(connectResult.error || 'Failed to connect audio device');
      }
    } catch (error) {
      console.error('Failed to connect audio device:', error);
      toast({
        title: "Audio Connection Failed",
        description: `Could not connect ${device.name || 'audio device'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      console.log('🔌 Disconnecting from Pi...');
      
      // Disconnect using the real client
      piClient.disconnect();
      
      // Clear any stored connection data
      onConnectionChange?.(false);
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Smart Monitor Pi",
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Disconnect Failed",
        description: "Could not disconnect from device",
        variant: "destructive"
      });
    }
  };
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              Smart Monitor
            </h1>
            <p className="text-xs text-muted-foreground -mt-1">Control Panel</p>
          </div>
        </div>

        {/* Status & Controls */}
        <div className="flex items-center gap-3">
          {/* Bluetooth Audio Scanner */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              >
                <Bluetooth className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Audio</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bluetooth className="h-5 w-5 text-blue-500" />
                  Connect Audio Device
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                <BluetoothScanner 
                  onDeviceSelect={handleBluetoothAudioConnect}
                  isConnecting={isConnecting}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Connection Button */}
          {systemStatus.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="h-8 px-3 border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
            >
              <WifiOff className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Disconnect</span>
            </Button>
          ) : (
            <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Connect</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Connect to Device
                  </DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeConnectionTab} onValueChange={setActiveConnectionTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="wifi" className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      WiFi/Network
                    </TabsTrigger>
                    <TabsTrigger value="debug" className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Debug
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="wifi" className="mt-4">
                    <NetworkScanner 
                      onDeviceSelect={handleNetworkDeviceSelect}
                      isConnecting={isConnecting}
                    />
                  </TabsContent>
                  
                  <TabsContent value="debug" className="mt-4">
                    <NetworkDebugger 
                      onDeviceFound={(device) => {
                        const networkDevice: NetworkDevice = {
                          id: device.id,
                          name: device.name,
                          type: 'raspberry-pi',
                          ip: device.ip,
                          status: 'online'
                        };
                        handleNetworkDeviceSelect(networkDevice);
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}

          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.connected 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500'
              }`} />
              <span className="text-xs text-muted-foreground">
                {systemStatus.connected ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <Badge variant="secondary" className="text-xs">
              {systemStatus.temperature}°C
            </Badge>
          </div>

          {/* Connectivity Icons */}
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" />
            <Bluetooth className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="h-9 w-9 rounded-full hover:bg-muted"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
};