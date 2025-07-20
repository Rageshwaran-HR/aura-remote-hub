import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, Camera, Music, Play, Square, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'stopped' | 'running' | 'loading';
  category: 'security' | 'entertainment' | 'productivity';
}

export const AppsLauncher: React.FC = () => {
  const [apps, setApps] = useState<App[]>([
    {
      id: 'cctv-viewer',
      name: 'CCTV Viewer',
      description: 'Monitor security cameras',
      icon: '📹',
      status: 'stopped',
      category: 'security'
    },
    {
      id: 'spotify-player',
      name: 'Spotify Player',
      description: 'Music streaming and mood control',
      icon: '🎵',
      status: 'stopped',
      category: 'entertainment'
    },
    {
      id: 'retro-games',
      name: 'Retro Games',
      description: 'Classic arcade games collection',
      icon: '👾',
      status: 'stopped',
      category: 'entertainment'
    },
    {
      id: 'dashboard',
      name: 'System Dashboard',
      description: 'Real-time system monitoring',
      icon: '📊',
      status: 'stopped',
      category: 'productivity'
    },
    {
      id: 'weather-app',
      name: 'Weather Station',
      description: 'Local weather and forecasts',
      icon: '🌤️',
      status: 'stopped',
      category: 'productivity'
    },
    {
      id: 'photo-slideshow',
      name: 'Photo Slideshow',
      description: 'Display personal photos',
      icon: '🖼️',
      status: 'stopped',
      category: 'entertainment'
    }
  ]);

  const startApp = async (appId: string) => {
    try {
      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'loading' } : app
      ));

      await axios.post('/api/apps/start', { appId });

      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'running' } : app
      ));

      const app = apps.find(a => a.id === appId);
      toast({
        title: "App Started",
        description: `${app?.name} is now running`,
      });
    } catch (error) {
      console.error('Failed to start app:', error);
      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'stopped' } : app
      ));
      toast({
        title: "Error",
        description: "Failed to start app",
        variant: "destructive"
      });
    }
  };

  const stopApp = async (appId: string) => {
    try {
      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'loading' } : app
      ));

      await axios.post('/api/apps/stop', { appId });

      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'stopped' } : app
      ));

      const app = apps.find(a => a.id === appId);
      toast({
        title: "App Stopped",
        description: `${app?.name} has been stopped`,
      });
    } catch (error) {
      console.error('Failed to stop app:', error);
      toast({
        title: "Error",
        description: "Failed to stop app",
        variant: "destructive"
      });
    }
  };

  const restartApp = async (appId: string) => {
    await stopApp(appId);
    setTimeout(() => startApp(appId), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary text-primary-foreground';
      case 'loading': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'border-destructive/50 bg-destructive/5';
      case 'entertainment': return 'border-primary/50 bg-primary/5';
      case 'productivity': return 'border-accent/50 bg-accent/5';
      default: return 'border-border bg-card';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Camera className="h-4 w-4" />;
      case 'entertainment': return <Music className="h-4 w-4" />;
      case 'productivity': return <Grid3X3 className="h-4 w-4" />;
      default: return <Grid3X3 className="h-4 w-4" />;
    }
  };

  const groupedApps = apps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, App[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedApps).map(([category, categoryApps]) => (
        <Card key={category} className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              {getCategoryIcon(category)}
              {category} Apps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {categoryApps.map((app) => (
                <Card
                  key={app.id}
                  className={`transition-all duration-200 hover:shadow-card ${getCategoryColor(app.category)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{app.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{app.name}</h3>
                            <Badge className={`text-xs ${getStatusColor(app.status)}`}>
                              {app.status === 'loading' && (
                                <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1"></div>
                              )}
                              {app.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {app.status === 'stopped' && (
                          <Button
                            size="sm"
                            onClick={() => startApp(app.id)}
                            className="bg-gradient-primary"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {app.status === 'running' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restartApp(app.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => stopApp(app.id)}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {app.status === 'loading' && (
                          <Button size="sm" disabled>
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};