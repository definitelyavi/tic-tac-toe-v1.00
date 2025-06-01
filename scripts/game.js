// === Game Logic ===
const board = document.getElementById("game-board");
const cells = document.querySelectorAll(".cell");
const scoreX = document.getElementById("score-x");
const scoreTie = document.getElementById("score-tie");
const scoreO = document.getElementById("score-o");
const gameStatus = document.getElementById("game-status");
const modeButtons = document.querySelectorAll(".mode-btn");
const resetButton = document.getElementById("reset-game");
const muteButton = document.getElementById("mute-toggle");

let currentPlayer = "x";
let gameActive = true;
let scores = { x: 0, tie: 0, o: 0 };
let gameMode = "ai"; // "ai" or "multiplayer"
let boardState = Array(9).fill("");
let isMuted = false;

// Winning combinations
const winCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Sound Effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
  if (isMuted) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playClickSound() {
  playSound(800, 0.1, 'square');
}

function playWinSound() {
  // Happy ascending melody
  playSound(523, 0.2); // C
  setTimeout(() => playSound(659, 0.2), 100); // E
  setTimeout(() => playSound(784, 0.3), 200); // G
}

function playLoseSound() {
  // Sad descending melody
  playSound(392, 0.3); // G
  setTimeout(() => playSound(330, 0.3), 150); // E
  setTimeout(() => playSound(262, 0.4), 300); // C
}

function playTieSound() {
  // Neutral sound
  playSound(440, 0.5, 'triangle');
}

// Mute functionality
function toggleMute() {
  isMuted = !isMuted;
  muteButton.classList.toggle('muted', isMuted);
  
  const soundOn = muteButton.querySelector('.sound-on');
  const soundOff = muteButton.querySelector('.sound-off');
  
  if (isMuted) {
    soundOn.style.display = 'none';
    soundOff.style.display = 'block';
  } else {
    soundOn.style.display = 'block';
    soundOff.style.display = 'none';
  }
}

// Event Listeners
cells.forEach((cell, index) => {
  cell.addEventListener("click", () => handleClick(index));
});

modeButtons.forEach(btn => {
  btn.addEventListener("click", () => switchMode(btn.dataset.mode));
});

resetButton.addEventListener("click", resetScores);
muteButton.addEventListener("click", toggleMute);

function switchMode(mode) {
  gameMode = mode;
  modeButtons.forEach(btn => btn.classList.remove("active"));
  document.querySelector(`[data-mode="${mode}"]`).classList.add("active");
  
  // Update scoreboard labels
  if (mode === "ai") {
    scoreO.querySelector('.score-label').textContent = "Computer (O)";
    gameStatus.textContent = currentPlayer === "x" ? "Your turn" : "AI thinking...";
  } else {
    scoreO.querySelector('.score-label').textContent = "Player 2 (O)";
    gameStatus.textContent = currentPlayer === "x" ? "Player 1's turn" : "Player 2's turn";
  }
  
  resetGame();
}

function updateGameStatus() {
  if (!gameActive) return;
  
  // Remove active class from all scores
  document.querySelectorAll('.score').forEach(score => score.classList.remove('active'));
  
  if (gameMode === "ai") {
    gameStatus.textContent = currentPlayer === "x" ? "Your turn" : "AI thinking...";
    if (currentPlayer === "o") {
      gameStatus.classList.add("ai-thinking");
      scoreO.classList.add("active");
    } else {
      gameStatus.classList.remove("ai-thinking");
      scoreX.classList.add("active");
    }
  } else {
    gameStatus.textContent = currentPlayer === "x" ? "Player 1's turn" : "Player 2's turn";
    if (currentPlayer === "x") {
      scoreX.classList.add("active");
    } else {
      scoreO.classList.add("active");
    }
  }
}

function handleClick(index) {
  if (!gameActive || boardState[index] !== "" || (gameMode === "ai" && currentPlayer === "o")) {
    return;
  }

  makeMove(index, currentPlayer);
}

