import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Wifi, Bluetooth, Settings, Monitor } from 'lucide-react';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  systemStatus: {
    connected: boolean;
    temperature: number;
    lastSeen: string;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isDarkMode, 
  onToggleTheme, 
  systemStatus 
}) => {
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
        <div className="flex items-center gap-4">
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