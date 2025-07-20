import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GameJoystick } from './GameJoystick';
import { Gamepad2, Play, Square, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

const GAMES = [
  {
    id: 'tetris',
    name: 'Tetris Classic',
    description: 'Classic block puzzle game',
    status: 'available',
    thumbnail: '🎮'
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    description: 'Retro arcade classic',
    status: 'available',
    thumbnail: '👻'
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Grow your snake and avoid walls',
    status: 'available',
    thumbnail: '🐍'
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Break bricks with the ball',
    status: 'available',
    thumbnail: '🏓'
  }
];

export const GamesSection: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<'idle' | 'loading' | 'playing'>('idle');

  const startGame = async (gameId: string) => {
    try {
      setGameStatus('loading');
      
      await axios.post('/api/game/start', { gameId });
      
      setSelectedGame(gameId);
      setGameStatus('playing');
      
      toast({
        title: "Game Started",
        description: `${GAMES.find(g => g.id === gameId)?.name} is now running`,
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive"
      });
      setGameStatus('idle');
    }
  };

  const stopGame = async () => {
    try {
      await axios.post('/api/game/stop', { gameId: selectedGame });
      
      setSelectedGame(null);
      setGameStatus('idle');
      
      toast({
        title: "Game Stopped",
        description: "Game session ended",
      });
    } catch (error) {
      console.error('Failed to stop game:', error);
      toast({
        title: "Error",
        description: "Failed to stop game",
        variant: "destructive"
      });
    }
  };

  const restartGame = async () => {
    if (selectedGame) {
      await stopGame();
      setTimeout(() => startGame(selectedGame), 500);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Retro Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedGame ? (
            <div className="grid grid-cols-2 gap-4">
              {GAMES.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-neon hover:border-primary/50"
                  onClick={() => startGame(game.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{game.thumbnail}</div>
                    <h3 className="font-semibold text-sm">{game.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{game.description}</p>
                    <Badge variant="secondary" className="text-xs">
                      {game.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-glow-pulse"></div>
                  <span className="text-sm font-medium">
                    Playing: {GAMES.find(g => g.id === selectedGame)?.name}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={restartGame}
                    disabled={gameStatus === 'loading'}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={stopGame}
                    disabled={gameStatus === 'loading'}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGame && gameStatus === 'playing' && (
        <div className="animate-slide-in">
          <GameJoystick selectedGame={selectedGame} />
        </div>
      )}
    </div>
  );
};