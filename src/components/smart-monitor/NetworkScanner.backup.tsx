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
      toast({
        title: "Network Scan Started",
        description: "Scanning for Smart Monitor Pi boards...",
      });

      setScanProgress(20);
      
      // Try the main Smart Monitor endpoint
      const foundDevices: NetworkDevice[] = [];
      
      try {
        const response = await fetch("http://smartmonitor.local:5000", {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000)
        });

        setScanProgress(50);

        if (response.ok) {
          const data = await response.json();
          
          // Handle the response from Smart Monitor API
          if (data.devices && Array.isArray(data.devices)) {
            data.devices.forEach((deviceData: { id?: string; name?: string; ip?: string; mac?: string; status?: string; lastSeen?: string; services?: string[] }) => {
              const device: NetworkDevice = {
                id: deviceData.id || `pi-${deviceData.ip}`,
                name: deviceData.name || `Smart Monitor Pi (${deviceData.ip})`,
                type: 'raspberry-pi',
                ip: deviceData.ip || 'smartmonitor.local',
                mac: deviceData.mac,
                status: deviceData.status === 'online' || deviceData.status === 'offline' ? deviceData.status : 'online',
                lastSeen: deviceData.lastSeen || 'Just now',
                manufacturer: 'Raspberry Pi Foundation',
                services: deviceData.services || ['Smart Monitor API', 'HTTP', 'SSH']
              };
              foundDevices.push(device);
            });
          } else {
            // Single device response
            const device: NetworkDevice = {
              id: 'smartmonitor-main',
              name: data.name || 'Smart Monitor Pi',
              type: 'raspberry-pi',
              ip: data.ip || 'smartmonitor.local',
              mac: data.mac,
              status: 'online',
              lastSeen: 'Just now',
              manufacturer: 'Raspberry Pi Foundation',
              services: ['Smart Monitor API', 'HTTP', 'SSH']
            };
            foundDevices.push(device);
          }
        }
      } catch (fetchError) {
        console.log('Primary endpoint failed, trying alternative discovery...');
      }

      setScanProgress(70);

      // Try alternative Pi discovery methods
      const piEndpoints = [
        'http://raspberrypi.local:5000',
        'http://pi.local:5000',
        'http://smartpi.local:5000'
      ];

      for (const endpoint of piEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });

          if (response.ok) {
            const data = await response.json();
            const hostname = new URL(endpoint).hostname;
            
            const device: NetworkDevice = {
              id: `pi-${hostname}`,
              name: data.name || `Raspberry Pi (${hostname})`,
              type: 'raspberry-pi',
              ip: hostname,
              status: 'online',
              lastSeen: 'Just now',
              manufacturer: 'Raspberry Pi Foundation',
              services: ['HTTP', 'SSH']
            };
            
            // Avoid duplicates
            if (!foundDevices.find(d => d.ip === device.ip)) {
              foundDevices.push(device);
            }
          }
        } catch (error) {
          // Endpoint not available
        }
      }

      setScanProgress(100);
      setDevices(foundDevices);

      toast({
        title: "Network Scan Complete",
        description: `Found ${foundDevices.length} Smart Monitor Pi device(s)`,
      });

    } catch (error) {
      console.error('Network scan failed:', error);
      toast({
        title: "Scan Failed",
        description: "Could not reach Smart Monitor API",
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
      } catch {
        // Intentionally ignored
      }

      // Try to identify smart TV
      try {
        const tvResponse = await fetch(`http://${ip}:8080`, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(500)
        });
        device.type = 'smart-tv';
        device.name = `Smart TV (${ip})`;
      } catch {
        // Intentionally ignored
      }

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