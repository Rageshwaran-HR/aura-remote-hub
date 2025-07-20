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
  Bluetooth
} from 'lucide-react';
import { WallpaperManager } from './WallpaperManager';
import { SystemControls } from './SystemControls';
import { TodoManager } from './TodoManager';
import { GamesSection } from './GamesSection';
import { AppsLauncher } from './AppsLauncher';
import { SettingsPanel } from './SettingsPanel';

type TabType = 'wallpaper' | 'system' | 'todo' | 'games' | 'apps' | 'settings';

const tabs = [
  { id: 'wallpaper', label: 'Wallpaper', icon: Image },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'todo', label: 'Tasks', icon: CheckSquare },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'apps', label: 'Apps', icon: Grid3X3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export const SmartMonitorControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('wallpaper');
  const [systemStatus] = useState({
    connected: true,
    lastSeen: '2 seconds ago',
    temperature: 42,
    uptime: '15 days'
  });

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
      case 'apps':
        return <AppsLauncher />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <WallpaperManager />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      {/* Header */}
      <Card className="glass-card mb-6 animate-slide-in">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Smart Monitor
            </h1>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" />
              <Bluetooth className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.connected ? 'bg-primary animate-glow-pulse' : 'bg-destructive'}`}></div>
              <span className="text-sm text-muted-foreground">
                {systemStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{systemStatus.temperature}°C</span>
              <span>{systemStatus.lastSeen}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <Card className="glass-card mb-6 animate-slide-in">
        <div className="p-2">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`h-16 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-primary shadow-neon text-primary-foreground' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Content Area */}
      <div className="animate-slide-in">
        {renderContent()}
      </div>

      {/* Quick Status Footer */}
      <Card className="glass-card mt-6 animate-slide-in">
        <div className="p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                Uptime: {systemStatus.uptime}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Temp: {systemStatus.temperature}°C
              </Badge>
            </div>
            <span className="text-muted-foreground">
              Smart Monitor Control v2.1.4
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};