function makeMove(index, player) {
  playClickSound();
  
  boardState[index] = player;
  cells[index].classList.add(player);
  
  // Create symbol element
  const symbolDiv = document.createElement('div');
  symbolDiv.className = 'symbol';
  cells[index].appendChild(symbolDiv);
  
  // Animation
  cells[index].style.opacity = "0";
  cells[index].style.transform = "scale(0.8)";
  setTimeout(() => {
    cells[index].style.transition = "opacity 0.2s ease, transform 0.2s ease";
    cells[index].style.opacity = "1";
    cells[index].style.transform = "scale(1)";
  }, 10);

  if (checkWin(player)) {
    gameActive = false;
    highlightWinLose(player);
    updateScore(player);
    
    if (gameMode === "ai") {
      if (player === "x") {
        gameStatus.textContent = "You win! 🎉";
        playWinSound();
      } else {
        gameStatus.textContent = "AI wins! 🤖";
        playLoseSound();
      }
    } else {
      gameStatus.textContent = `Player ${player.toUpperCase()} wins! 🎉`;
      playWinSound();
    }
    
    setTimeout(resetGame, 3000);
    return;
  }

  if (boardState.every(cell => cell !== "")) {
    gameActive = false;
    updateScore("tie");
    gameStatus.textContent = "It's a tie! 🤝";
    playTieSound();
    setTimeout(resetGame, 2000);
    return;
  }

  currentPlayer = currentPlayer === "x" ? "o" : "x";
  updateGameStatus();

  // AI move
  if (gameMode === "ai" && currentPlayer === "o" && gameActive) {
    setTimeout(makeAIMove, 500); // Small delay for better UX
  }
}

function makeAIMove() {
  const bestMove = getBestMove();
  if (bestMove !== -1) {
    makeMove(bestMove, "o");
  }
}

function getBestMove() {
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === "") {
      boardState[i] = "o";
      if (checkWin("o")) {
        boardState[i] = "";
        return i;
      }
      boardState[i] = "";
    }
  }

  // Block player from winning
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === "") {
      boardState[i] = "x";
      if (checkWin("x")) {
        boardState[i] = "";
        return i;
      }
      boardState[i] = "";
    }
  }

  // Take center if available
  if (boardState[4] === "") {
    return 4;
  }

  // Take corners
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(i => boardState[i] === "");
  if (availableCorners.length > 0) {
    return availableCorners[Math.floor(Math.random() * availableCorners.length)];
  }

  // Take any available spot
  const available = [];
  for (let i = 0; i < 9; i++) {
    if (boardState[i] === "") {
      available.push(i);
    }
  }
  
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : -1;
}

function checkWin(player) {
  return winCombos.some(combo => {
    return combo.every(index => boardState[index] === player);
  });
}

function highlightWinLose(winner) {
  const winningCombo = winCombos.find(combo => {
    return combo.every(index => boardState[index] === winner);
  });
  
  if (winningCombo) {
    // Make winning pieces blink
    winningCombo.forEach(index => {
      cells[index].classList.add("winning");
    });
    
    // Make losing pieces fade to gray
    cells.forEach((cell, index) => {
      if (!winningCombo.includes(index) && boardState[index] !== "") {
        cell.classList.add("losing");
      }
    });
  }
}

function updateScore(winner) {
  scores[winner]++;
  
  if (winner === "x") {
    scoreX.querySelector('.score-number').textContent = scores.x;
  } else if (winner === "o") {
    scoreO.querySelector('.score-number').textContent = scores.o;
  } else {
    scoreTie.querySelector('.score-number').textContent = scores.tie;
  }
}

function resetGame() {
  gameActive = true;
  currentPlayer = "x";
  boardState = Array(9).fill("");
  
  cells.forEach(cell => {
    cell.classList.remove("x", "o", "win", "fade", "winning", "losing");
    cell.innerHTML = "";
    cell.style.opacity = "1";
    cell.style.transform = "scale(1)";
    cell.style.transition = "";
  });

  // Remove all active highlights
  document.querySelectorAll('.score').forEach(score => score.classList.remove('active'));
  
  updateGameStatus();
}

function resetScores() {
  scores = { x: 0, tie: 0, o: 0 };
  scoreX.querySelector('.score-number').textContent = "0";
  scoreTie.querySelector('.score-number').textContent = "0";
  scoreO.querySelector('.score-number').textContent = "0";
  
  resetGame();
}

// Initialize game
updateGameStatus();