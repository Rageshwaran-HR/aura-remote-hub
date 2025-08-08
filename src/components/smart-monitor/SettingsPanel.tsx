import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, Moon, Sun, Wifi, Bluetooth, Volume2, Monitor, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface SettingsPanelProps {
  systemInfo?: {
    version: string;
    uptime: string;
    storage: { used: number; total: number };
    memory: { used: number; total: number };
    temperature: number;
    cpu?: { usage: number; model: string };
  };
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  systemInfo: propSystemInfo 
}) => {
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('theme') || 'dark',
    autoSleep: true,
    sleepTime: [30],
    notifications: true,
    wifi: {
      enabled: true,
      connected: true,
      network: 'SmartHome_5G'
    },
    bluetooth: {
      enabled: true,
      connected: false
    },
    displayTimeout: [10],
    autoUpdate: true,
    ambientMode: true,
    gestureControls: false,
    voiceCommands: false
  });

  // System info state
  const [systemInfo, setSystemInfo] = useState(
    propSystemInfo || {
      version: '2.1.4',
      uptime: '15 days, 3 hours',
      storage: {
        used: 45,
        total: 128
      },
      memory: {
        used: 2.8,
        total: 8
      },
      temperature: 42
    }
  );

  // Track Pi connection status
  const [piConnected, setPiConnected] = useState(false); // Start as disconnected until verified

  // Poll Pi connection and system info every 1 minute
  React.useEffect(() => {
    const pollStatus = async () => {
      try {
        // Check Pi connection status
        const connRes = await axios.get('/api/pi/status');
        const isConnected = connRes.data.connected;
        setPiConnected(isConnected);

        // Only fetch system info if Pi is connected
        if (isConnected) {
          const sysRes = await axios.get('/api/system/info');
          if (sysRes.data.success) {
            setSystemInfo(sysRes.data);
          }
        }
      } catch (err) {
        // Handle error silently, no backend terminal printing
        setPiConnected(false);
      }
    };
    
    // Initial poll
    pollStatus();
    
    // Set up interval for every 1 minute
    const interval = setInterval(pollStatus, 60000); // 1 min
    
    return () => clearInterval(interval);
  }, []);

  const updateSetting = async (key: string, value: unknown) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      
      await axios.post('/api/settings/update', { [key]: value });
      
      toast({
        title: "Setting Updated",
        description: `${key} has been updated`,
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive"
      });
    }
  };

  const updateNestedSetting = async (parent: keyof typeof settings, key: string, value: unknown) => {
    try {
      setSettings(prev => {
        const parentSetting = prev[parent as keyof typeof prev] as typeof settings[keyof typeof settings];
        return {
          ...prev,
          [parent]: typeof parentSetting === 'object' && parentSetting !== null 
            ? { ...parentSetting, [key]: value } 
            : { [key]: value }
        };
      });
      
      await axios.post('/api/settings/update', { [parent]: { [key]: value } });
      
      toast({
        title: "Setting Updated",
        description: `${parent} ${key} has been updated`,
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive"
      });
    }
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', newTheme);
    
    // Apply theme immediately to document
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };

  const restartSystem = async () => {
    try {
      await axios.post('/api/system/restart');
      toast({
        title: "Restarting System",
        description: "Smart monitor will restart in a few seconds",
      });
    } catch (error) {
      console.error('Failed to restart system:', error);
      toast({
        title: "Error",
        description: "Failed to restart system",
        variant: "destructive"
      });
    }
  };

  const resetSettings = async () => {
    try {
      await axios.post('/api/settings/reset');
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to defaults",
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <label className="text-sm font-medium">Dark Mode</label>
            </div>
            <Switch
              checked={settings.theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Display Timeout</label>
              <span className="text-sm text-muted-foreground">{settings.displayTimeout[0]} min</span>
            </div>
            <Slider
              value={settings.displayTimeout}
              onValueChange={(value) => updateSetting('displayTimeout', value)}
              max={60}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Ambient Mode</label>
            <Switch
              checked={settings.ambientMode}
              onCheckedChange={(checked) => updateSetting('ambientMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <label className="text-sm font-medium">Pi Connection</label>
              </div>
              <Badge variant={piConnected ? "default" : "secondary"}>
                {piConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <label className="text-sm font-medium">Wi-Fi</label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.wifi.connected ? "default" : "secondary"}>
                  {settings.wifi.connected ? settings.wifi.network : 'Disconnected'}
                </Badge>
                <Switch
                  checked={settings.wifi.enabled}
                  onCheckedChange={(checked) => updateNestedSetting('wifi', 'enabled', checked)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className="h-4 w-4" />
                <label className="text-sm font-medium">Bluetooth</label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.bluetooth.connected ? "default" : "secondary"}>
                  {settings.bluetooth.connected ? 'Connected' : 'Available'}
                </Badge>
                <Switch
                  checked={settings.bluetooth.enabled}
                  onCheckedChange={(checked) => updateNestedSetting('bluetooth', 'enabled', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto Updates</label>
            <Switch
              checked={settings.autoUpdate}
              onCheckedChange={(checked) => updateSetting('autoUpdate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Notifications</label>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSetting('notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Gesture Controls</label>
            <Switch
              checked={settings.gestureControls}
              onCheckedChange={(checked) => updateSetting('gestureControls', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Voice Commands</label>
            <Switch
              checked={settings.voiceCommands}
              onCheckedChange={(checked) => updateSetting('voiceCommands', checked)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto Sleep</label>
              <Switch
                checked={settings.autoSleep}
                onCheckedChange={(checked) => updateSetting('autoSleep', checked)}
              />
            </div>
            {settings.autoSleep && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sleep after</span>
                  <span className="text-sm text-muted-foreground">{settings.sleepTime[0]} min</span>
                </div>
                <Slider
                  value={settings.sleepTime}
                  onValueChange={(value) => updateSetting('sleepTime', value)}
                  max={120}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Version:</span>
              <p className="font-medium">{systemInfo.version}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Uptime:</span>
              <p className="font-medium">{systemInfo.uptime}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Temperature:</span>
              <p className="font-medium">{systemInfo.temperature}°C</p>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <p className="font-medium">{systemInfo.memory.used}GB / {systemInfo.memory.total}GB</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage</span>
              <span>{systemInfo.storage.used}GB / {systemInfo.storage.total}GB</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(systemInfo.storage.used / systemInfo.storage.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={restartSystem}
              className="h-12"
            >
              Restart System
            </Button>
            <Button
              variant="destructive"
              onClick={resetSettings}
              className="h-12"
            >
              Reset Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};