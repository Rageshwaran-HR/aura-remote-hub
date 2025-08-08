import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Upload, Clock, Moon, Sun, Palette, Play, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { piClient } from '@/lib/piClient';
import axios from 'axios';

type WallpaperMode = 'morning' | 'night' | 'custom' | 'dynamic';

interface Wallpaper {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  isActive: boolean;
  // Add Pi-specific properties
  size?: string;
  resolution?: string;
  fileName?: string;
}

interface PiWallpaper {
  id: string;
  fileName: string;
  displayName: string;
  size: string;
  resolution: string;
  category?: string;
  url?: string;
  isActive?: boolean;
  path?: string;
}

interface WallpaperManagerProps {
  piWallpapers?: PiWallpaper[];
}

export const WallpaperManager: React.FC<WallpaperManagerProps> = ({ piWallpapers = [] }) => {
  const [currentMode, setCurrentMode] = useState<WallpaperMode>('custom');
  
  // Generate thumbnail emoji based on wallpaper name
  const getWallpaperThumbnail = useCallback((displayName: string): string => {
    const name = displayName.toLowerCase();
    if (name.includes('anime')) return '🎌';
    if (name.includes('cat')) return '🐱';
    if (name.includes('forest')) return '🌲';
    if (name.includes('star')) return '⭐';
    if (name.includes('sun')) return '☀️';
    if (name.includes('night')) return '🌙';
    if (name.includes('ocean') || name.includes('wave')) return '🌊';
    if (name.includes('rain')) return '🌧️';
    return '🎨'; // Default thumbnail
  }, []);
  
  // Convert Pi wallpapers to component format, with fallback to static data
  const convertPiWallpapers = useCallback((piWallpapers: PiWallpaper[]): Wallpaper[] => {
    if (piWallpapers.length === 0) {
      // Return static fallback data if no Pi wallpapers
      return [
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
      ];
    }
    
    return piWallpapers.map((piWallpaper, index) => ({
      id: piWallpaper.id,
      name: piWallpaper.displayName,
      type: piWallpaper.fileName.endsWith('.mp4') ? 'video' as const : 'image' as const,
      url: piWallpaper.url || `http://localhost:3000/wallpapers/${piWallpaper.fileName}`,
      thumbnail: getWallpaperThumbnail(piWallpaper.displayName),
      isActive: piWallpaper.isActive || false, // Use server's isActive status
      // Include Pi-specific data
      size: piWallpaper.size,
      resolution: piWallpaper.resolution,
      fileName: piWallpaper.fileName
    }));
  }, [getWallpaperThumbnail]);
  
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(() => convertPiWallpapers(piWallpapers));
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update wallpapers when piWallpapers prop changes
  useEffect(() => {
    console.log('🔄 Updating wallpapers from Pi data:', piWallpapers);
    const updatedWallpapers = convertPiWallpapers(piWallpapers);
    console.log('🎨 Converted wallpapers with active status:', updatedWallpapers.map(w => ({ id: w.id, name: w.name, isActive: w.isActive })));
    setWallpapers(updatedWallpapers);
  }, [piWallpapers, convertPiWallpapers]);

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
      const selectedWallpaper = wallpapers.find(w => w.id === wallpaperId);
      
      if (!selectedWallpaper) {
        console.error('❌ Wallpaper not found:', wallpaperId);
        return;
      }

      console.log('🎨 Setting active wallpaper request:', {
        wallpaperId: selectedWallpaper.id,
        fileName: selectedWallpaper.fileName,
        displayName: selectedWallpaper.name,
        url: selectedWallpaper.url,
        type: selectedWallpaper.type,
        resolution: selectedWallpaper.resolution,
        size: selectedWallpaper.size
      });

      // Update UI optimistically
      setWallpapers(prev => prev.map(w => ({
        ...w,
        isActive: w.id === wallpaperId
      })));

      // Check if Pi is connected
      if (!piClient.isConnected()) {
        throw new Error('Pi not connected. Please connect to your Smart Monitor Pi first.');
      }

      // Send request to Pi backend to change wallpaper
      const changeResult = await piClient.setWallpaper(selectedWallpaper.id, {
        fileName: selectedWallpaper.fileName || `${selectedWallpaper.id}.mp4`,
        displayName: selectedWallpaper.name
      });

      console.log('📤 Wallpaper change request sent to Pi backend:', changeResult);

      if (changeResult && changeResult.success) {
        console.log('✅ Wallpaper changed successfully on Pi:', selectedWallpaper.name);
        toast({
          title: "Wallpaper Changed 🎨",
          description: `Now displaying: ${selectedWallpaper.name}`,
        });
      } else {
        throw new Error(changeResult?.error || 'Failed to change wallpaper on Pi');
      }
      
    } catch (error) {
      console.error('❌ Failed to set wallpaper:', error);
      
      // Revert UI changes on error
      setWallpapers(prev => prev.map(w => ({
        ...w,
        isActive: piWallpapers.find(pw => pw.id === w.id)?.isActive || false
      })));
      
      toast({
        title: "Wallpaper Change Failed",
        description: `Failed to change wallpaper: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        <CardContent className="p-4">
          <div className="space-y-3">
            {wallpapers.map((wallpaper) => (
              <div
                key={wallpaper.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                  wallpaper.isActive 
                    ? 'border-primary bg-primary/10 shadow-neon' 
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-xl flex-shrink-0 mt-0.5">{wallpaper.thumbnail}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate mb-2">{wallpaper.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {wallpaper.type}
                      </Badge>
                      {wallpaper.size && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {wallpaper.size}
                        </Badge>
                      )}
                      {wallpaper.resolution && wallpaper.resolution !== 'Unknown' && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {wallpaper.resolution}
                        </Badge>
                      )}
                      {wallpaper.isActive && (
                        <Badge className="text-xs bg-gradient-primary px-2 py-0.5">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {wallpaper.type === 'video' && (
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  {!wallpaper.isActive && (
                    <Button
                      size="sm"
                      onClick={() => setActiveWallpaper(wallpaper.id)}
                      className="h-7 px-2 text-xs whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Set Active</span>
                      <span className="sm:hidden">Set</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteWallpaper(wallpaper.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
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