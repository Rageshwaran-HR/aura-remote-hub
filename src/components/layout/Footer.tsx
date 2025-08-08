import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, HardDrive, Thermometer, Clock, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface Wallpaper {
  id: string;
  displayName: string;
  category: string;
  size: string;
  url: string;
}

interface FooterProps {
  systemInfo: {
    uptime: string;
    temperature: number;
    version: string;
    memoryUsage: number;
    memory?: { used: number; total: number };
    storage?: { used: number; total: number };
    cpu?: { usage: number; model: string };
    wallpapers?: {
      totalCount: number;
      totalSize: string;
      available: boolean;
    };
  };
  onSystemInfoUpdate?: (systemInfo: FooterProps['systemInfo']) => void;
  onWallpapersUpdate?: (wallpapers: Wallpaper[]) => void;
}

export const Footer: React.FC<FooterProps> = ({ systemInfo, onSystemInfoUpdate, onWallpapersUpdate }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to format uptime from seconds to readable format
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'less than a minute';
  };

  // Fetch wallpaper details from Pi
  const fetchWallpapers = async () => {
    try {
      console.log('🎯 Fetching wallpaper details from Pi...');
      const response = await axios.get('/api/wallpapers');
      
      if (response.data.wallpapers) {
        console.log('✅ Wallpapers fetched successfully:', response.data);
        onWallpapersUpdate?.(response.data.wallpapers);
        
        toast({
          title: "Wallpapers Loaded",
          description: `Found ${response.data.totalCount} wallpapers (${response.data.totalSize})`,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching wallpapers:', error);
      toast({
        title: "Wallpaper Error",
        description: "Failed to load wallpaper details from Pi",
        variant: "destructive"
      });
    }
  };

  const fetchSystemInfo = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      console.log('🔄 Manually fetching system information...');
      console.log('🌐 Making request to: /api/system/info');
      
      // Directly fetch system info - the backend will handle Pi connection checking
      const response = await axios.get('/api/system/info');
      console.log('📡 Response received:', response.status, response.data);
      
      if (response.data.success) {
        console.log('✅ System info fetched successfully:', response.data);
        
        // Log the system object to see its structure
        console.log('System object details:', response.data.system);
        
        // Extract and transform system info from the nested system property
        const rawSystemInfo = response.data.system || response.data;
        
        // Transform the raw data to match our interface
        const transformedSystemInfo = {
          uptime: rawSystemInfo.uptime || 'unknown',
          temperature: rawSystemInfo.temperature || 0,
          version: rawSystemInfo.version || rawSystemInfo.platform || 'unknown',
          memoryUsage: rawSystemInfo.memoryUsage || 0,
          memory: rawSystemInfo.memory || undefined,
          storage: rawSystemInfo.storage || undefined,
          cpu: rawSystemInfo.cpu || undefined,
          wallpapers: rawSystemInfo.wallpapers || undefined
        };
        
        console.log('Transformed system info:', transformedSystemInfo);
        onSystemInfoUpdate?.(transformedSystemInfo);
        
        // Auto-fetch wallpapers when Pi connection is confirmed
        if (rawSystemInfo.wallpapers?.available || rawSystemInfo.wallpapers?.totalCount > 0) {
          console.log('🎯 Pi has wallpapers available, fetching details...');
          await fetchWallpapers();
        }
        
        toast({
          title: "System Info Updated",
          description: "Fresh system information has been fetched from Pi",
        });
      } else {
        console.log('❌ Response indicates failure:', response.data);
        throw new Error(response.data.error || 'Failed to fetch system info');
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching system info:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Check if it's an axios error
      const axiosError = error as { response?: { status?: number; data?: unknown; headers?: unknown }; request?: unknown; message?: string; code?: string };
      if (axiosError.response) {
        console.error('Response status:', axiosError.response.status);
        console.error('Response data:', axiosError.response.data);
        console.error('Response headers:', axiosError.response.headers);
      } else if (axiosError.request) {
        console.error('Request made but no response received:', axiosError.request);
      } else {
        console.error('Error setting up request:', axiosError.message);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const responseError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const networkError = axiosError?.code === 'NETWORK_ERROR' || axiosError?.message?.includes('Network Error');
      
      toast({
        title: "Error",
        description: networkError 
          ? "Cannot connect to backend server. Please check if the server is running." 
          : responseError || errorMessage || "Failed to fetch system info",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    v{systemInfo.version}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={fetchSystemInfo}
                    disabled={isRefreshing}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchSystemInfo}
                  disabled={isRefreshing}
                  className="h-8 px-3"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Updating...' : 'Refresh System Info'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </footer>
  );
};