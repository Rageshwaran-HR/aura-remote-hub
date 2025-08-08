import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bluetooth, RefreshCw, CheckCircle, Wifi, Unplug } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { piClient } from '@/lib/piClient';

interface BluetoothDeviceResponse {
  id: string;
  name?: string;
  mac?: string;
  connected: boolean;
  paired: boolean;
  isAudioDevice?: boolean;
}

interface CustomBluetoothDevice {
  id: string;
  name?: string;
  mac?: string;
  deviceClass?: number;
  rssi?: number;
  connected: boolean;
  paired: boolean;
}

interface BluetoothScannerProps {
  onDeviceSelect: (device: CustomBluetoothDevice) => void;
  isConnecting: boolean;
}

export const BluetoothScanner: React.FC<BluetoothScannerProps> = ({ 
  onDeviceSelect, 
  isConnecting 
}) => {
  const [devices, setDevices] = useState<CustomBluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [piConnected, setPiConnected] = useState(false);
  const [disconnectingDeviceId, setDisconnectingDeviceId] = useState<string | null>(null);

  // Check Pi connection status and get connected devices
  React.useEffect(() => {
    const checkPiAndDevices = async () => {
      const isConnected = piClient.isConnected();
      setPiConnected(isConnected);
      
      if (isConnected) {
        try {
          // Check for already connected devices when Pi connects
          console.log("🔄 Checking for already connected devices...");
          const connectedResult = await piClient.getConnectedBluetoothDevices();
          
          if (connectedResult.success && connectedResult.connectedDevices?.length > 0) {
            console.log("📱 Found connected devices:", connectedResult.connectedDevices);
            
            // Map connected devices to our format
            const connectedDevices: CustomBluetoothDevice[] = connectedResult.connectedDevices.map((device: BluetoothDeviceResponse) => ({
              id: device.id,
              name: device.name || 'Unknown Device',
              mac: device.mac || device.id,
              connected: device.connected,
              paired: device.paired
            }));
            
            setDevices(connectedDevices);
            
            if (connectedResult.hasConnectedAudioDevice) {
              toast({
                title: "Audio Device Connected",
                description: `Found ${connectedDevices.length} connected Bluetooth device(s)`,
              });
            }
          }
        } catch (error) {
          console.error("Error checking connected devices:", error);
        }
      }
    };
    
    checkPiAndDevices();
  }, []);

  const scanBluetoothDevices = async () => {
    // Check if Pi is connected
    if (!piClient.isConnected()) {
      toast({
        title: "Pi Not Connected",
        description: "Please connect to your Smart Monitor Pi first to scan for Bluetooth devices",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      toast({
        title: "Bluetooth Scan Started",
        description: "Pi is searching for nearby Bluetooth devices...",
      });

      // Use Pi's Bluetooth scanning via direct API call
      const result = await piClient.scanBluetoothDevices();

      if (result.success && result.devices) {
        const bluetoothDevices: CustomBluetoothDevice[] = result.devices.map((device: { id: string; name?: string }) => ({
          id: device.id, // Use the ID from the response
          name: device.name || 'Unknown Device',
          mac: device.id, // The ID appears to be the MAC address
          connected: false, // Not provided in scan response
          paired: false // Not provided in scan response
        }));

        setDevices(bluetoothDevices);

        toast({
          title: "Bluetooth Scan Complete",
          description: `Found ${bluetoothDevices.length} devices`,
        });
      } else {
        throw new Error(result.error || 'Failed to scan for devices');
      }

    } catch (error: unknown) {
      console.error('Bluetooth scan error:', error);
      toast({
        title: "Scan Failed",
        description: `Could not scan for Bluetooth devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const connectToBluetoothDevice = async (device: CustomBluetoothDevice) => {
    try {
      toast({
        title: "Connecting...",
        description: `Connecting ${device.name} to Pi for audio output`,
      });

      // Use the onDeviceSelect callback to connect via Pi
      onDeviceSelect(device);

    } catch (error: unknown) {
      console.error('Bluetooth connection failed:', error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${device.name}`,
        variant: "destructive"
      });
    }
  };

  const disconnectBluetoothDevice = async (device: CustomBluetoothDevice, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    if (!piClient.isConnected()) {
      toast({
        title: "Pi Not Connected",
        description: "Please connect to your Smart Monitor Pi first",
        variant: "destructive"
      });
      return;
    }

    setDisconnectingDeviceId(device.id);

    try {
      toast({
        title: "Disconnecting...",
        description: `Disconnecting ${device.name} from Pi`,
      });

      const result = await piClient.disconnectSpecificBluetoothDevice(device.id);

      if (result.success) {
        // Update device state to disconnected
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === device.id 
              ? { ...d, connected: false }
              : d
          )
        );

        toast({
          title: "Disconnected",
          description: `${device.name} has been disconnected`,
        });
      } else {
        throw new Error(result.error || 'Failed to disconnect device');
      }

    } catch (error: unknown) {
      console.error('Bluetooth disconnection failed:', error);
      toast({
        title: "Disconnection Failed",
        description: `Could not disconnect ${device.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setDisconnectingDeviceId(null);
    }
  };

  const getDeviceIcon = (name?: string) => {
    if (!name) return '📶';
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('phone') || nameLower.includes('galaxy') || nameLower.includes('iphone')) return '📱';
    if (nameLower.includes('buds') || nameLower.includes('headphone') || nameLower.includes('speaker') || nameLower.includes('audio')) return '🎧';
    if (nameLower.includes('laptop') || nameLower.includes('computer') || nameLower.includes('pc')) return '💻';
    if (nameLower.includes('mouse') || nameLower.includes('keyboard')) return '⌨️';
    if (nameLower.includes('tablet') || nameLower.includes('ipad')) return '📱';
    if (nameLower.includes('watch')) return '⌚';
    if (nameLower.includes('controller') || nameLower.includes('gamepad')) return '🎮';
    
    return '📶';
  };

  if (!piConnected) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Pi Not Connected</p>
        <p className="text-xs">Connect to your Smart Monitor Pi first to scan for Bluetooth devices</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Bluetooth Audio Devices</h3>
          <p className="text-sm text-muted-foreground">
            Scan for Bluetooth devices via Pi
          </p>
        </div>
        <Button
          onClick={scanBluetoothDevices}
          disabled={isScanning}
          className="min-w-[120px]"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan via Pi
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {devices.map((device) => (
          <Card
            key={device.id}
            className="cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-muted/50"
            onClick={() => !device.connected && connectToBluetoothDevice(device)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getDeviceIcon(device.name)}</span>
                  <div>
                    <h4 className="font-medium text-sm">{device.name || 'Unknown Device'}</h4>
                    <p className="text-xs text-muted-foreground">MAC: {device.mac || device.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.connected ? (
                    <>
                      <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => disconnectBluetoothDevice(device, e)}
                        disabled={disconnectingDeviceId === device.id}
                        className="h-7 px-2 text-xs"
                      >
                        {disconnectingDeviceId === device.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Unplug className="h-3 w-3 mr-1" />
                            Disconnect
                          </>
                        )}
                      </Button>
                    </>
                  ) : device.paired ? (
                    <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Paired
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Available
                    </Badge>
                  )}
                  {isConnecting && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && !isScanning && (
        <div className="text-center py-8 text-muted-foreground">
          <Bluetooth className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No devices found</p>
          <p className="text-xs">Click "Scan via Pi" to discover Bluetooth devices</p>
        </div>
      )}
    </div>
  );
};
