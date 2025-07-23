import React, { useState, useEffect, useCallback } from 'react';

// A unique ID for each tile
let idCounter = 1;


// Creates a new tile object
const createTile = (value, row, col, isNew = false, isMerged = false) => ({
  id: idCounter++,
  value,
  row,
  col,
  isNew,
  isMerged,
});

// Creates the initial set of tiles
const getInitialTiles = () => {
  const tiles = [];
  const pos1 = { r: Math.floor(Math.random() * 4), c: Math.floor(Math.random() * 4) };
  let pos2 = { r: Math.floor(Math.random() * 4), c: Math.floor(Math.random() * 4) };
  while (pos1.r === pos2.r && pos1.c === pos2.c) {
    pos2 = { r: Math.floor(Math.random() * 4), c: Math.floor(Math.random() * 4) };
  }
  tiles.push(createTile(2, pos1.r, pos1.c, true));
  tiles.push(createTile(2, pos2.r, pos2.c, true));
  return tiles;
};



// Tile component: Renders a single tile with animations
const Tile = ({ tile }) => {
  const { value, row, col, isNew, isMerged } = tile;
  
  const tileColors = {
    2: 'bg-yellow-100 text-gray-800', 4: 'bg-yellow-200 text-gray-800',
    8: 'bg-orange-400 text-white', 16: 'bg-orange-500 text-white',
    32: 'bg-red-500 text-white', 64: 'bg-red-600 text-white',
    128: 'bg-yellow-400 text-white', 256: 'bg-yellow-500 text-white',
    512: 'bg-yellow-600 text-white', 1024: 'bg-indigo-400 text-white',
    2048: 'bg-indigo-600 text-white',
  };

  const colorClass = tileColors[value] || 'bg-black text-white';
  const textSizeClass = value > 1000 ? 'text-2xl' : 'text-3xl';

  // Dynamic styles for position and animation
  const style = {
    transform: `translate(${col * 100}%, ${row * 100}%)`,
    zIndex: value,
  };

  // Animation classes
  let animationClass = '';
  if (isNew) animationClass = 'animate-appear';
  if (isMerged) animationClass = 'animate-pop';

  return (
    <div
      // Padding on each tile creates the visual gap between them
      className={`absolute w-1/4 h-1/4 p-1 md:p-1.5 transition-transform duration-200 ease-in-out`}
      style={style}
    >
      <div
        className={`w-full h-full flex items-center justify-center rounded-md font-bold ${colorClass} ${textSizeClass} ${animationClass}`}
      >
        {value > 0 ? value : ''}
      </div>
    </div>
  );
};

