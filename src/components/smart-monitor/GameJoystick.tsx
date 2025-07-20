import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface GameJoystickProps {
  selectedGame: string;
}

type GameAction = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'l' | 'r' | 'start' | 'select';

export const GameJoystick: React.FC<GameJoystickProps> = ({ selectedGame }) => {
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const sendGameControl = async (action: GameAction) => {
    try {
      setActiveButton(action);
      
      await axios.post('/api/game/control', {
        game: selectedGame,
        action: action
      });
      
      toast({
        title: "Game Control",
        description: `${action.toUpperCase()} pressed`,
      });
      
      setTimeout(() => setActiveButton(null), 100);
    } catch (error) {
      console.error('Failed to send game control:', error);
      toast({
        title: "Error",
        description: "Failed to send game control",
        variant: "destructive"
      });
      setActiveButton(null);
    }
  };

  const getButtonClass = (action: string) => {
    const baseClass = "joystick-button w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-75 active:scale-95";
    const isActive = activeButton === action;
    return `${baseClass} ${isActive ? 'control-active' : ''}`;
  };

  const getDPadClass = (action: string) => {
    const baseClass = "joystick-button w-14 h-14 flex items-center justify-center text-lg font-bold transition-all duration-75 active:scale-95";
    const isActive = activeButton === action;
    return `${baseClass} ${isActive ? 'control-active' : ''}`;
  };

  return (
    <Card className="glass-card p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary">Game Controller</h3>
        <p className="text-sm text-muted-foreground">Playing: {selectedGame}</p>
      </div>

      <div className="flex justify-between items-center">
        {/* D-Pad */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Up */}
            <button
              className={`${getDPadClass('up')} absolute top-0 rounded-t-xl`}
              onTouchStart={() => sendGameControl('up')}
              onMouseDown={() => sendGameControl('up')}
            >
              ↑
            </button>
            
            {/* Down */}
            <button
              className={`${getDPadClass('down')} absolute bottom-0 rounded-b-xl`}
              onTouchStart={() => sendGameControl('down')}
              onMouseDown={() => sendGameControl('down')}
            >
              ↓
            </button>
            
            {/* Left */}
            <button
              className={`${getDPadClass('left')} absolute left-0 rounded-l-xl`}
              onTouchStart={() => sendGameControl('left')}
              onMouseDown={() => sendGameControl('left')}
            >
              ←
            </button>
            
            {/* Right */}
            <button
              className={`${getDPadClass('right')} absolute right-0 rounded-r-xl`}
              onTouchStart={() => sendGameControl('right')}
              onMouseDown={() => sendGameControl('right')}
            >
              →
            </button>
            
            {/* Center */}
            <div className="w-8 h-8 bg-muted rounded-lg"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Y */}
            <button
              className={`${getButtonClass('y')} absolute top-2 bg-gradient-to-b from-primary/20 to-primary/40`}
              onTouchStart={() => sendGameControl('y')}
              onMouseDown={() => sendGameControl('y')}
            >
              Y
            </button>
            
            {/* A */}
            <button
              className={`${getButtonClass('a')} absolute bottom-2 bg-gradient-to-b from-secondary/20 to-secondary/40`}
              onTouchStart={() => sendGameControl('a')}
              onMouseDown={() => sendGameControl('a')}
            >
              A
            </button>
            
            {/* X */}
            <button
              className={`${getButtonClass('x')} absolute left-2 bg-gradient-to-b from-accent/20 to-accent/40`}
              onTouchStart={() => sendGameControl('x')}
              onMouseDown={() => sendGameControl('x')}
            >
              X
            </button>
            
            {/* B */}
            <button
              className={`${getButtonClass('b')} absolute right-2 bg-gradient-to-b from-destructive/20 to-destructive/40`}
              onTouchStart={() => sendGameControl('b')}
              onMouseDown={() => sendGameControl('b')}
            >
              B
            </button>
          </div>
        </div>
      </div>

      {/* Shoulder Buttons */}
      <div className="flex justify-between gap-4">
        <button
          className={`${getButtonClass('l')} flex-1 h-10 rounded-lg bg-gradient-to-r from-muted to-muted/60`}
          onTouchStart={() => sendGameControl('l')}
          onMouseDown={() => sendGameControl('l')}
        >
          L
        </button>
        
        <button
          className={`${getButtonClass('r')} flex-1 h-10 rounded-lg bg-gradient-to-r from-muted to-muted/60`}
          onTouchStart={() => sendGameControl('r')}
          onMouseDown={() => sendGameControl('r')}
        >
          R
        </button>
      </div>

      {/* System Buttons */}
      <div className="flex justify-center gap-6">
        <button
          className={`${getButtonClass('select')} px-4 h-8 rounded-md text-xs`}
          onTouchStart={() => sendGameControl('select')}
          onMouseDown={() => sendGameControl('select')}
        >
          SELECT
        </button>
        
        <button
          className={`${getButtonClass('start')} px-4 h-8 rounded-md text-xs`}
          onTouchStart={() => sendGameControl('start')}
          onMouseDown={() => sendGameControl('start')}
        >
          START
        </button>
      </div>
    </Card>
  );
};