import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Video, 
  VideoOff, 
  Maximize, 
  RotateCcw,
  Settings,
  Eye,
  EyeOff,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export const CCTVViewer: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [nightVision, setNightVision] = useState(false);
  const [motionDetection, setMotionDetection] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const { toast } = useToast();

  const handleStartStop = async () => {
    try {
      const action = isRecording ? 'stop' : 'start';
      await axios.post('/api/cctv/recording', { action });
      setIsRecording(!isRecording);
      toast({
        title: `Recording ${action}ed`,
        description: `CCTV recording has been ${action}ed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to control CCTV recording.",
        variant: "destructive",
      });
    }
  };

  const handleNightVision = async (enabled: boolean) => {
    try {
      await axios.post('/api/cctv/night-vision', { enabled });
      setNightVision(enabled);
      toast({
        title: enabled ? "Night Vision Enabled" : "Night Vision Disabled",
        description: `CCTV night vision ${enabled ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle night vision.",
        variant: "destructive",
      });
    }
  };

  const handleMotionDetection = async (enabled: boolean) => {
    try {
      await axios.post('/api/cctv/motion-detection', { enabled });
      setMotionDetection(enabled);
      toast({
        title: enabled ? "Motion Detection Enabled" : "Motion Detection Disabled",
        description: `Motion detection ${enabled ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle motion detection.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="glass-card animate-slide-in">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">CCTV System</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-glow-pulse' : 'bg-destructive'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Live View Placeholder */}
          <div className="bg-muted/20 rounded-lg p-8 mb-4 flex items-center justify-center border border-border/50">
            <div className="text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Live Camera Feed</p>
              <p className="text-xs text-muted-foreground">1920x1080 • 30fps</p>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleStartStop}
              variant={isRecording ? "destructive" : "default"}
              className="h-12 flex items-center gap-2"
            >
              {isRecording ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>

            <Button variant="outline" className="h-12 flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Fullscreen
            </Button>
          </div>
        </div>
      </Card>

      {/* Settings Card */}
      <Card className="glass-card animate-slide-in">
        <div className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Camera Settings
          </h3>

          <div className="space-y-4">
            {/* Night Vision */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {nightVision ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="text-sm font-medium">Night Vision</span>
              </div>
              <Switch
                checked={nightVision}
                onCheckedChange={handleNightVision}
              />
            </div>

            {/* Motion Detection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm font-medium">Motion Detection</span>
              </div>
              <Switch
                checked={motionDetection}
                onCheckedChange={handleMotionDetection}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Recording Status */}
      {isRecording && (
        <Card className="glass-card animate-slide-in border-primary/50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-medium text-destructive">Recording Active</p>
                <p className="text-xs text-muted-foreground">Started 5 minutes ago</p>
              </div>
              <Badge variant="destructive" className="ml-auto">
                REC
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};