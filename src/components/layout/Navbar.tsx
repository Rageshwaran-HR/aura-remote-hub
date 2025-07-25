import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, Wifi, Bluetooth, Monitor, WifiOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { NetworkScanner } from '../smart-monitor/NetworkScanner';
import { BluetoothScanner } from '../smart-monitor/BluetoothScanner';

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
  const [activeConnectionTab, setActiveConnectionTab] = useState('wifi');

  const handleNetworkDeviceSelect = async (device: any) => {
    setIsConnecting(true);
    try {
      // Simulate connection to network device
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

  const handleBluetoothDeviceSelect = async (device: any) => {
    setIsConnecting(true);
    try {
      onConnectionChange?.(true, { 
        id: device.id, 
        name: device.name, 
        type: 'raspberry-pi', 
        ip: 'bluetooth', 
        status: 'online' 
      });
      setIsConnectDialogOpen(false);
      
      toast({
        title: "Bluetooth Connected",
        description: `Connected to ${device.name}`,
      });
    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
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
                    <TabsTrigger value="bluetooth" className="flex items-center gap-2">
                      <Bluetooth className="h-4 w-4" />
                      Bluetooth
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="wifi" className="mt-4">
                    <NetworkScanner 
                      onDeviceSelect={handleNetworkDeviceSelect}
                      isConnecting={isConnecting}
                    />
                  </TabsContent>
                  
                  <TabsContent value="bluetooth" className="mt-4">
                    <BluetoothScanner 
                      onDeviceSelect={handleBluetoothDeviceSelect}
                      isConnecting={isConnecting}
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