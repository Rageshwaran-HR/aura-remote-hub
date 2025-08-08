import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Monitor, Volume2, Power, RotateCcw, VolumeX, Sun } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

export const SystemControls: React.FC = () => {
  const [brightness, setBrightness] = useState([75]);
  const [volume, setVolume] = useState([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [screenOn, setScreenOn] = useState(true);

  useEffect(() => {
    // Load initial system state
    loadSystemState();
  }, []);

  const loadSystemState = async () => {
    try {
      console.log('📊 Loading initial system state from Pi...');
      const response = await axios.get('/api/system/status');
      if (response.data.success) {
        setBrightness([response.data.brightness || 75]);
        setVolume([response.data.volume || 50]);
        setIsMuted(response.data.muted || false);
        setScreenOn(response.data.screenOn !== false);
        console.log('✅ System state loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load system state:', error);
      toast({
        title: "Connection Error",
        description: "Cannot load system state from Pi. Using defaults.",
        variant: "destructive"
      });
    }
  };

  const updateBrightness = async (value: number[]) => {
    setBrightness(value);
    try {
      await axios.post('/api/system/brightness', { level: value[0] });
      toast({
        title: "Brightness Updated",
        description: `Screen brightness set to ${value[0]}%`,
      });
    } catch (error) {
      console.error('Failed to update brightness:', error);
      toast({
        title: "Error",
        description: "Failed to update brightness",
        variant: "destructive"
      });
    }
  };

  const updateVolume = async (value: number[]) => {
    const newVolume = value[0];
    setVolume(value);
    if (isMuted) setIsMuted(false);
    
    try {
      console.log(`🔊 Setting volume to ${newVolume}%`);
      const response = await axios.post('/api/system/volume', { 
        level: newVolume, 
        muted: false 
      });
      
      if (response.data.success) {
        toast({
          title: "Volume Updated",
          description: `Volume set to ${newVolume}%`,
        });
      } else {
        throw new Error(response.data.error || 'Failed to set volume');
      }
    } catch (error) {
      console.error('Failed to update volume:', error);
      toast({
        title: "Volume Control Error",
        description: "Failed to update volume on Pi. Check connection.",
        variant: "destructive"
      });
      // Revert the UI state on error
      try {
        const statusResponse = await axios.get('/api/system/status');
        if (statusResponse.data.success) {
          setVolume([statusResponse.data.volume]);
          setIsMuted(statusResponse.data.muted);
        }
      } catch (statusError) {
        console.error('Failed to get current status:', statusError);
      }
    }
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    try {
      console.log(`🔇 ${newMuted ? 'Muting' : 'Unmuting'} audio`);
      const response = await axios.post('/api/system/volume', { 
        level: volume[0], 
        muted: newMuted 
      });
      
      if (response.data.success) {
        toast({
          title: newMuted ? "Muted" : "Unmuted",
          description: newMuted ? "Audio muted" : "Audio restored",
        });
      } else {
        throw new Error(response.data.error || 'Failed to toggle mute');
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      // Revert the UI state on error
      setIsMuted(!newMuted);
      toast({
        title: "Mute Control Error",
        description: "Failed to toggle mute on Pi. Check connection.",
        variant: "destructive"
      });
    }
  };

  const toggleScreen = async () => {
    const newScreenState = !screenOn;
    setScreenOn(newScreenState);
    
    try {
      await axios.post('/api/system/screen', { on: newScreenState });
      toast({
        title: newScreenState ? "Screen On" : "Screen Off",
        description: newScreenState ? "Monitor turned on" : "Monitor turned off",
      });
    } catch (error) {
      console.error('Failed to toggle screen:', error);
      toast({
        title: "Error",
        description: "Failed to toggle screen",
        variant: "destructive"
      });
    }
  };

  const shutdownSystem = async () => {
    try {
      await axios.post('/api/system/shutdown');
      toast({
        title: "Shutting Down",
        description: "System shutdown initiated",
      });
    } catch (error) {
      console.error('Failed to shutdown system:', error);
      toast({
        title: "Error",
        description: "Failed to shutdown system",
        variant: "destructive"
      });
    }
  };

  const rebootSystem = async () => {
    try {
      await axios.post('/api/system/reboot');
      toast({
        title: "Rebooting",
        description: "System reboot initiated",
      });
    } catch (error) {
      console.error('Failed to reboot system:', error);
      toast({
        title: "Error",
        description: "Failed to reboot system",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5 text-primary" />
            Display Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Screen Power</label>
              <Switch
                checked={screenOn}
                onCheckedChange={toggleScreen}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Brightness
              </label>
              <span className="text-sm text-muted-foreground">{brightness[0]}%</span>
            </div>
            <Slider
              value={brightness}
              onValueChange={updateBrightness}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5 text-primary" />
            Audio Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                Volume
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {isMuted ? 'Muted' : `${volume[0]}%`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className="h-8 px-3"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Slider
              value={volume}
              onValueChange={updateVolume}
              max={100}
              min={0}
              step={5}
              className="w-full"
              disabled={isMuted}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Power className="h-5 w-5 text-primary" />
            System Power
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-12">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reboot
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reboot System</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reboot the smart monitor? This will restart all running applications.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={rebootSystem}>Reboot</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-12">
                  <Power className="h-4 w-4 mr-2" />
                  Shutdown
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Shutdown System</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to shutdown the smart monitor? You'll need to physically power it back on.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={shutdownSystem}>Shutdown</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};