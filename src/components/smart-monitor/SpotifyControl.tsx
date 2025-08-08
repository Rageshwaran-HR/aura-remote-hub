import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  Radio,
  ExternalLink,
  RefreshCw,
  Wifi,
  WifiOff,
  Cast
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { User } from "lucide-react";

// Set Axios base URL to ensure requests target the correct backend port
axios.defaults.baseURL = 'http://localhost:5000';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration: number;
  image: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  volume: number;
}

interface SpotifyState {
  isPlaying: boolean;
  progress: number;
  volume: number | null;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  track: SpotifyTrack | null;
  device: SpotifyDevice | null;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  country?: string;
  followers: number;
  product: string;
  images: Array<{ url: string; height: number; width: number }>;
  external_urls?: { spotify: string };
}

export const SpotifyControl: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPiConnected, setIsPiConnected] = useState(false);
  const [isMirrorActive, setIsMirrorActive] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('spotify-mirror-active');
    return saved ? JSON.parse(saved) : false;
  });
  const [lastMirroredTrackId, setLastMirroredTrackId] = useState<string | null>(null);
  const [spotifyState, setSpotifyState] = useState<SpotifyState>({
    isPlaying: false,
    progress: 0,
    volume: 75,
    shuffleState: false,
    repeatState: 'off',
    track: null,
    device: null
  });
  const [currentUser, setCurrentUser] = React.useState<SpotifyUser | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to handle Spotify API errors
  const handleSpotifyError = (error: unknown, action: string) => {
    if (axios.isAxiosError(error)) {
      // Handle 403 Forbidden (token expired/invalid)
      if (error.response?.status === 403) {
        setIsConnected(false);
        setCurrentUser(null);
        setSpotifyState(prev => ({ ...prev, track: null }));
        // Clear mirror state when connection is lost
        setIsMirrorActive(false);
        localStorage.removeItem('spotify-mirror-active');
        toast({
          title: "Session Expired",
          description: "Your Spotify session has expired. Please reconnect.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle 401 Unauthorized
      if (error.response?.status === 401 || error.response?.data?.requireAuth) {
        setIsConnected(false);
        setCurrentUser(null);
        // Clear mirror state when connection is lost
        setIsMirrorActive(false);
        localStorage.removeItem('spotify-mirror-active');
        return;
      }
      
      // Handle specific error messages from the server
      if (error.response?.data?.details) {
        toast({
          title: "Error",
          description: error.response.data.details,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Generic error message
    toast({
      title: "Error",
      description: `Failed to ${action}.`,
      variant: "destructive",
    });
  };

  const fetchCurrentTrack = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/spotify/current');
      if (response.data.success) {
        setSpotifyState({
          isPlaying: response.data.isPlaying || false,
          progress: response.data.progress || 0,
          volume: response.data.volume || 75,
          shuffleState: response.data.shuffleState || false,
          repeatState: response.data.repeatState || 'off',
          track: response.data.track || null,
          device: response.data.device || null
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle 403 Forbidden (token expired/invalid)
        if (error.response?.status === 403) {
          console.warn('Spotify token expired or invalid, requiring re-authentication');
          setIsConnected(false);
          setCurrentUser(null);
          setSpotifyState(prev => ({ ...prev, track: null }));
          // Clear mirror state when connection is lost
          setIsMirrorActive(false);
          localStorage.removeItem('spotify-mirror-active');
          toast({
            title: "Spotify Session Expired",
            description: "Please reconnect to Spotify to continue using the controls.",
            variant: "destructive",
          });
          return;
        }
        
        // Handle 401 Unauthorized (need to re-authenticate)
        if (error.response?.status === 401 || error.response?.data?.requireAuth) {
          console.warn('Spotify authentication required');
          setIsConnected(false);
          setCurrentUser(null);
          setSpotifyState(prev => ({ ...prev, track: null }));
          // Clear mirror state when connection is lost
          setIsMirrorActive(false);
          localStorage.removeItem('spotify-mirror-active');
          return;
        }
      }
      
      console.error('Error fetching current track:', error);
      // Don't spam the user with error messages for track fetching failures
    }
  }, [toast]);

  const fetchCurrentUser = React.useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const response = await axios.get('/api/spotify/user');
      if (response.data.success) {
        setCurrentUser(response.data.user);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle 403 Forbidden (token expired/invalid)
        if (error.response?.status === 403) {
          console.warn('Spotify token expired while fetching user info');
          setIsConnected(false);
          setCurrentUser(null);
          // Clear mirror state when connection is lost
          setIsMirrorActive(false);
          localStorage.removeItem('spotify-mirror-active');
          return;
        }
        
        // Handle 401 Unauthorized (need to re-authenticate)
        if (error.response?.status === 401 || error.response?.data?.requireAuth) {
          console.warn('Spotify authentication required for user info');
          setIsConnected(false);
          setCurrentUser(null);
          // Clear mirror state when connection is lost
          setIsMirrorActive(false);
          localStorage.removeItem('spotify-mirror-active');
          return;
        }
      }
      
      console.error('Failed to fetch user info:', error);
      // Don't show error toast for user info - it's not critical
    }
  }, [isConnected]);

  const checkSpotifyConnection = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/spotify/status');
      const connected = response.data.connected;
      setIsConnected(connected);
      
      if (connected) {
        await fetchCurrentTrack();
        await fetchCurrentUser();
      } else {
        setSpotifyState(prev => ({ ...prev, track: null }));
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Failed to check Spotify connection:', error);
      setIsConnected(false);
      setCurrentUser(null);
      
      // Only show error toast if it's a network/server error, not auth issues
      if (axios.isAxiosError(error) && error.response?.status >= 500) {
        toast({
          title: "Connection Error",
          description: "Failed to check Spotify connection status.",
          variant: "destructive",
        });
      }
    }
  }, [toast, fetchCurrentTrack, fetchCurrentUser]);

  const checkPiConnection = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/pi/status');
      setIsPiConnected(response.data.connected || false);
    } catch (error) {
      console.warn('Pi connection check failed:', error);
      setIsPiConnected(false);
    }
  }, []);

  // Check connection status on mount
  useEffect(() => {
    const initializeSpotify = async () => {
      await checkSpotifyConnection();
      await checkPiConnection();
      
      // If mirror was active and connection is restored, notify Pi
      if (isMirrorActive && isConnected) {
        try {
          await axios.post('/api/pi/spotify-mirror-control', {
            enabled: true,
            action: 'restore'
          });
        } catch (error) {
          console.warn('Failed to restore Pi mirror state:', error);
          // Don't show error to user for restoration attempts
        }
      }
      
      // Check for auth callback in URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('spotify_auth') === 'success') {
        // Wait a bit longer for the backend to process the token
        setTimeout(async () => {
          await checkSpotifyConnection();
          await fetchCurrentUser();
          toast({
            title: "Spotify Connected!",
            description: "Successfully connected to your Spotify account.",
          });
        }, 2000);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.has('spotify_error')) {
        toast({
          title: "Spotify Connection Failed",
          description: "Failed to connect to Spotify. Please try again.",
          variant: "destructive"
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    initializeSpotify();
  }, [toast, checkSpotifyConnection, checkPiConnection, isMirrorActive, isConnected, fetchCurrentUser]);

  // Auto-refresh current track data when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      fetchCurrentTrack(); // Initial fetch
      interval = setInterval(() => {
        // Only continue polling if still connected
        if (isConnected) {
          fetchCurrentTrack();
        }
      }, 3000); // Update every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, fetchCurrentTrack]);

  // Periodic Pi connection check when mirror is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMirrorActive) {
      interval = setInterval(() => {
        checkPiConnection();
      }, 10000); // Check every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMirrorActive, checkPiConnection]);

  // Mirror song to Pi functionality
  const sendSongToPi = React.useCallback(async (track: SpotifyTrack) => {
    try {
      const response = await axios.post('/api/pi/spotify-mirror', {
        track: {
          id: track.id,
          name: track.name,
          artist: track.artists.join(', '),
          album: track.album,
          image: track.image,
          duration: track.duration,
          external_url: track.external_urls.spotify
        },
        isPlaying: spotifyState.isPlaying,
        progress: spotifyState.progress
      });

      if (response.data.success) {
        setLastMirroredTrackId(track.id);
        toast({
          title: "Song Mirrored",
          description: `"${track.name}" sent to Pi successfully.`,
        });
      } else if (response.data.mirrorEnabled) {
        // Mirror is enabled but Pi communication failed
        setLastMirroredTrackId(track.id);
        toast({
          title: "Song Queued",
          description: `"${track.name}" queued for Pi (offline).`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to send song to Pi:', error);
      
      // Check if it's a server error but mirror is still enabled
      if (axios.isAxiosError(error) && error.response?.status === 500 && error.response?.data?.mirrorEnabled) {
        setLastMirroredTrackId(track.id);
        toast({
          title: "Song Queued",
          description: `"${track.name}" queued for Pi (offline).`,
        });
      } else {
        toast({
          title: "Mirror Failed",
          description: "Failed to send song details to Pi. Check Pi connection.",
          variant: "destructive",
        });
      }
    }
  }, [spotifyState.isPlaying, spotifyState.progress, toast]);

  // Auto-mirror new songs when mirror is active
  useEffect(() => {
    if (isMirrorActive && spotifyState.track && spotifyState.track.id !== lastMirroredTrackId) {
      sendSongToPi(spotifyState.track);
    }
  }, [isMirrorActive, spotifyState.track, lastMirroredTrackId, sendSongToPi]);

  const connectToSpotify = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/spotify/auth');
      if (response.data.authUrl) {
        const authWindow = window.open(
          response.data.authUrl,
          'spotify-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            setTimeout(async () => {
              await checkSpotifyConnection();
              // Force a second check to ensure state is updated
              setTimeout(async () => {
                await checkSpotifyConnection();
                await fetchCurrentUser();
              }, 1500);
            }, 1000);
          }
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to Spotify.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectSpotify = async () => {
    try {
      await axios.post('/api/spotify/disconnect');
      setIsConnected(false);
      setCurrentUser(null);
      // Also clear mirror state when disconnecting
      setIsMirrorActive(false);
      localStorage.removeItem('spotify-mirror-active');
      setSpotifyState({
        isPlaying: false,
        progress: 0,
        volume: 75,
        shuffleState: false,
        repeatState: 'off',
        track: null,
        device: null
      });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Spotify.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect from Spotify.",
        variant: "destructive",
      });
    }
  };

  const handlePlayPause = async () => {
    try {
      const action = spotifyState.isPlaying ? 'pause' : 'play';
      const response = await axios.post('/api/spotify/playback', { action });
      if (response.data.success) {
        setSpotifyState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
        toast({
          title: `Music ${action}d`,
          description: response.data.message,
        });
      }
    } catch (error) {
      handleSpotifyError(error, 'control playback');
    }
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      const response = await axios.post('/api/spotify/skip', { direction });
      if (response.data.success) {
        toast({
          title: `Skipped ${direction === 'next' ? 'Forward' : 'Back'}`,
          description: response.data.message,
        });
        // Refresh track info after a short delay
        setTimeout(fetchCurrentTrack, 1000);
      }
    } catch (error) {
      handleSpotifyError(error, 'skip track');
    }
  };

  const handleVolumeChange = async (newVolume: number[]) => {
    try {
      const volume = newVolume[0];
      setSpotifyState(prev => ({ ...prev, volume }));
      await axios.post('/api/spotify/volume', { volume });
    } catch (error) {
      handleSpotifyError(error, 'adjust volume');
    }
  };

  const toggleShuffle = async () => {
    try {
      const newShuffle = !spotifyState.shuffleState;
      const response = await axios.post('/api/spotify/shuffle', { enabled: newShuffle });
      if (response.data.success) {
        setSpotifyState(prev => ({ ...prev, shuffleState: newShuffle }));
        toast({
          title: newShuffle ? "Shuffle Enabled" : "Shuffle Disabled",
          description: response.data.message,
        });
      }
    } catch (error) {
      handleSpotifyError(error, 'toggle shuffle');
    }
  };

  const toggleRepeat = async () => {
    try {
      // Cycle through repeat modes: off -> context -> track -> off
      let newMode: 'off' | 'track' | 'context';
      switch (spotifyState.repeatState) {
        case 'off':
          newMode = 'context';
          break;
        case 'context':
          newMode = 'track';
          break;
        case 'track':
          newMode = 'off';
          break;
        default:
          newMode = 'off';
      }

      const response = await axios.post('/api/spotify/repeat', { mode: newMode });
      if (response.data.success) {
        setSpotifyState(prev => ({ ...prev, repeatState: newMode }));
        toast({
          title: `Repeat ${newMode === 'off' ? 'Disabled' : 'Enabled'}`,
          description: response.data.message,
        });
      }
    } catch (error) {
      handleSpotifyError(error, 'toggle repeat');
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => {
    if (spotifyState.repeatState === 'track') {
      return <Repeat className="h-4 w-4" />;
    }
    return <Repeat className="h-4 w-4" />;
  };

  const toggleSpotifyMirror = async () => {
    try {
      const newMirrorState = !isMirrorActive;
      
      // Send acknowledgment to Pi about mirror state
      const response = await axios.post('/api/pi/spotify-mirror-control', {
        enabled: newMirrorState,
        action: newMirrorState ? 'start' : 'stop'
      });

      // Check if the request was successful OR if it failed due to Pi communication but the backend handled it
      if (response.data.success || (response.status === 500 && response.data.mirrorActive !== undefined)) {
        const actualMirrorState = response.data.mirrorActive ?? newMirrorState;
        setIsMirrorActive(actualMirrorState);
        // Persist to localStorage
        localStorage.setItem('spotify-mirror-active', JSON.stringify(actualMirrorState));
        
        if (actualMirrorState && spotifyState.track) {
          // If turning on mirror and there's a current track, send it immediately
          await sendSongToPi(spotifyState.track);
        } else if (!actualMirrorState) {
          // If turning off mirror, clear the last mirrored track
          setLastMirroredTrackId(null);
        }

        // Show appropriate message based on success status
        if (response.data.success) {
          toast({
            title: actualMirrorState ? "Mirror Enabled" : "Mirror Disabled",
            description: actualMirrorState 
              ? "Spotify songs will now be mirrored to Pi." 
              : "Spotify mirroring has been stopped.",
          });
        } else {
          toast({
            title: actualMirrorState ? "Mirror Enabled (Pi Offline)" : "Mirror Disabled",
            description: actualMirrorState 
              ? "Mirror is active but Pi connection failed. Songs will be queued for when Pi comes online." 
              : "Spotify mirroring has been stopped.",
            variant: actualMirrorState ? "default" : "default",
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle mirror:', error);
      
      // Check if it's a 500 error with mirror state info
      if (axios.isAxiosError(error) && error.response?.status === 500 && error.response?.data?.mirrorActive !== undefined) {
        const actualMirrorState = error.response.data.mirrorActive;
        setIsMirrorActive(actualMirrorState);
        localStorage.setItem('spotify-mirror-active', JSON.stringify(actualMirrorState));
        
        toast({
          title: actualMirrorState ? "Mirror Enabled (Pi Offline)" : "Mirror Disabled",
          description: actualMirrorState 
            ? "Mirror is active but Pi connection failed. Songs will be queued for when Pi comes online." 
            : "Spotify mirroring has been stopped.",
        });
      } else {
        toast({
          title: "Mirror Toggle Failed",
          description: "Failed to change mirror state. Please check your connection.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Main Control Card */}
      <Card className="bg-gradient-to-br from-black via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Music className="h-6 w-6 text-green-500" />
                <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-lg`} />
              </div>
              <div>
                <CardTitle className="text-white text-lg font-bold">Spotify</CardTitle>
                <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'} font-medium`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            {isConnected && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSpotifyMirror}
                  className={`h-8 w-8 p-0 transition-all duration-200 ${
                    isMirrorActive 
                      ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30' 
                      : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                  title={isMirrorActive ? "Stop mirroring to Pi" : "Start mirroring to Pi"}
                >
                  <Cast className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkSpotifyConnection}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectSpotify}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                >
                  <WifiOff className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Account Info at Top */}
          {isConnected && currentUser && (
            <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-xl border border-green-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentUser.images?.[0] ? (
                    <img 
                      src={currentUser.images[0].url} 
                      alt={currentUser.display_name}
                      className="w-10 h-10 rounded-full border-2 border-green-500/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentUser.display_name}
                  </p>
                  {currentUser.email && (
                    <p className="text-xs text-green-300/80 truncate">
                      {currentUser.email}
                    </p>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium px-2 py-1 ${
                    currentUser.product === 'premium' 
                      ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                      : 'border-gray-500/50 text-gray-400 bg-gray-500/10'
                  }`}
                >
                  {currentUser.product === 'premium' ? '✨ Premium' : 'Free'}
                </Badge>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Connection Instructions */}
        {!isConnected && (
          <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <WifiOff className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Connect to Spotify</h3>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                Connect your Spotify Premium account to control your music remotely with full playback control.
              </p>
              
              <div className="grid grid-cols-1 gap-2 text-xs text-gray-400 mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Requires Spotify Premium subscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Start playing music on any device first</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Authorization opens in popup window</span>
                </div>
              </div>
              
              <details className="mb-6 text-left">
                <summary className="text-xs text-yellow-400 cursor-pointer font-medium mb-2">🔧 Troubleshooting</summary>
                <div className="text-xs text-gray-400 space-y-1 pl-4">
                  <p>• Refresh the page if you see connection errors</p>
                  <p>• Disable popup blockers for this site</p>
                  <p>• Ensure Spotify is actively playing music</p>
                </div>
              </details>
              
              <Button 
                onClick={connectToSpotify}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Music className="h-4 w-4" />
                    <span>Connect to Spotify</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Now Playing */}
        {isConnected && (
          <div className="p-6 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            {spotifyState.track ? (
              <div className="space-y-6">
                {/* Track Info */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-600/50 shadow-lg">
                      {spotifyState.track.image ? (
                        <img 
                          src={spotifyState.track.image} 
                          alt={spotifyState.track.album}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <Music className="h-10 w-10 text-purple-400" />
                      )}
                    </div>
                    {spotifyState.isPlaying && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg truncate leading-tight">{spotifyState.track.name}</h3>
                    <p className="text-gray-300 text-sm truncate font-medium">
                      {spotifyState.track.artists.join(', ')}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{spotifyState.track.album}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => spotifyState.track && sendSongToPi(spotifyState.track)}
                      className="h-9 w-9 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                      title="Send to Pi"
                    >
                      <Cast className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-9 w-9 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    {spotifyState.track.external_urls?.spotify && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(spotifyState.track!.external_urls.spotify, '_blank')}
                        className="h-9 w-9 p-0 text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000 shadow-sm" 
                      style={{ 
                        width: `${spotifyState.track.duration > 0 ? (spotifyState.progress / spotifyState.track.duration) * 100 : 0}%` 
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-mono">
                    <span>{formatTime(spotifyState.progress)}</span>
                    <span>{formatTime(spotifyState.track.duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleShuffle}
                    className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                      spotifyState.shuffleState 
                        ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSkip('previous')}
                    className="h-12 w-12 p-0 rounded-full text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    onClick={handlePlayPause}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
                  >
                    {spotifyState.isPlaying ? 
                      <Pause className="h-8 w-8 text-white" /> : 
                      <Play className="h-8 w-8 ml-1 text-white" />
                    }
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSkip('next')}
                    className="h-12 w-12 p-0 rounded-full text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRepeat}
                    className={`h-10 w-10 p-0 rounded-full relative transition-all duration-200 ${
                      spotifyState.repeatState !== 'off' 
                        ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Repeat className="h-4 w-4" />
                    {spotifyState.repeatState === 'track' && (
                      <span className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">1</span>
                    )}
                  </Button>
                </div>

                {/* Volume Control */}
                {spotifyState.volume !== null && (
                  <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <Volume2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 relative">
                      <Slider
                        value={[spotifyState.volume]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right font-mono">
                      {spotifyState.volume}%
                    </span>
                  </div>
                )}

                {/* Device Info */}
                {spotifyState.device && (
                  <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-300 font-medium">Playing on:</span>
                      <span className="text-xs text-white font-semibold">{spotifyState.device.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{spotifyState.device.type}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
                  <Music className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No music playing</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Start playing music on Spotify to see it here
                </p>
                <Button
                  onClick={() => window.open('https://open.spotify.com', '_blank')}
                  variant="outline"
                  className="text-green-400 border-green-500/50 hover:bg-green-500/10"
                >
                  Open Spotify
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {isConnected && (
          <div className="p-4 bg-gradient-to-br from-gray-800/20 to-gray-900/20 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <h3 className="font-semibold text-white mb-4 text-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-14 flex flex-col items-center gap-2 border-gray-600/50 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 text-gray-300 hover:text-white"
                onClick={() => window.open('https://open.spotify.com/browse/featured', '_blank')}
              >
                <Radio className="h-5 w-5" />
                <span className="text-xs font-medium">Browse</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 flex flex-col items-center gap-2 border-gray-600/50 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 text-gray-300 hover:text-white"
                onClick={() => window.open('https://open.spotify.com/collection/playlists', '_blank')}
              >
                <Music className="h-5 w-5" />
                <span className="text-xs font-medium">Playlists</span>
              </Button>
            </div>
          </div>
        )}

        {/* Now Playing Status Badge */}
        {isConnected && spotifyState.isPlaying && spotifyState.track && (
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-xl border border-green-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-30"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-400">Now Playing</p>
                <p className="text-xs text-green-300/80 truncate">
                  {spotifyState.track.name} • {spotifyState.track.artists.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isMirrorActive && (
                  <div className="flex items-center gap-1">
                    <Cast className={`h-3 w-3 ${isPiConnected ? 'text-blue-400' : 'text-yellow-400'}`} />
                    <span className={`text-xs font-medium ${isPiConnected ? 'text-blue-400' : 'text-yellow-400'}`}>
                      {isPiConnected ? 'Pi' : 'Pi (Queue)'}
                    </span>
                  </div>
                )}
                <Badge 
                  variant="outline" 
                  className="bg-green-500/20 border-green-500/50 text-green-400 text-xs font-bold px-2 py-1"
                >
                  LIVE
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Pi Mirror Status */}
        {isConnected && isMirrorActive && (
          <div className={`p-4 rounded-xl border backdrop-blur-sm ${
            isPiConnected 
              ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30' 
              : 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Cast className={`h-4 w-4 ${isPiConnected ? 'text-blue-400' : 'text-yellow-400'}`} />
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                  isPiConnected ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></div>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isPiConnected ? 'text-blue-400' : 'text-yellow-400'}`}>
                  {isPiConnected ? 'Pi Mirror Active' : 'Pi Mirror (Offline)'}
                </p>
                <p className={`text-xs ${isPiConnected ? 'text-blue-300/80' : 'text-yellow-300/80'}`}>
                  {isPiConnected 
                    ? 'Songs are being mirrored to Raspberry Pi' 
                    : 'Pi is offline - songs will be queued'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkPiConnection}
                  className={`h-8 w-8 p-0 transition-all duration-200 ${
                    isPiConnected 
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' 
                      : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                  }`}
                  title="Check Pi connection"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSpotifyMirror}
                  className={`h-8 w-8 p-0 transition-all duration-200 ${
                    isPiConnected 
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' 
                      : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                  }`}
                >
                  <WifiOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};