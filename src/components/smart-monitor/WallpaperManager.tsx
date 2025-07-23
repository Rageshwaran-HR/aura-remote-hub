import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Upload, Clock, Moon, Sun, Palette, Play, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

type WallpaperMode = 'morning' | 'night' | 'custom' | 'dynamic';

interface Wallpaper {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  isActive: boolean;
}

export const WallpaperManager: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<WallpaperMode>('custom');
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([
    {
      id: '1',
      name: 'Cosmic Nebula',
      type: 'image',
      url: '/api/wallpapers/cosmic-nebula.jpg',
      thumbnail: '🌌',
      isActive: true
    },
    {
      id: '2',
      name: 'Matrix Rain',
      type: 'video',
      url: '/api/wallpapers/matrix-rain.mp4',
      thumbnail: '🔢',
      isActive: false
    },
    {
      id: '3',
      name: 'Ocean Waves',
      type: 'video',
      url: '/api/wallpapers/ocean-waves.mp4',
      thumbnail: '🌊',
      isActive: false
    }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const changeMode = async (mode: WallpaperMode) => {
    setCurrentMode(mode);
    
    try {
      await axios.post('/api/wallpaper/mode', { mode });
      
      toast({
        title: "Wallpaper Mode Changed",
        description: `Switched to ${mode} mode`,
      });
    } catch (error) {
      console.error('Failed to change wallpaper mode:', error);
      toast({
        title: "Error",
        description: "Failed to change wallpaper mode",
        variant: "destructive"
      });
    }
  };

  const setActiveWallpaper = async (wallpaperId: string) => {
    try {
      setWallpapers(prev => prev.map(w => ({
        ...w,
        isActive: w.id === wallpaperId
      })));

      await axios.post('/api/wallpaper/set', { wallpaperId });
      
      const wallpaper = wallpapers.find(w => w.id === wallpaperId);
      toast({
        title: "Wallpaper Changed",
        description: `Now displaying: ${wallpaper?.name}`,
      });
    } catch (error) {
      console.error('Failed to set wallpaper:', error);
      toast({
        title: "Error",
        description: "Failed to set wallpaper",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast({
        title: "Invalid File",
        description: "Please select an image or video file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', isVideo ? 'video' : 'image');

      const response = await axios.post('/api/wallpaper/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newWallpaper: Wallpaper = {
        id: response.data.id,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url: response.data.url,
        thumbnail: isVideo ? '🎬' : '🖼️',
        isActive: false
      };

      setWallpapers(prev => [...prev, newWallpaper]);
      
      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error) {
      console.error('Failed to upload wallpaper:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload wallpaper",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteWallpaper = async (wallpaperId: string) => {
    try {
      await axios.delete(`/api/wallpaper/${wallpaperId}`);
      
      setWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
      
      toast({
        title: "Wallpaper Deleted",
        description: "Wallpaper removed successfully",
      });
    } catch (error) {
      console.error('Failed to delete wallpaper:', error);
      toast({
        title: "Error",
        description: "Failed to delete wallpaper",
        variant: "destructive"
      });
    }
  };

  const getModeIcon = (mode: WallpaperMode) => {
    switch (mode) {
      case 'morning': return <Sun className="h-4 w-4" />;
      case 'night': return <Moon className="h-4 w-4" />;
      case 'dynamic': return <Clock className="h-4 w-4" />;
      default: return <Palette className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5 text-primary" />
            Wallpaper Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(['morning', 'night', 'dynamic', 'custom'] as WallpaperMode[]).map((mode) => (
              <Button
                key={mode}
                variant={currentMode === mode ? "default" : "outline"}
                className={`h-12 transition-all duration-300 ${
                  currentMode === mode 
                    ? 'bg-gradient-primary shadow-neon scale-105' 
                    : 'hover:scale-102 hover:border-primary/50'
                }`}
                onClick={() => changeMode(mode)}
              >
                {getModeIcon(mode)}
                <span className="ml-2 capitalize font-medium">{mode}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Upload Wallpaper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-12 bg-gradient-primary hover:opacity-90 font-medium"
              variant="default"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Choose Image/Video'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Supports: JPG, PNG, GIF, MP4, WebM (Max 50MB)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Wallpaper Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {wallpapers.map((wallpaper) => (
              <div
                key={wallpaper.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                  wallpaper.isActive 
                    ? 'border-primary bg-primary/10 shadow-neon' 
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{wallpaper.thumbnail}</div>
                  <div>
                    <h4 className="font-medium text-sm">{wallpaper.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {wallpaper.type}
                      </Badge>
                      {wallpaper.isActive && (
                        <Badge className="text-xs bg-gradient-primary">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {wallpaper.type === 'video' && (
                    <Button size="sm" variant="outline">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {!wallpaper.isActive && (
                    <Button
                      size="sm"
                      onClick={() => setActiveWallpaper(wallpaper.id)}
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteWallpaper(wallpaper.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};