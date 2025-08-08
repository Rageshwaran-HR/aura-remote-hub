import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Image, 
  CheckSquare, 
  Gamepad2, 
  Grid3X3, 
  Settings,
  Wifi,
  Bluetooth,
  Moon,
  Sun
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { piClient } from '@/lib/piClient';
import { WallpaperManager } from './WallpaperManager';
import { SystemControls } from './SystemControls';
import { TodoManager } from './TodoManager';
import { GamesSection } from './GamesSection';
import { SettingsPanel } from './SettingsPanel';
import { CCTVViewer } from './CCTVViewer';
import { SpotifyControl } from './SpotifyControl';
import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';

interface NetworkDevice {
  id: string;
  name: string;
  type: 'raspberry-pi' | 'smart-tv' | 'computer';
  ip: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

interface PiWallpaper {
  id: string;
  fileName: string;
  displayName: string;
  size: string;
  resolution: string;
  category?: string;
  url?: string;
}

interface SystemInfo {
  uptime: string;
  temperature: number;
  version: string;
  memoryUsage: number;
  memory: { used: number; total: number };
  storage: { used: number; total: number };
  cpu: { usage: number; model: string };
  timestamp?: string;
}

type TabType = 'wallpaper' | 'system' | 'todo' | 'games' | 'cctv' | 'spotify' | 'settings';

const tabs = [
  { id: 'wallpaper', label: 'Wallpaper', icon: Image },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'todo', label: 'Tasks', icon: CheckSquare },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'cctv', label: 'CCTV', icon: Wifi },
  { id: 'spotify', label: 'Music', icon: Bluetooth },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export const SmartMonitorControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('wallpaper');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [systemStatus, setSystemStatus] = useState({
    connected: false,
    lastSeen: '2 seconds ago',
    temperature: 42,
    uptime: '15 days'
  });

  const [systemInfo, setSystemInfo] = useState({
    uptime: 'Loading...',
    temperature: 0,
    version: 'Loading...',
    memoryUsage: 0,
    memory: { used: 0, total: 0 },
    storage: { used: 0, total: 0 },
    cpu: { usage: 0, model: 'Loading...' }
  });

  const [wallpapers, setWallpapers] = useState<PiWallpaper[]>([]);
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
    localStorage.setItem('theme', newTheme);
  };

  // Fetch system information from the Pi
  const fetchSystemInfo = useCallback(async () => {
    if (isLoadingSystemInfo) return;
    
    setIsLoadingSystemInfo(true);
    try {
      console.log('📊 Checking Pi connection status...');
      
      // First check if backend server is reachable and Pi is connected
      let piConnected = false;
      
      if (!piClient.isConnected()) {
        console.log('🔗 Attempting to connect to backend...');
        const connected = await piClient.connect('192.168.234.180', 5000);
        if (!connected) {
          throw new Error('Backend server not reachable or Pi not connected');
        }
        piConnected = true;
      } else {
        // Already connected to backend, but check if Pi is still connected
        piConnected = await piClient.checkPiStatus();
        if (!piConnected) {
          throw new Error('Pi is not connected');
        }
      }

      console.log('📊 Fetching system info from Pi...');
      const response = await piClient.getSystemInfo();
      
      if (response?.success && response.data) {
        console.log('✅ System info received:', response.data);
        const systemData = response.data as SystemInfo;
        setSystemInfo(systemData);
        
        // Also update temperature in system status
        setSystemStatus(prev => ({
          ...prev,
          temperature: systemData.temperature,
          uptime: systemData.uptime,
          connected: true,
          lastSeen: 'Just now'
        }));
      } else {
        throw new Error(response?.error || 'Failed to fetch system info');
      }
    } catch (error) {
      console.error('❌ Error fetching system info:', error);
      
      // Update system status to show disconnected
      setSystemStatus(prev => ({
        ...prev,
        connected: false,
        lastSeen: 'Connection failed'
      }));
      
      toast({
        title: "System Info Error",
        description: `Failed to fetch system information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      
      // Mark as disconnected
      setSystemStatus(prev => ({
        ...prev,
        connected: false,
        lastSeen: 'Connection failed'
      }));
    } finally {
      setIsLoadingSystemInfo(false);
    }
  }, [isLoadingSystemInfo]);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Removed automatic system info fetching - now only fetched manually via footer button
  // useEffect(() => {
  //   fetchSystemInfo();
  //   const interval = setInterval(fetchSystemInfo, 30000);
  //   return () => clearInterval(interval);
  // }, [fetchSystemInfo]);

  const handleConnectionChange = (connected: boolean, device?: NetworkDevice) => {
    setSystemStatus(prev => ({
      ...prev,
      connected,
      lastSeen: connected ? 'Just now' : prev.lastSeen
    }));

    if (connected && device) {
      toast({
        title: "Device Connected",
        description: `Successfully connected to ${device.name}`,
      });
    }
  };

  const handleWallpapersUpdate = (newWallpapers: PiWallpaper[]) => {
    console.log('🎨 Updating wallpaper state:', newWallpapers);
    setWallpapers(newWallpapers);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'wallpaper':
        return <WallpaperManager piWallpapers={wallpapers} />;
      case 'system':
        return <SystemControls />;
      case 'todo':
        return <TodoManager />;
      case 'games':
        return <GamesSection />;
      case 'cctv':
        return <CCTVViewer />;
      case 'spotify':
        return <SpotifyControl />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <WallpaperManager />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <Navbar 
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        systemStatus={systemStatus}
        onConnectionChange={handleConnectionChange}
        onWallpapersUpdate={handleWallpapersUpdate}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {/* Tab Navigation */}
        <Card className="glass-card mb-6 animate-slide-in">
          <div className="p-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`min-w-[80px] h-20 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-primary shadow-neon text-primary-foreground scale-105' 
                        : 'hover:bg-muted/50 hover:scale-102'
                    }`}
                    onClick={() => setActiveTab(tab.id as TabType)}
                  >
                    <IconComponent className="h-6 w-6" />
                    <span className="text-xs font-medium leading-tight">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Content Area */}
        <div className="animate-fade-in">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <Footer 
        systemInfo={systemInfo} 
        onSystemInfoUpdate={(newSystemInfo) => {
          // Ensure all required properties are present with defaults
          const updatedSystemInfo = {
            uptime: newSystemInfo.uptime,
            temperature: newSystemInfo.temperature,
            version: newSystemInfo.version,
            memoryUsage: newSystemInfo.memoryUsage,
            memory: newSystemInfo.memory || { used: 0, total: 0 },
            storage: newSystemInfo.storage || { used: 0, total: 0 },
            cpu: newSystemInfo.cpu || { usage: 0, model: 'unknown' }
          };
          
          setSystemInfo(updatedSystemInfo);
          setSystemStatus(prev => ({
            ...prev,
            temperature: newSystemInfo.temperature,
            uptime: newSystemInfo.uptime,
            connected: true,
            lastSeen: 'Just now'
          }));
        }}
      />
    </div>
  );
};