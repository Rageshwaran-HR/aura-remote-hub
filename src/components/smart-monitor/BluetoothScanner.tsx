import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bluetooth, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CustomBluetoothDevice {
  id: string;
  name?: string;
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
  const [bluetoothSupported, setBluetoothSupported] = useState(true);

  const scanBluetoothDevices = async () => {
    if (!navigator.bluetooth) {
      setBluetoothSupported(false);
      toast({
        title: "Bluetooth Not Supported",
        description: "Web Bluetooth API is not supported in this browser",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      toast({
        title: "Bluetooth Scan Started",
        description: "Searching for nearby Bluetooth devices...",
      });

      // Request access to nearby Bluetooth devices
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'device_information']
      });

      if (device) {
        const bluetoothDevice: CustomBluetoothDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          connected: device.gatt?.connected || false,
          paired: false
        };

        setDevices([bluetoothDevice]);

        // Try to get additional device information
        if (device.gatt) {
          try {
            const server = await device.gatt.connect();
            bluetoothDevice.connected = true;
            setDevices([{ ...bluetoothDevice }]);
            
            // Disconnect after getting info
            server.disconnect();
            bluetoothDevice.connected = false;
            setDevices([{ ...bluetoothDevice }]);
          } catch (error) {
            console.log('Could not connect to get device info:', error);
          }
        }
      }

      toast({
        title: "Bluetooth Scan Complete",
        description: `Found ${devices.length} devices`,
      });

    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast({
          title: "No Devices Found",
          description: "No Bluetooth devices were selected",
        });
      } else if (error.name === 'SecurityError') {
        toast({
          title: "Permission Denied",
          description: "Bluetooth access was denied",
          variant: "destructive"
        });
      } else {
        console.error('Bluetooth scan failed:', error);
        toast({
          title: "Scan Failed",
          description: "Could not complete Bluetooth scan",
          variant: "destructive"
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  const connectToBluetoothDevice = async (device: CustomBluetoothDevice) => {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported');
      }

      toast({
        title: "Connecting...",
        description: `Connecting to ${device.name}`,
      });

      // Request the specific device again for connection
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: device.name }],
        optionalServices: ['generic_access', 'device_information']
      });

      if (bluetoothDevice.gatt) {
        const server = await bluetoothDevice.gatt.connect();
        
        // Update device connection status
        const updatedDevice = { ...device, connected: true };
        setDevices(prev => prev.map(d => d.id === device.id ? updatedDevice : d));
        
        onDeviceSelect(updatedDevice);

        toast({
          title: "Connected Successfully",
          description: `Connected to ${device.name}`,
        });
      }

    } catch (error: any) {
      console.error('Bluetooth connection failed:', error);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${device.name}`,
        variant: "destructive"
      });
    }
  };

  const getDeviceType = (deviceClass?: number) => {
    if (!deviceClass) return 'unknown';
    
    // Basic device class parsing
    const majorClass = (deviceClass >> 8) & 0x1F;
    
    switch (majorClass) {
      case 1: return 'computer';
      case 2: return 'phone';
      case 4: return 'audio';
      case 5: return 'peripheral';
      case 8: return 'toy';
      default: return 'unknown';
    }
  };

  const getDeviceIcon = (deviceClass?: number) => {
    const type = getDeviceType(deviceClass);
    
    switch (type) {
      case 'computer': return '💻';
      case 'phone': return '📱';
      case 'audio': return '🎧';
      case 'peripheral': return '⌨️';
      case 'toy': return '🎮';
      default: return '📶';
    }
  };

  if (!bluetoothSupported) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bluetooth className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Bluetooth not supported</p>
        <p className="text-xs">This browser doesn't support Web Bluetooth API</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Bluetooth Devices</h3>
          <p className="text-sm text-muted-foreground">
            Scan for nearby Bluetooth devices
          </p>
        </div>
        <Button
          onClick={scanBluetoothDevices}
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
              <Bluetooth className="h-4 w-4 mr-2" />
              Scan Bluetooth
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
                  <span className="text-lg">{getDeviceIcon(device.deviceClass)}</span>
                  <div>
                    <h4 className="font-medium text-sm">{device.name || 'Unknown Device'}</h4>
                    <p className="text-xs text-muted-foreground">ID: {device.id}</p>
                    {device.rssi && (
                      <p className="text-xs text-muted-foreground">Signal: {device.rssi} dBm</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.connected ? (
                    <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
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
          <p className="text-xs">Click "Scan Bluetooth" to discover devices</p>
        </div>
      )}
    </div>
  );
};