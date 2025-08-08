import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wifi, RefreshCw, CheckCircle, AlertCircle, Plus, Search } from 'lucide-react';
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
  const [customIP, setCustomIP] = useState('');
  const [showCustomIP, setShowCustomIP] = useState(false);

  const scanLocalNetwork = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDevices([]);

    try {
      toast({
        title: "Network Scan Started",
        description: "Scanning for Smart Monitor Pi boards...",
      });

      setScanProgress(10);
      
      // Get local IP to determine network range
      const localIP = await getLocalIP();
      console.log('Local IP detected:', localIP);
      
      const foundDevices: NetworkDevice[] = [];
      
      // First try common hostnames
      const commonHostnames = [
        'smartmonitor.local',
        'raspberrypi.local', 
        'pi.local',
        'smartpi.local',
        'raspberry.local'
      ];

      setScanProgress(20);

      for (const hostname of commonHostnames) {
        try {
          console.log(`Trying hostname: ${hostname}`);
          const response = await fetch(`http://${hostname}:5000`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(3000)
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`Found device at ${hostname}:`, data);
            
            const device: NetworkDevice = {
              id: `pi-${hostname}`,
              name: data.name || `Smart Monitor Pi (${hostname})`,
              type: 'raspberry-pi',
              ip: hostname,
              mac: data.mac,
              status: 'online',
              lastSeen: 'Just now',
              manufacturer: 'Raspberry Pi Foundation',
              services: data.services || ['Smart Monitor API', 'HTTP', 'SSH']
            };
            foundDevices.push(device);
          }
        } catch (error) {
          console.log(`Failed to connect to ${hostname}:`, (error as Error).message);
        }
      }

      setScanProgress(40);

      // Scan common IP ranges if we found our local IP
      if (localIP && foundDevices.length === 0) {
        const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));
        console.log(`Scanning network range: ${networkBase}.1-254`);
        
        // Common Pi IP addresses to check first
        const commonIPs = [
          `${networkBase}.100`,
          `${networkBase}.101`,
          `${networkBase}.102`,
          `${networkBase}.103`,
          `${networkBase}.104`,
          `${networkBase}.105`,
          `${networkBase}.200`,
          `${networkBase}.201`,
          `${networkBase}.202`,
          `${networkBase}.50`,
          `${networkBase}.51`,
          `${networkBase}.52`,
          `${networkBase}.150`,
          `${networkBase}.151`,
          `${networkBase}.152`,
        ];

        let scannedCount = 0;
        const totalToScan = commonIPs.length;

        for (const ip of commonIPs) {
          try {
            console.log(`Trying IP: ${ip}`);
            const response = await fetch(`http://${ip}:5000`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
              const data = await response.json();
              console.log(`Found device at ${ip}:`, data);
              
              const device: NetworkDevice = {
                id: `pi-${ip}`,
                name: data.name || `Smart Monitor Pi (${ip})`,
                type: 'raspberry-pi',
                ip: ip,
                mac: data.mac,
                status: 'online',
                lastSeen: 'Just now',
                manufacturer: 'Raspberry Pi Foundation',
                services: data.services || ['Smart Monitor API', 'HTTP', 'SSH']
              };
              
              if (!foundDevices.find(d => d.ip === device.ip)) {
                foundDevices.push(device);
              }
            }
          } catch (error) {
            console.log(`Failed to connect to ${ip}:`, (error as Error).message);
          }
          
          scannedCount++;
          setScanProgress(40 + (scannedCount / totalToScan) * 50);
        }
      }

      setScanProgress(100);
      setDevices(foundDevices);

      if (foundDevices.length > 0) {
        toast({
          title: "Network Scan Complete",
          description: `Found ${foundDevices.length} Smart Monitor Pi device(s)`,
        });
      } else {
        toast({
          title: "No Devices Found",
          description: "Try entering your Pi's IP address manually",
          variant: "destructive"
        });
      }

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

  const testCustomIP = async () => {
    if (!customIP.trim()) {
      toast({
        title: "Invalid IP",
        description: "Please enter a valid IP address",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    try {
      console.log(`Testing custom IP: ${customIP}`);
      
      const response = await fetch(`http://${customIP}:5000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Found device at custom IP ${customIP}:`, data);
        
        const device: NetworkDevice = {
          id: `pi-${customIP}`,
          name: data.name || `Smart Monitor Pi (${customIP})`,
          type: 'raspberry-pi',
          ip: customIP,
          mac: data.mac,
          status: 'online',
          lastSeen: 'Just now',
          manufacturer: 'Raspberry Pi Foundation',
          services: data.services || ['Smart Monitor API', 'HTTP', 'SSH']
        };
        
        setDevices(prev => {
          const filtered = prev.filter(d => d.ip !== device.ip);
          return [...filtered, device];
        });

        toast({
          title: "Device Found",
          description: `Successfully connected to ${customIP}`,
        });
        setShowCustomIP(false);
        setCustomIP('');
      } else {
        throw new Error('Device not responding');
      }
    } catch (error) {
      console.error(`Failed to connect to ${customIP}:`, error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${customIP}. Make sure your Pi is running and accessible.`,
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
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
      
      // Fallback if WebRTC fails
      setTimeout(() => {
        pc.close();
        resolve('192.168.1.100'); // Common default
      }, 5000);
    });
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomIP(!showCustomIP)}
            className="min-w-[80px]"
          >
            <Plus className="h-4 w-4 mr-1" />
            Manual
          </Button>
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
      </div>

      {showCustomIP && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label htmlFor="custom-ip">Enter Pi IP Address</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-ip"
                  placeholder="192.168.1.180"
                  value={customIP}
                  onChange={(e) => setCustomIP(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && testCustomIP()}
                />
                <Button onClick={testCustomIP} disabled={isScanning}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your Raspberry Pi's IP address if auto-discovery fails
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          <p className="text-xs">Click "Scan Network" to discover devices or use "Manual" to enter IP address</p>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
            <p className="text-xs font-medium mb-1">Troubleshooting:</p>
            <ul className="text-xs space-y-1">
              <li>• Make sure your Pi is on the same network</li>
              <li>• Check if your Pi is running on port 5000</li>
              <li>• Try entering the IP address manually</li>
              <li>• Check your Pi's console logs for errors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
