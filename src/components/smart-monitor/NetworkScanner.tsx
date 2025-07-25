import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NetworkDevice {
  id: string;
  name: string;
  type: 'raspberry-pi' | 'smart-tv' | 'computer' | 'router' | 'phone';
  ip: string;
  mac?: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  manufacturer?: string;
  services?: string[];
}

interface NetworkScannerProps {
  onDeviceSelect: (device: NetworkDevice) => void;
  isConnecting: boolean;
}

export const NetworkScanner: React.FC<NetworkScannerProps> = ({ 
  onDeviceSelect, 
  isConnecting 
}) => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const scanLocalNetwork = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDevices([]);

    try {
      // Get local IP range
      const localIP = await getLocalIP();
      const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
      
      toast({
        title: "Network Scan Started",
        description: `Scanning ${subnet}.0/24 for devices...`,
      });

      // Scan IP range (simplified for demo)
      const foundDevices: NetworkDevice[] = [];
      
      for (let i = 1; i <= 254; i++) {
        setScanProgress((i / 254) * 100);
        const targetIP = `${subnet}.${i}`;
        
        try {
          // Use fetch with timeout to check if device responds
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 100);
          
          const response = await fetch(`http://${targetIP}:80`, {
            method: 'HEAD',
            signal: controller.signal,
            mode: 'no-cors'
          });
          
          clearTimeout(timeout);
          
          // If we get here, device responded
          const device = await identifyDevice(targetIP);
          if (device) {
            foundDevices.push(device);
            setDevices([...foundDevices]);
          }
        } catch (error) {
          // Device didn't respond or error occurred
        }
        
        // Add small delay to prevent overwhelming the network
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Also try mDNS discovery (limited browser support)
      try {
        await discoverMDNSDevices(foundDevices);
      } catch (error) {
        console.log('mDNS discovery not available');
      }

      toast({
        title: "Network Scan Complete",
        description: `Found ${foundDevices.length} devices`,
      });

    } catch (error) {
      console.error('Network scan failed:', error);
      toast({
        title: "Scan Failed",
        description: "Could not complete network scan",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const getLocalIP = async (): Promise<string> => {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate)?.[1];
        if (myIP) {
          pc.close();
          resolve(myIP);
        }
      };
    });
  };

  const identifyDevice = async (ip: string): Promise<NetworkDevice | null> => {
    try {
      // Try to get device info from common ports/endpoints
      const device: NetworkDevice = {
        id: `device-${ip}`,
        name: `Device ${ip}`,
        type: 'computer',
        ip: ip,
        status: 'online',
        lastSeen: 'Just now'
      };

      // Try to identify Raspberry Pi
      try {
        const piResponse = await fetch(`http://${ip}:22`, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(500)
        });
        device.type = 'raspberry-pi';
        device.name = `Raspberry Pi (${ip})`;
        device.services = ['SSH'];
      } catch {}

      // Try to identify smart TV
      try {
        const tvResponse = await fetch(`http://${ip}:8080`, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(500)
        });
        device.type = 'smart-tv';
        device.name = `Smart TV (${ip})`;
      } catch {}

      return device;
    } catch (error) {
      return null;
    }
  };

  const discoverMDNSDevices = async (existingDevices: NetworkDevice[]) => {
    // Note: This would require a WebRTC-based mDNS implementation
    // or a browser extension for full mDNS support
    console.log('mDNS discovery would run here with proper backend support');
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'raspberry-pi': return '🥧';
      case 'smart-tv': return '📺';
      case 'computer': return '💻';
      case 'router': return '🌐';
      case 'phone': return '📱';
      default: return '📱';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'online' 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Network Devices</h3>
          <p className="text-sm text-muted-foreground">
            Scan for available devices on your network
          </p>
        </div>
        <Button
          onClick={scanLocalNetwork}
          disabled={isScanning}
          className="min-w-[100px]"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Network
            </>
          )}
        </Button>
      </div>

      {isScanning && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Scanning network...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-200"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {devices.map((device) => (
          <Card
            key={device.id}
            className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${
              device.status === 'offline' ? 'opacity-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => device.status === 'online' && onDeviceSelect(device)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getDeviceIcon(device.type)}</span>
                  <div>
                    <h4 className="font-medium text-sm">{device.name}</h4>
                    <p className="text-xs text-muted-foreground">{device.ip}</p>
                    {device.mac && (
                      <p className="text-xs text-muted-foreground">MAC: {device.mac}</p>
                    )}
                    {device.services && (
                      <p className="text-xs text-muted-foreground">
                        Services: {device.services.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(device.status)}`}>
                    {device.status === 'online' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {device.status}
                  </Badge>
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

      {devices.length === 0 && !isScanning && (
        <div className="text-center py-8 text-muted-foreground">
          <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No devices found</p>
          <p className="text-xs">Click "Scan Network" to discover devices</p>
        </div>
      )}
    </div>
  );
};