export default function App() {
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const startGame = useCallback(() => {
    idCounter = 1; 
    setTiles(getInitialTiles());
    setScore(0);
    setGameOver(false);
  }, []);

  const addRandomTile = (currentTiles) => {
    const newTiles = [...currentTiles];
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!newTiles.some(t => t.row === r && t.col === c)) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      newTiles.push(createTile(value, r, c, true));
    }
    return newTiles;
  };

  const move = useCallback((direction) => {
    if (gameOver) return;

    let currentTiles = JSON.parse(JSON.stringify(tiles)).map(t => ({...t, isNew: false, isMerged: false}));
    let board = Array(4).fill(null).map(() => Array(4).fill(null));
    currentTiles.forEach(t => { board[t.row][t.col] = t; });

    const getVector = (dir) => ({ up: { r: -1, c: 0 }, down: { r: 1, c: 0 }, left: { r: 0, c: -1 }, right: { r: 0, c: 1 } }[dir]);
    const vector = getVector(direction);
    
    let moved = false;
    let scoreToAdd = 0;
    const mergedIds = new Set();

    const traversals = {
      up: { r: [0, 1, 2, 3], c: [0, 1, 2, 3] },
      down: { r: [3, 2, 1, 0], c: [0, 1, 2, 3] },
      left: { r: [0, 1, 2, 3], c: [0, 1, 2, 3] },
      right: { r: [0, 1, 2, 3], c: [3, 2, 1, 0] },
    };

    traversals[direction].r.forEach(r => {
      traversals[direction].c.forEach(c => {
        const tile = board[r][c];
        if (tile) {
          let currentPos = { r, c };
          let nextPos;
          
          while (true) {
            nextPos = { r: currentPos.r + vector.r, c: currentPos.c + vector.c };
            if (nextPos.r < 0 || nextPos.r >= 4 || nextPos.c < 0 || nextPos.c >= 4) break; // Out of bounds
            const nextTile = board[nextPos.r][nextPos.c];
            if (nextTile) {
              if (nextTile.value === tile.value && !mergedIds.has(nextTile.id) && !mergedIds.has(tile.id)) {
                // Merge
                board[r][c] = null;
                nextTile.value *= 2;
                nextTile.isMerged = true;
                mergedIds.add(tile.id);
                tile.row = nextPos.r;
                tile.col = nextPos.c;
                scoreToAdd += nextTile.value;
                moved = true;
              }
              break; // Blocked
            }
            currentPos = nextPos;
          }

          if (currentPos.r !== r || currentPos.c !== c) {
            // Move tile
            board[r][c] = null;
            board[currentPos.r][currentPos.c] = tile;
            tile.row = currentPos.r;
            tile.col = currentPos.c;
            moved = true;
          }
        }
      });
    });

    if (moved) {
      let finalTiles = currentTiles.filter(t => !mergedIds.has(t.id));
      finalTiles = addRandomTile(finalTiles);
      setTiles(finalTiles);
      setScore(s => s + scoreToAdd);

      // Check for game over after move
      const hasEmptyCell = finalTiles.length < 16;
      if (!hasEmptyCell) {
          let canMove = false;
          for(let t of finalTiles) {
              for(let dir of ['up', 'down', 'left', 'right']) {
                  const v = getVector(dir);
                  const neighborPos = {r: t.row + v.r, c: t.col + v.c};
                  if (neighborPos.r >= 0 && neighborPos.r < 4 && neighborPos.c >= 0 && neighborPos.c < 4) {
                      const neighbor = finalTiles.find(nt => nt.row === neighborPos.r && nt.col === neighborPos.c);
                      if (neighbor && neighbor.value === t.value) {
                          canMove = true;
                          break;
                      }
                  }
              }
              if (canMove) break;
          }
          if (!canMove) setGameOver(true);
      }
    }
  }, [tiles, gameOver]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    const directionMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const direction = directionMap[e.key];
    if (direction) {
      e.preventDefault();
      move(direction);
    }
  }, [move]);

  // Initial setup and event listeners
  useEffect(() => {
    setIsClient(true);
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (isClient) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isClient, handleKeyDown]);

  if (!isClient) return null;

  return (
    <>
      <style>{`
        @keyframes appear {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-appear { animation: appear 0.2s ease-in-out; }
        .animate-pop { animation: pop 0.2s ease-in-out; }
      `}</style>
      <div className="bg-slate-800 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="flex justify-between items-center w-full mb-4">
            <h1 className="text-5xl font-bold text-yellow-400">2048</h1>
            <div className="flex space-x-2">
              <div className="bg-gray-700 p-2 px-4 rounded-lg text-center">
                <div className="text-xs text-gray-400">SCORE</div>
                <div className="text-xl font-bold">{score}</div>
              </div>
              <button onClick={startGame} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                New Game
              </button>
            </div>
          </div>

          <div className="bg-gray-700 p-2 md:p-3 rounded-lg relative w-full aspect-square">
            {gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-lg z-50">
                <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
                <button onClick={startGame} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Try Again
                </button>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 md:gap-3 w-full h-full">
              {Array(16).fill(null).map((_, i) => (
                <div key={i} className="bg-gray-600 rounded-md"></div>
              ))}
            </div>
            <div className="absolute inset-0">
              {tiles.map(tile => <Tile key={tile.id} tile={tile} />)}
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-400">
            <p>Use your <span className="font-bold text-gray-300">arrow keys</span> to move the tiles.</p>
            <p>When two tiles with the same number touch, they <span className="font-bold text-gray-300">merge into one!</span></p>
          </div>
        </div>
      </div>
    </>
  );
}
