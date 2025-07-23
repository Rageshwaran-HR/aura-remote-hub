import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Cpu, HardDrive, Thermometer, Clock } from 'lucide-react';

interface FooterProps {
  systemInfo: {
    uptime: string;
    temperature: number;
    version: string;
    memoryUsage: number;
  };
}

export const Footer: React.FC<FooterProps> = ({ systemInfo }) => {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="px-4 py-3">
        <Card className="glass-card">
          <div className="p-3">
            {/* Mobile Layout */}
            <div className="flex flex-col gap-3 sm:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Uptime: {systemInfo.uptime}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Thermometer className="h-3 w-3 mr-1" />
                  {systemInfo.temperature}°C
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Memory: {systemInfo.memoryUsage}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  v{systemInfo.version}
                </span>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Uptime: {systemInfo.uptime}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Memory: {systemInfo.memoryUsage}%
                  </span>
                </div>
                
                <Badge variant="secondary" className="text-sm">
                  <Thermometer className="h-3 w-3 mr-1" />
                  {systemInfo.temperature}°C
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Smart Monitor Control Panel
                </span>
                <span className="text-sm text-muted-foreground">
                  v{systemInfo.version}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </footer>
  );
};