import React, { useEffect } from 'react';
import Joystick, { IJoystickChangeValue } from 'rc-joystick';

interface GameJoystickProps {
  selectedGame: string;
}

export const GameJoystick: React.FC<GameJoystickProps> = ({ selectedGame }) => {
  const [clickedButtons, setClickedButtons] = React.useState<string>('None');
  const [activeButtons, setActiveButtons] = React.useState<string[]>([]);
  const [joystickDirection, setJoystickDirection] = React.useState<string>('None');

  const updateClickedButtons = (button: string) => {
    setClickedButtons((prev) => (prev === 'None' ? button : `${prev} + ${button}`));
  };

  const handleButtonPress = (button: string) => {
    setActiveButtons((prev) => {
      if (!prev.includes(button)) {
        return [...prev, button];
      }
      return prev;
    });
  };

  const handleButtonRelease = (button: string) => {
    setActiveButtons((prev) => prev.filter((b) => b !== button));
  };

  const handleJoystickChange = (val: IJoystickChangeValue) => {
    setJoystickDirection(val.direction || 'None');
  };

  // Prevent button events from interfering with joystick
  const handleButtonTouch = (e: React.TouchEvent, action: () => void) => {
    e.stopPropagation(); // Prevent event bubbling to joystick
    e.preventDefault();
    action();
  };

  useEffect(() => {
    // Request fullscreen mode when the controller is opened
    const requestFullscreen = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    };

    requestFullscreen();

    // Only prevent scrolling and context menu, allow button/joystick interactions
    const preventScroll = (e: TouchEvent) => {
      // Only prevent default for document body/html, not for controller elements
      const target = e.target as HTMLElement;
      if (target === document.body || target === document.documentElement || 
          (!target.closest('.joystick-container') && !target.closest('button'))) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-row items-center justify-between select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
      <div className="absolute top-4 left-4 text-white">
        <h1 className="text-2xl font-bold">{selectedGame}</h1>
      </div>

      {/* Top Center: Display Active Buttons and Joystick Direction */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-center">
        <div className="text-lg font-bold">Active: {activeButtons.length > 0 ? activeButtons.join(' + ') : 'None'}</div>
        <div className="text-sm">Joystick: {joystickDirection}</div>
      </div>

      {/* Left Side: Joystick */}
      <div className="flex-1 flex items-center justify-center">
        <div className="joystick-wrapper relative touch-none" style={{ isolation: 'isolate', touchAction: 'none' }}>
          <Joystick
            baseRadius={100}
            controllerRadius={40}
            onChange={handleJoystickChange}
            className="joystick-container opacity-70"
            controllerClassName="joystick-controller opacity-80"
          />
        </div>
      </div>

      {/* Top Left and Right: Shoulder Buttons */}
      <div className="absolute top-12 left-4">
        <button
          className={`w-20 h-10 rounded-lg text-white font-bold transition-all duration-150 ${
            activeButtons.includes('L') 
              ? 'bg-gray-500 scale-95 shadow-inner' 
              : 'bg-gray-700 hover:bg-gray-600 active:scale-95'
          }`}
          onMouseDown={() => handleButtonPress('L')}
          onMouseUp={() => handleButtonRelease('L')}
          onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('L'))}
          onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('L'))}
        >
          L
        </button>
      </div>
      <div className="absolute top-12 right-4">
        <button
          className={`w-20 h-10 rounded-lg text-white font-bold transition-all duration-150 ${
            activeButtons.includes('R') 
              ? 'bg-gray-500 scale-95 shadow-inner' 
              : 'bg-gray-700 hover:bg-gray-600 active:scale-95'
          }`}
          onMouseDown={() => handleButtonPress('R')}
          onMouseUp={() => handleButtonRelease('R')}
          onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('R'))}
          onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('R'))}
        >
          R
        </button>
      </div>

      {/* Right Side: Buttons in Rhombus Shape */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
          <button
            className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full text-white font-bold transition-all duration-150 ${
              activeButtons.includes('X') 
                ? 'bg-green-400 scale-95 shadow-inner' 
                : 'bg-green-500 hover:bg-green-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('X')}
            onMouseUp={() => handleButtonRelease('X')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('X'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('X'))}
          >
            X
          </button>
          <button
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full text-white font-bold transition-all duration-150 ${
              activeButtons.includes('Y') 
                ? 'bg-yellow-400 scale-95 shadow-inner' 
                : 'bg-yellow-500 hover:bg-yellow-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('Y')}
            onMouseUp={() => handleButtonRelease('Y')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('Y'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('Y'))}
          >
            Y
          </button>
          <button
            className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full text-white font-bold transition-all duration-150 ${
              activeButtons.includes('A') 
                ? 'bg-red-400 scale-95 shadow-inner' 
                : 'bg-red-500 hover:bg-red-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('A')}
            onMouseUp={() => handleButtonRelease('A')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('A'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('A'))}
          >
            A
          </button>
          <button
            className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full text-white font-bold transition-all duration-150 ${
              activeButtons.includes('B') 
                ? 'bg-blue-400 scale-95 shadow-inner' 
                : 'bg-blue-500 hover:bg-blue-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('B')}
            onMouseUp={() => handleButtonRelease('B')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('B'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('B'))}
          >
            B
          </button>
        </div>

        {/* System Buttons */}
        <div className="absolute bottom-12 flex justify-center space-x-6 w-full max-w-md">
          <button
            className={`w-24 h-10 rounded-md text-white font-bold transition-all duration-150 ${
              activeButtons.includes('Select') 
                ? 'bg-gray-400 scale-95 shadow-inner' 
                : 'bg-gray-500 hover:bg-gray-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('Select')}
            onMouseUp={() => handleButtonRelease('Select')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('Select'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('Select'))}
          >
            Select
          </button>
          <button
            className={`w-24 h-10 rounded-md text-white font-bold transition-all duration-150 ${
              activeButtons.includes('Start') 
                ? 'bg-gray-400 scale-95 shadow-inner' 
                : 'bg-gray-500 hover:bg-gray-400 active:scale-95'
            }`}
            onMouseDown={() => handleButtonPress('Start')}
            onMouseUp={() => handleButtonRelease('Start')}
            onTouchStart={(e) => handleButtonTouch(e, () => handleButtonPress('Start'))}
            onTouchEnd={(e) => handleButtonTouch(e, () => handleButtonRelease('Start'))}
          >
            Start
          </button>
        </div>
      </div>

      {/* Exit Button */}
      <div className="absolute bottom-4 left-4">
        <button className="w-20 h-8 rounded-md bg-red-600 text-white font-bold">Exit</button>
      </div>
    </div>
  );
};