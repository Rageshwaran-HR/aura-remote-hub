import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  Heart,
  Music,
  Radio
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export const SpotifyControl: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [currentTrack] = useState({
    title: "Synthwave Dreams",
    artist: "Electric Nights",
    album: "Neon Futures",
    duration: "3:42",
    progress: "1:23"
  });
  const { toast } = useToast();

  const handlePlayPause = async () => {
    try {
      const action = isPlaying ? 'pause' : 'play';
      await axios.post('/api/spotify/playback', { action });
      setIsPlaying(!isPlaying);
      toast({
        title: `Music ${action}d`,
        description: `Spotify playback ${action}d successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to control Spotify playback.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      await axios.post('/api/spotify/skip', { direction });
      toast({
        title: `Skipped ${direction === 'next' ? 'Forward' : 'Back'}`,
        description: `Moved to ${direction} track.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to skip track.",
        variant: "destructive",
      });
    }
  };

  const handleVolumeChange = async (newVolume: number[]) => {
    try {
      setVolume(newVolume);
      await axios.post('/api/spotify/volume', { volume: newVolume[0] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust volume.",
        variant: "destructive",
      });
    }
  };

  const toggleShuffle = async () => {
    try {
      const newShuffle = !shuffle;
      setShuffle(newShuffle);
      await axios.post('/api/spotify/shuffle', { enabled: newShuffle });
      toast({
        title: newShuffle ? "Shuffle Enabled" : "Shuffle Disabled",
        description: `Playlist shuffle ${newShuffle ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle shuffle.",
        variant: "destructive",
      });
    }
  };

  const toggleRepeat = async () => {
    try {
      const newRepeat = !repeat;
      setRepeat(newRepeat);
      await axios.post('/api/spotify/repeat', { enabled: newRepeat });
      toast({
        title: newRepeat ? "Repeat Enabled" : "Repeat Disabled",
        description: `Track repeat ${newRepeat ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle repeat.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="glass-card animate-slide-in">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Spotify Control
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-glow-pulse' : 'bg-destructive'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Now Playing */}
      <Card className="glass-card animate-slide-in">
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{currentTrack.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
              <p className="text-xs text-muted-foreground">{currentTrack.album}</p>
            </div>
            <Button variant="ghost" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="w-full bg-muted rounded-full h-1">
              <div className="bg-gradient-primary h-1 rounded-full" style={{ width: '35%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentTrack.progress}</span>
              <span>{currentTrack.duration}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShuffle}
              className={shuffle ? 'text-primary' : ''}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleSkip('previous')}>
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-gradient-primary shadow-neon"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleSkip('next')}>
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRepeat}
              className={repeat ? 'text-primary' : ''}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-10 text-right">
              {volume[0]}%
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card animate-slide-in">
        <div className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Radio
            </Button>
            <Button variant="outline" className="h-12 flex items-center gap-2">
              <Music className="h-4 w-4" />
              Playlists
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      {isPlaying && (
        <Card className="glass-card animate-slide-in border-primary/50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-medium text-primary">Now Playing</p>
                <p className="text-xs text-muted-foreground">Playing from Smart Monitor</p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                LIVE
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};