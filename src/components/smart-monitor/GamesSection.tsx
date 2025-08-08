import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameJoystick } from './GameJoystick';
import { Gamepad2, Play, Square } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

const GAMES = [
	{
		id: 'mariokart',
		name: 'Mario Kart 8',
		description: 'Racing game',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#ff6b6b'
	},
	{
		id: 'hbmenu',
		name: 'HB Menu',
		description: 'Homebrew launcher',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#4ecdc4'
	},
	{
		id: 'mha',
		name: 'My Hero Academia',
		description: 'Action adventure',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#45b7d1'
	},
	{
		id: 'madeinabyss',
		name: 'Made in Abyss',
		description: 'Adventure RPG',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#f39c12'
	},
	{
		id: 'nintendo',
		name: 'Nintendo',
		description: 'Nintendo games',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#e74c3c'
	},
	{
		id: 'tetris',
		name: 'Tetris Classic',
		description: 'Classic block puzzle game',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#9b59b6'
	},
	{
		id: 'pacman',
		name: 'Pac-Man',
		description: 'Retro arcade classic',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#f1c40f'
	},
	{
		id: 'snake',
		name: 'Snake',
		description: 'Grow your snake and avoid walls',
		status: 'available',
		thumbnail: '/placeholder.svg',
		color: '#2ecc71'
	}
];

export const GamesSection: React.FC = () => {
	const [selectedGame, setSelectedGame] = useState<string | null>(null);
	const [gameStatus, setGameStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
	const [showFullPageController, setShowFullPageController] = useState(false);

	const startGame = (gameId: string) => {
		setSelectedGame(gameId);
		setGameStatus('playing');
		setShowFullPageController(true);
		toast({
			title: "Game Started",
			description: `${GAMES.find(g => g.id === gameId)?.name} is now running`,
		});
	};

	const stopGame = async () => {
		try {
			await axios.post('/api/game/stop', { gameId: selectedGame });
			setSelectedGame(null);
			setGameStatus('idle');
			setShowFullPageController(false);
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

	const closeFullPageController = () => {
		setShowFullPageController(false);
	};

	// Full page controller overlay
	if (showFullPageController && selectedGame) {
		return (
			<div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm">
				<div className="h-full flex items-center justify-center p-4">
					<div className="w-full max-w-4xl">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold text-white mb-2">
								{GAMES.find(g => g.id === selectedGame)?.name}
							</h2>
							<div className="flex items-center justify-center gap-2 text-green-400">
								<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
								<span className="text-sm">Game Running</span>
							</div>
						</div>
						<GameJoystick selectedGame={selectedGame} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Gamepad2 className="h-5 w-5 text-primary" />
						Games Library
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Horizontal scrollable game list */}
						<div className="relative">
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
								{GAMES.map((game) => (
									<div
										key={game.id}
										className="relative cursor-pointer group"
										onClick={() => startGame(game.id)}
									>
										<div 
											className="w-full h-40 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
											style={{ backgroundColor: game.color }}
										>
											<div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
												<div className="text-center text-white">
													<div className="text-sm font-semibold mb-1 truncate px-2">
														{game.name}
													</div>
													{gameStatus === 'loading' && selectedGame === game.id && (
														<div className="text-xs opacity-75">Loading...</div>
													)}
												</div>
											</div>
										</div>
										{/* Glow effect for selected game */}
										{selectedGame === game.id && gameStatus === 'playing' && (
											<div className="absolute -inset-1 bg-primary/30 rounded-lg blur-sm animate-pulse"></div>
										)}
										{/* Play button overlay */}
										<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
											<Play className="h-6 w-6 text-white" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Game status indicator */}
						{selectedGame && gameStatus === 'playing' && !showFullPageController && (
							<div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
								<div className="flex items-center gap-3">
									<div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
									<div>
										<div className="font-medium text-sm">
											{GAMES.find(g => g.id === selectedGame)?.name}
										</div>
										<div className="text-xs text-muted-foreground">
											Running in background
										</div>
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => setShowFullPageController(true)}
										className="text-xs"
									>
										<Gamepad2 className="h-3 w-3 mr-1" />
										Controller
									</Button>
									<Button
										size="sm"
										variant="destructive"
										onClick={stopGame}
										className="text-xs"
									>
										<Square className="h-3 w-3" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};