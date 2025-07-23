import React, { useState } from 'react';
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

  const [systemInfo] = useState({
    uptime: '15 days, 3 hours',
    temperature: 42,
    version: '2.1.4',
    memoryUsage: 68
  });

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
    localStorage.setItem('theme', newTheme);
  };

  // Apply theme on mount
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'wallpaper':
        return <WallpaperManager />;
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
      <Footer systemInfo={systemInfo} />
    </div>
  );
};