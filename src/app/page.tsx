'use client';

import React, { useState, useEffect, useRef, ChangeEvent, MouseEvent, use } from 'react';
// Corrected icon import
import { Plus, Minus, Play, Pause, RotateCcw, Edit, UserPlus, Trash2, LogIn, LogOut, Clock, StopCircle, FileText, X, Volleyball } from 'lucide-react';
import { JSX } from 'react/jsx-runtime';

// --- Enums and Types ---
enum PlayerStatus {
    BENCH = 'Bench',
    PLAYING = 'Playing',
}

enum GamePeriod {
    FIRST_HALF = 'FIRST_HALF',
    HALF_TIME = 'HALF_TIME',
    SECOND_HALF = 'SECOND_HALF',
    FULL_TIME = 'FULL_TIME',
}

// Define available positions explicitly
type Position = 'GK' | 'DEF' | 'MID' | 'FWD' | 'SUB';
const POSITIONS: Array<Position | '-'> = ['-', 'GK', 'DEF', 'MID', 'FWD', 'SUB'];

// Define Gender and Foot types
type Gender = 'Girl' | 'Boy' | null;
type Foot = 'Left' | 'Right' | null;
const GENDER_OPTIONS: Array<Gender | '-'> = ['-', 'Girl', 'Boy'];
const FOOT_OPTIONS: Array<Foot | '-'> = ['-', 'Left', 'Right'];


// Type for time breakdown by position
type TimeByPosition = {
    [key in Position]: number; // Use Position type as keys
};

// Interface for the Player object
interface Player {
    id: number;
    name: string;
    position: Position | null;
    status: PlayerStatus;
    totalTimePlayed: number;
    gender: Gender;
    preferredFoot: Foot;
    timeByPosition: TimeByPosition;
    goals: number;
}

// --- Constants ---
const HALF_DURATION_MINUTES: number = 25; // Duration of EACH half
const HALF_DURATION_SECONDS: number = HALF_DURATION_MINUTES * 60;


// Initial time breakdown structure for a player
const initialTimeByPosition = (): TimeByPosition => ({
    GK: 0, DEF: 0, MID: 0, FWD: 0, SUB: 0,
});

// --- Helper Functions ---
const formatTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getPeriodDisplay = (period: GamePeriod, isInAddedTime: boolean): string => {
    let baseText = '';
    switch (period) {
        case GamePeriod.FIRST_HALF: baseText = '1st Half'; break;
        case GamePeriod.HALF_TIME: return 'Halftime';
        case GamePeriod.SECOND_HALF: baseText = '2nd Half'; break;
        case GamePeriod.FULL_TIME: return 'Full Time';
        default: return 'Pre-Game';
    }
    return isInAddedTime ? `${baseText} + Added Time` : baseText;
};

// --- Reusable Components ---

// Button Props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'subAction' | 'goal';
    size?: 'small' | 'normal';
    title?: string;
}

// Button Component
const Button: React.FC<ButtonProps> = ({ onClick, children, className = '', variant = 'primary', size = 'normal', title = '', ...props }) => {
  const baseStyle = 'rounded-lg shadow hover:opacity-90 transition duration-200 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-medium focus:outline-none focus:ring-2 focus:ring-offset-1';
  const sizeStyle = size === 'small' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm';
  const variantStyle = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
    warning: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 shadow-none focus:ring-gray-300',
    subAction: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 shadow-sm',
    goal: 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 focus:ring-yellow-300 shadow-sm',
  }[variant];
  return (<button onClick={onClick} className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} title={title} {...props}>{children}</button>);
};

// Team Name Input Props
interface TeamNameInputProps {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}

// Team Name Input Component
const TeamNameInput: React.FC<TeamNameInputProps> = ({ value, onChange, placeholder }) => (
    <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="text-2xl sm:text-3xl font-bold text-center bg-transparent border-b-2 border-gray-300 focus:border-blue-500 outline-none transition duration-200 ease-in-out w-full truncate px-2 py-1"/>
);

