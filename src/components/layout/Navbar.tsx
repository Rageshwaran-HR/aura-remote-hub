import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Sun, Wifi, Bluetooth, Settings, Monitor, WifiOff, Loader2, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface NetworkDevice {
  id: string;
  name: string;
  type: 'raspberry-pi' | 'smart-tv' | 'computer';
  ip: string;
  status: 'online' | 'offline';
  lastSeen?: string;
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
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isDarkMode, 
  onToggleTheme, 
  systemStatus,
  onConnectionChange 
}) => {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([
    {
      id: 'rpi-001',
      name: 'Smart Monitor Pi',
      type: 'raspberry-pi',
      ip: '192.168.1.100',
      status: 'online',
      lastSeen: '2 min ago'
    },
    {
      id: 'rpi-002',
      name: 'Living Room Pi',
      type: 'raspberry-pi',
      ip: '192.168.1.101',
      status: 'online',
      lastSeen: '5 min ago'
    },
    {
      id: 'tv-001',
      name: 'Samsung Smart TV',
      type: 'smart-tv',
      ip: '192.168.1.150',
      status: 'offline',
      lastSeen: '1 hour ago'
    }
  ]);

  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      const response = await axios.get('/api/network/scan');
      setNetworkDevices(response.data.devices || networkDevices);
      
      toast({
        title: "Network Scan Complete",
        description: `Found ${response.data.devices?.length || networkDevices.length} devices`,
      });
    } catch (error) {
      console.error('Failed to scan network:', error);
      toast({
        title: "Scan Failed",
        description: "Could not scan network for devices",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: NetworkDevice) => {
    setIsConnecting(true);
    try {
      await axios.post('/api/device/connect', { deviceId: device.id, ip: device.ip });
      
      onConnectionChange?.(true, device);
      setIsConnectDialogOpen(false);
      
      toast({
        title: "Connected Successfully",
        description: `Connected to ${device.name}`,
      });
    } catch (error) {
      console.error('Failed to connect to device:', error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${device.name}`,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await axios.post('/api/device/disconnect');
      
      onConnectionChange?.(false);
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from device",
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

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'raspberry-pi': return '🥧';
      case 'smart-tv': return '📺';
      case 'computer': return '💻';
      default: return '📱';
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-primary" />
                    Connect to Device
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Available devices on network
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={scanForDevices}
                      disabled={isScanning}
                      className="h-8 px-3"
                    >
                      {isScanning ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Wifi className="h-3 w-3 mr-1" />
                      )}
                      {isScanning ? 'Scanning...' : 'Scan'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {networkDevices.map((device) => (
                      <Card
                        key={device.id}
                        className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                          device.status === 'offline' ? 'opacity-50' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => device.status === 'online' && connectToDevice(device)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{getDeviceIcon(device.type)}</span>
                              <div>
                                <h4 className="font-medium text-sm">{device.name}</h4>
                                <p className="text-xs text-muted-foreground">{device.ip}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {device.status === 'online' ? (
                                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Offline
                                </Badge>
                              )}
                              {isConnecting && (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              )}
                            </div>
                          </div>
                          {device.lastSeen && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last seen: {device.lastSeen}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {networkDevices.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No devices found</p>
                      <p className="text-xs">Try scanning again</p>
                    </div>
                  )}
                </div>
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