// Player Input Props
interface PlayerInputProps {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onAdd: () => void;
    placeholder: string;
}

// Player Input Component
const PlayerInput: React.FC<PlayerInputProps> = ({ value, onChange, onAdd, placeholder }) => (
    <div className="flex items-center space-x-2 mt-2">
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black" onKeyDown={(e) => e.key === 'Enter' && onAdd()}/>
        <Button onClick={onAdd} variant="success" size="normal" className="px-3" disabled={!value.trim()} title="Add Player"><UserPlus size={18} /></Button>
    </div>
);

// Player List Item Props
interface PlayerListItemProps {
    player: Player;
    onPositionChange: (id: number, value: string) => void;
    onGenderChange: (id: number, value: string) => void;
    onFootChange: (id: number, value: string) => void;
    onGoalScored: (id: number) => void;
    onRemove: (id: number) => void;
    onToggleStatus: (id: number) => void;
}

// Player List Item Component
const PlayerListItem: React.FC<PlayerListItemProps> = ({
    player,
    onPositionChange,
    onGenderChange,
    onFootChange,
    onGoalScored,
    onRemove,
    onToggleStatus
}) => (
    <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-3 bg-gray-50 rounded-lg mb-2 shadow-sm space-y-2 sm:space-y-0">
        {/* Player Info Section */}
        <div className="flex-grow flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mr-2 w-full sm:w-auto">
             <span className={`font-medium truncate ${player.status === PlayerStatus.PLAYING ? 'text-green-700' : 'text-gray-800'}`}>
                {player.name} {player.goals > 0 && `(${player.goals})`}
             </span>
             <div className="flex items-center space-x-2 text-xs">
                 <select value={player.gender || '-'} onChange={(e: ChangeEvent<HTMLSelectElement>) => onGenderChange(player.id, e.target.value)} className="px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-black" title="Select Gender">{GENDER_OPTIONS.map(g => (<option key={g} value={g || '-'}>{g || '-'}</option>))}</select>
                 <select value={player.preferredFoot || '-'} onChange={(e: ChangeEvent<HTMLSelectElement>) => onFootChange(player.id, e.target.value)} className="px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-black" title="Select Preferred Foot">{FOOT_OPTIONS.map(f => (<option key={f} value={f || '-'}>{f || '-'}</option>))}</select>
                 <select value={player.position || '-'} onChange={(e: ChangeEvent<HTMLSelectElement>) => onPositionChange(player.id, e.target.value)} className="px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-black" title="Assign Position">{POSITIONS.map(pos => (<option key={pos} value={pos}>{pos}</option>))}</select>
             </div>
        </div>
        {/* Status, Time Played & Actions Section */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto flex-shrink-0">
             <Button onClick={() => onGoalScored(player.id)} variant="goal" size="small" className="p-1" title={`Record Goal for ${player.name}`} disabled={player.status !== PlayerStatus.PLAYING}><Volleyball size={16} /></Button>
             <div className="flex items-center text-sm text-gray-600" title="Total Time Played"><Clock size={14} className="mr-1 text-gray-400"/>{formatTime(player.totalTimePlayed)}</div>
             <Button onClick={() => onToggleStatus(player.id)} variant={player.status === PlayerStatus.PLAYING ? 'subAction' : 'success'} size="small" className="w-20 justify-center" title={player.status === PlayerStatus.PLAYING ? 'Sub Out' : 'Sub In'}>{player.status === PlayerStatus.PLAYING ? <><LogOut size={14} className="mr-1"/> Bench</> : <><LogIn size={14} className="mr-1"/> Play</>}</Button>
             <Button onClick={() => onRemove(player.id)} variant="ghost" size="small" className="text-red-500 hover:bg-red-100 p-1" title="Remove Player"><Trash2 size={16} /></Button>
        </div>
    </li>
);

// Game Report Props
interface GameReportProps {
    teamPlayers: Player[];
    teamName: string;
    onClose: () => void;
}

// Game Report Component
const GameReport: React.FC<GameReportProps> = ({ teamPlayers, teamName, onClose }) => {
    const renderPlayerRows = (players: Player[]) => {
        return players.sort((a, b) => (b.goals || 0) - (a.goals || 0))
               .map(player => (
            <tr key={player.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-3 text-sm font-medium text-gray-900">{player.name}</td>
                <td className="py-2 px-3 text-sm text-gray-600">{player.gender || '-'}</td>
                <td className="py-2 px-3 text-sm text-gray-600">{player.preferredFoot || '-'}</td>
                <td className="py-2 px-3 text-sm text-gray-800 text-center font-semibold">{player.goals || 0}</td>
                {POSITIONS.filter(p => p !== '-').map(pos => (
                     <td key={pos} className="py-2 px-3 text-sm text-gray-600 text-center font-mono">{formatTime(player.timeByPosition?.[pos as Position] || 0)}</td> // Assert pos as Position
                ))}
                <td className="py-2 px-3 text-sm text-gray-800 text-center font-mono font-semibold">{formatTime(player.totalTimePlayed)}</td>
            </tr>
        ));
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Game Report</h2>
                    <Button onClick={onClose} variant="ghost" size="small" className="p-1"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-blue-700 mb-3">{teamName} - Player Report</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foot</th>
                                        <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Goals</th>
                                        {POSITIONS.filter(p => p !== '-').map(pos => ( <th key={pos} className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{pos}</th> ))}
                                        <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {renderPlayerRows(teamPlayers)}
                                    {teamPlayers.length === 0 && <tr><td colSpan={POSITIONS.length + 3} className="text-center py-4 text-sm text-gray-500">No players on this team.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
                     <Button onClick={onClose} variant="secondary">Close Report</Button>
                 </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
const Home: React.FC = () => { // Use React.FC for functional component typing
  // State for team name, score, editing status
  const [teamName, setTeamName] = useState<string>('Set Peace FC');
  const [editingTeam, setEditingTeam] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);

  // State for timer, added time, and game period
  const [timeLeft, setTimeLeft] = useState<number>(HALF_DURATION_SECONDS);
  const [addedTimeElapsed, setAddedTimeElapsed] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [gamePeriod, setGamePeriod] = useState<GamePeriod>(GamePeriod.FIRST_HALF);
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Type for timer interval ID
  const isInAddedTime: boolean = timeLeft === 0 && addedTimeElapsed > 0;

  // State for players
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]); // Use Player interface array
  const [newPlayer, setNewPlayer] = useState<string>('');
  const nextPlayerId = useRef<number>(1); // Type for player ID ref

  // State for report visibility
  const [showReport, setShowReport] = useState<boolean>(false);


  // --- Timer and Time Tracking Logic ---
  useEffect(() => {
    const updatePlayingTime = () => {
      const updatePlayer = (player: Player): Player => { // Type player parameter
        if (player.status === PlayerStatus.PLAYING) {
          const currentPosition = player.position;
          const newTotalTime = (player.totalTimePlayed || 0) + 1;
          const newTimeByPosition = { ...(player.timeByPosition || initialTimeByPosition()) };
          if (currentPosition && currentPosition !== '-') {
             // Ensure the key exists before accessing
             if (newTimeByPosition.hasOwnProperty(currentPosition)) {
                 newTimeByPosition[currentPosition] = (newTimeByPosition[currentPosition] || 0) + 1;
             } else { console.warn(`Position ${currentPosition} not found...`); }
          }
          return { ...player, totalTimePlayed: newTotalTime, timeByPosition: newTimeByPosition };
        }
        return player;
      };
      // Use functional update with explicit type
      setTeamPlayers((prevPlayers: Player[]) => prevPlayers.map(updatePlayer));
    };

    if (isTimerActive && (gamePeriod === GamePeriod.FIRST_HALF || gamePeriod === GamePeriod.SECOND_HALF)) {
      timerRef.current = setInterval(() => {
        updatePlayingTime();
        setTimeLeft((prevTimeLeft) => {
          if (prevTimeLeft > 0) { return prevTimeLeft - 1; }
          else { setAddedTimeElapsed((prevAddedTime) => prevAddedTime + 1); return 0; }
        });
      }, 1000);
    } else {
        // Clear interval if it exists
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null; // Reset ref after clearing
        }
    }
    // Cleanup function
    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };
  }, [isTimerActive, gamePeriod]);


  // --- Event Handlers ---

  // Score Handlers
  const incrementScore = (): void => setScore((prev) => prev + 1);
  const decrementScore = (): void => setScore((prev) => Math.max(0, prev - 1));
  const incrementOpponentScore = (): void => setOpponentScore((prev) => prev + 1);
  const decrementOpponentScore = (): void => setOpponentScore((prev) => Math.max(0, prev - 1));

  // Timer Control Handlers
  const handleTimerControl = (): void => { if (gamePeriod === GamePeriod.FIRST_HALF || gamePeriod === GamePeriod.SECOND_HALF) { setIsTimerActive(!isTimerActive); } };
  const handleEndHalf = (): void => { if (!isTimerActive || (timeLeft > 0 && addedTimeElapsed === 0)) { console.warn("End Half clicked..."); return; } setIsTimerActive(false); if (gamePeriod === GamePeriod.FIRST_HALF) { setGamePeriod(GamePeriod.HALF_TIME); setTimeLeft(HALF_DURATION_SECONDS); setAddedTimeElapsed(0); } else if (gamePeriod === GamePeriod.SECOND_HALF) { setGamePeriod(GamePeriod.FULL_TIME); } };
  const handleStartNextHalf = (): void => { if (gamePeriod === GamePeriod.HALF_TIME) { setGamePeriod(GamePeriod.SECOND_HALF); setIsTimerActive(true); } };

  // Timer Button Text/Icon Getters
  const getTimerButtonText = (): string => { /* ... (logic remains the same) ... */ if (gamePeriod === GamePeriod.FIRST_HALF) { if (isTimerActive) { return 'Pause 1st'; } else { return timeLeft === HALF_DURATION_SECONDS ? 'Start 1st' : 'Resume 1st'; } } else if (gamePeriod === GamePeriod.HALF_TIME) { return 'Start 2nd'; } else if (gamePeriod === GamePeriod.SECOND_HALF) { if (isTimerActive) { return 'Pause 2nd'; } else { return timeLeft === HALF_DURATION_SECONDS ? 'Start 2nd' : 'Resume 2nd'; } } else { return 'Game Over'; } };
  const getTimerButtonIcon = (): JSX.Element => { /* ... (logic remains the same) ... */ if (!isTimerActive || gamePeriod === GamePeriod.HALF_TIME) { return <Play size={18} />; } else { return <Pause size={18} />; } };

  // Team Name Edit Handlers
  const handleTeamNameChange = (event: ChangeEvent<HTMLInputElement>): void => setTeamName(event.target.value);
  const toggleEditTeam = (): void => setEditingTeam(!editingTeam);

  // --- Player Handlers ---
  const addPlayer = (): void => {
      const name = newPlayer.trim();
      if (!name) return;
      const newPlayerObj: Player = { id: nextPlayerId.current++, name: name, position: null, status: PlayerStatus.BENCH, totalTimePlayed: 0, gender: null, preferredFoot: null, timeByPosition: initialTimeByPosition(), goals: 0 };
      setTeamPlayers((prevPlayers) => [...prevPlayers, newPlayerObj]);
      setNewPlayer('');
  };
  const removePlayer = (id: number): void => setTeamPlayers(prevPlayers => prevPlayers.filter(p => p.id !== id));
  // Explicitly type the value parameter in handlers
  const handlePositionChange = (playerId: number, value: string): void => { const valueToSet = value === '-' ? null : value as Position; setTeamPlayers(prevPlayers => prevPlayers.map(p => p.id === playerId ? { ...p, position: valueToSet } : p )); };
  const handleGenderChange = (playerId: number, value: string): void => { const valueToSet = value === '-' ? null : value as Gender; setTeamPlayers(prevPlayers => prevPlayers.map(p => p.id === playerId ? { ...p, gender: valueToSet } : p )); };
  const handleFootChange = (playerId: number, value: string): void => { const valueToSet = value === '-' ? null : value as Foot; setTeamPlayers(prevPlayers => prevPlayers.map(p => p.id === playerId ? { ...p, preferredFoot: valueToSet } : p )); };
  const togglePlayerStatus = (playerId: number): void => { setTeamPlayers(prevPlayers => prevPlayers.map(player => { if (player.id === playerId) { const newStatus = player.status === PlayerStatus.PLAYING ? PlayerStatus.BENCH : PlayerStatus.PLAYING; return { ...player, status: newStatus }; } return player; })); };

  // --- Goal Scored Handler ---
  const handleGoalScored = (playerId: number): void => {
      setTeamPlayers(prevPlayers => prevPlayers.map(player => {
          if (player.id === playerId) {
              return { ...player, goals: (player.goals || 0) + 1 };
          }
          return player;
      }));
      incrementScore();
  };

  // --- Game Reset Handler ---
  const resetGame = (): void => {
    setScore(0);
    setOpponentScore(0);
    setIsTimerActive(false);
    setTimeLeft(HALF_DURATION_SECONDS);
    setAddedTimeElapsed(0);
    setGamePeriod(GamePeriod.FIRST_HALF);
    setShowReport(false);
    const resetPlayer = (player: Player): Player => ({
        ...player,
        status: PlayerStatus.BENCH,
        totalTimePlayed: 0,
        timeByPosition: initialTimeByPosition(),
        goals: 0
    });
    setTeamPlayers(prev => prev.map(resetPlayer));
  };

  // --- Report Visibility Handlers ---
  const handleShowReport = (): void => setShowReport(true);
  const handleCloseReport = (): void => setShowReport(false);


  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex flex-col items-center p-4 font-sans">
      {/* Main container */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl p-6 md:p-8 relative">

        <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8">Game Tracker</h1>

        {/* Scoreboard & Timer Section */}
        <div className="grid grid-cols-3 gap-4 items-start mb-10 pb-6 border-b">
          {/* Your Team Score Section */}
          <div className="flex flex-col items-center space-y-3">
             <div className="flex items-center space-x-2 w-full justify-center mb-2">
                 {editingTeam ? ( <TeamNameInput value={teamName} onChange={handleTeamNameChange} placeholder="Team Name" /> ) : ( <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 truncate px-2 py-1">{teamName}</h2> )}
                 <button onClick={toggleEditTeam} className="text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0" title="Edit Team Name"><Edit size={18} /></button>
             </div>
             <p className="text-5xl sm:text-6xl font-bold text-blue-600">{score}</p>
             <div className="flex space-x-3">
                 <Button onClick={incrementScore} variant="success" title="Add Goal"><Plus size={20} /></Button>
                 <Button onClick={decrementScore} variant="danger" title="Remove Goal"><Minus size={20} /></Button>
             </div>
          </div>
          {/* Timer Section */}
          <div className="flex flex-col items-center justify-start space-y-2 pt-2">
             <div className={`text-lg font-semibold mb-1 ${isInAddedTime ? 'text-red-600' : 'text-gray-700'}`}>{getPeriodDisplay(gamePeriod, timeLeft === 0 && addedTimeElapsed > 0)}</div>
             <div className={`text-5xl sm:text-6xl font-mono font-semibold ${isInAddedTime ? 'text-red-500' : 'text-gray-800'}`}> {timeLeft > 0 ? formatTime(timeLeft) : `${formatTime(addedTimeElapsed)}`} {isInAddedTime && <span className="text-2xl align-baseline"> +AT</span>} </div>
             <div className="flex space-x-3 items-center h-10">
                 {(gamePeriod === GamePeriod.FIRST_HALF || gamePeriod === GamePeriod.SECOND_HALF || gamePeriod === GamePeriod.HALF_TIME) && ( <Button onClick={gamePeriod === GamePeriod.HALF_TIME ? handleStartNextHalf : handleTimerControl} variant="primary" className="w-28" disabled={gamePeriod === GamePeriod.FULL_TIME} title={getTimerButtonText()}> {getTimerButtonIcon()} <span className="ml-1.5">{getTimerButtonText()}</span> </Button> )}
                 {isTimerActive && (timeLeft === 0 && addedTimeElapsed >= 0) && (gamePeriod === GamePeriod.FIRST_HALF || gamePeriod === GamePeriod.SECOND_HALF) && ( <Button onClick={handleEndHalf} variant="danger" className="w-28" title="Manually End Half"> <StopCircle size={18} /> <span className="ml-1.5">End Half</span> </Button> )}
                 {gamePeriod === GamePeriod.FULL_TIME && ( <span className="font-semibold text-gray-600">Game Over</span> )}
             </div>
             {gamePeriod === GamePeriod.HALF_TIME && <p className="text-blue-600 font-semibold mt-2">Halftime!</p>}
             {gamePeriod === GamePeriod.FULL_TIME && <p className="text-red-600 font-semibold mt-2">Full Time!</p>}
          </div>
          {/* Opponent Score Section */}
          <div className="flex flex-col items-center space-y-3">
             <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 truncate px-2 py-1 mb-2">Opponent</h2>
             <p className="text-5xl sm:text-6xl font-bold text-gray-600">{opponentScore}</p>
             <div className="flex space-x-3">
                 <Button onClick={incrementOpponentScore} variant="success" title="Add Opponent Goal"><Plus size={20} /></Button>
                 <Button onClick={decrementOpponentScore} variant="danger" title="Remove Opponent Goal"><Minus size={20} /></Button>
             </div>
          </div>
        </div>

        {/* Player Management Section */}
        <div className="mb-10">
            <div>
                <h3 className="text-xl font-semibold text-blue-700 mb-3 flex items-center">
                    <span className="mr-2">{teamName} - Players</span>
                    <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{teamPlayers.filter(p => p.status === PlayerStatus.PLAYING).length} Playing</span>
                </h3>
                <PlayerInput value={newPlayer} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPlayer(e.target.value)} onAdd={addPlayer} placeholder="Add Player Name" />
                <ul className="mt-4 max-h-96 overflow-y-auto pr-2 space-y-2">
                    {teamPlayers.length === 0 && <p className="text-gray-500 italic text-sm px-2">No players added yet.</p>}
                    {teamPlayers.map(player => (
                        <PlayerListItem
                            key={player.id}
                            player={player}
                            onPositionChange={handlePositionChange}
                            onGenderChange={handleGenderChange}
                            onFootChange={handleFootChange}
                            onGoalScored={handleGoalScored}
                            onRemove={removePlayer}
                            onToggleStatus={togglePlayerStatus}
                        />
                    ))}
                 </ul>
            </div>
        </div>

        {/* Controls Section (Reset & Report) */}
        <div className="text-center mt-10 border-t pt-6 flex justify-center space-x-4">
          <Button onClick={resetGame} variant="warning" className="w-36" title="Reset Game to Beginning of 1st Half">
            <RotateCcw size={18} className="mr-2"/> Reset Game
          </Button>
           {gamePeriod === GamePeriod.FULL_TIME && (
              <Button onClick={handleShowReport} variant="secondary" className="w-36" title="View End Game Report">
                <FileText size={18} className="mr-2"/> View Report
              </Button>
           )}
        </div>

        {/* Render Report Modal conditionally */}
        {showReport && (
            <GameReport
                teamPlayers={teamPlayers}
                teamName={teamName}
                onClose={handleCloseReport}
            />
        )}

      </div>
       <footer className="text-center text-gray-500 text-sm mt-6 pb-4">
            Game Tracker (Single Team). {HALF_DURATION_MINUTES} min halves + Added Time.
       </footer>
    </div>
  );
}

export default Home;
