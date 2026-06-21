const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const gameWinElement = document.getElementById('game-win');

const tileSize = 30;
let score = 0;
let gameOver = false;
let gameWin = false;
let currentDifficulty = 'normal';

document.getElementById('difficulty').addEventListener('change', (e) => {
    currentDifficulty = e.target.value;
    initGame();
});

// 19x19 map
// 0: empty, 1: wall, 2: dot, 3: power pellet
const initialMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = [];
let totalDots = 0;

let pacman = {};
let ghosts = [];

function initGame() {
    map = initialMap.map(row => [...row]);
    score = 0;
    totalDots = 0;
    gameOver = false;
    gameWin = false;
    scoreElement.innerText = score;
    gameOverElement.classList.add('hidden');
    gameWinElement.classList.add('hidden');

    pacman = { 
        x: 9, y: 15, vx: 0, vy: 0, nextVx: 0, nextVy: 0, 
        mouthOpen: 0, mouthDir: 1, 
        accumulatedTime: 0, moveInterval: 120,
        drawPx: 9 * tileSize + tileSize/2, drawPy: 15 * tileSize + tileSize/2
    };
    
    // Calculate custom ghost move interval so they move smoothly but at different speeds
    let ghostSpeedMultipliers = { easy: 0.55, normal: 0.8, hard: 1.0 };
    let speedMult = ghostSpeedMultipliers[currentDifficulty];
    let gInterval = 120 / speedMult;

    ghosts = [
        { x: 9, y: 9, color: 'red', vx: 1, vy: 0, wait: 0, accumulatedTime: 0, moveInterval: gInterval, drawPx: 9*tileSize+tileSize/2, drawPy: 9*tileSize+tileSize/2 },
        { x: 8, y: 9, color: 'pink', vx: -1, vy: 0, wait: 1200, accumulatedTime: 0, moveInterval: gInterval, drawPx: 8*tileSize+tileSize/2, drawPy: 9*tileSize+tileSize/2 },
        { x: 10, y: 9, color: 'cyan', vx: 0, vy: -1, wait: 2400, accumulatedTime: 0, moveInterval: gInterval, drawPx: 10*tileSize+tileSize/2, drawPy: 9*tileSize+tileSize/2 },
    ];

    for(let r=0; r<map.length; r++) {
        for(let c=0; c<map[r].length; c++) {
            if(map[r][c] === 2 || map[r][c] === 3) totalDots++;
        }
    }
    
    lastTime = performance.now();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', e => {
    // Prevent default scrolling for arrow keys
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    if(e.key === 'ArrowLeft') { pacman.nextVx = -1; pacman.nextVy = 0; }
    if(e.key === 'ArrowRight') { pacman.nextVx = 1; pacman.nextVy = 0; }
    if(e.key === 'ArrowUp') { pacman.nextVx = 0; pacman.nextVy = -1; }
    if(e.key === 'ArrowDown') { pacman.nextVx = 0; pacman.nextVy = 1; }
});

document.getElementById('restart-btn').addEventListener('click', initGame);
document.getElementById('restart-win-btn').addEventListener('click', initGame);

let lastTime = 0;

function canMove(x, y, vx, vy) {
    let nx = x + vx;
    let ny = y + vy;
    
    // Tunnel
    if (ny === 9) {
        if (nx < 0) nx = map[0].length - 1;
        if (nx >= map[0].length) nx = 0;
    }
    
    if (nx >= 0 && nx < map[0].length && ny >= 0 && ny < map.length) {
        return map[ny][nx] !== 1;
    }
    return false;
}

function update(time) {
    if(gameOver || gameWin) return;
    
    let dt = time - lastTime;
    lastTime = time;
    
    // Animate mouth
    pacman.mouthOpen += 0.2 * pacman.mouthDir;
    if(pacman.mouthOpen >= 0.5 || pacman.mouthOpen <= 0) {
        pacman.mouthDir *= -1;
    }

    // PACMAN UPDATE LOGIC
    pacman.accumulatedTime += dt;
    if(pacman.accumulatedTime >= pacman.moveInterval) {
        pacman.accumulatedTime -= pacman.moveInterval;
        
        // Try turning
        if((pacman.nextVx !== 0 || pacman.nextVy !== 0) && canMove(pacman.x, pacman.y, pacman.nextVx, pacman.nextVy)) {
            pacman.vx = pacman.nextVx;
            pacman.vy = pacman.nextVy;
        }
        
        // Move pacman
        if(canMove(pacman.x, pacman.y, pacman.vx, pacman.vy)) {
            pacman.x += pacman.vx;
            pacman.y += pacman.vy;
            
            // Tunnel
            if(pacman.y === 9) {
                if(pacman.x < 0) pacman.x = map[0].length - 1;
                else if(pacman.x >= map[0].length) pacman.x = 0;
            }
            
            // Eat dot
            if(map[pacman.y][pacman.x] === 2) {
                map[pacman.y][pacman.x] = 0;
                score += 10;
                totalDots--;
            } else if(map[pacman.y][pacman.x] === 3) {
                map[pacman.y][pacman.x] = 0;
                score += 50;
                totalDots--;
            }
            scoreElement.innerText = score;
            
            if(totalDots === 0) {
                gameWin = true;
                gameWinElement.classList.remove('hidden');
            }
        } else {
            pacman.accumulatedTime = 0; // prevent visual jitter against walls
        }
    }
    
    // GHOSTS UPDATE LOGIC
    ghosts.forEach(g => {
        if(g.wait > 0) {
            g.wait -= dt;
            g.drawPx = g.x * tileSize + tileSize/2;
            g.drawPy = g.y * tileSize + tileSize/2;
            return;
        }
        
        g.accumulatedTime += dt;
        if(g.accumulatedTime >= g.moveInterval) {
            g.accumulatedTime -= g.moveInterval;
            
            let possibleMoves = [
                {vx: 1, vy: 0}, {vx: -1, vy: 0}, {vx: 0, vy: 1}, {vx: 0, vy: -1}
            ];
            
            let validMoves = possibleMoves.filter(m => 
                canMove(g.x, g.y, m.vx, m.vy) && !(m.vx === -g.vx && m.vy === -g.vy) // Don't reverse unless dead end
            );
            
            if(validMoves.length === 0) {
                // dead end, reverse
                g.vx = -g.vx;
                g.vy = -g.vy;
            } else {
                let isAggressive = false;
                if(currentDifficulty === 'hard') isAggressive = true;
                else if(currentDifficulty === 'normal') isAggressive = Math.random() < 0.6;
                else if(currentDifficulty === 'easy') isAggressive = Math.random() < 0.2;
                
                if (isAggressive) {
                    let bestMove = validMoves[0];
                    let minDist = Infinity;
                    
                    validMoves.forEach(m => {
                        let nx = g.x + m.vx;
                        let ny = g.y + m.vy;
                        let dist = Math.pow(nx - pacman.x, 2) + Math.pow(ny - pacman.y, 2);
                        
                        dist += Math.random() * 2; // prevent perfect stacking
                        
                        if(dist < minDist) {
                            minDist = dist;
                            bestMove = m;
                        }
                    });
                    
                    g.vx = bestMove.vx;
                    g.vy = bestMove.vy;
                } else {
                    let move = validMoves[Math.floor(Math.random() * validMoves.length)];
                    g.vx = move.vx;
                    g.vy = move.vy;
                }
            }
            
            if(canMove(g.x, g.y, g.vx, g.vy)) {
                g.x += g.vx;
                g.y += g.vy;
                
                // Tunnel for ghosts
                if(g.y === 9) {
                    if(g.x < 0) g.x = map[0].length - 1;
                    else if(g.x >= map[0].length) g.x = 0;
                }
            } else {
                g.accumulatedTime = 0;
            }
        }
    });
    
    // Calculate interpolated positions for smooth drawing & precise collision
    let pt = Math.min(1, pacman.accumulatedTime / pacman.moveInterval);
    let pdx = 0; let pdy = 0;
    if(canMove(pacman.x, pacman.y, pacman.vx, pacman.vy)) {
        pdx = pacman.vx * pt;
        pdy = pacman.vy * pt;
    }
    pacman.drawPx = (pacman.x + pdx) * tileSize + tileSize/2;
    pacman.drawPy = (pacman.y + pdy) * tileSize + tileSize/2;
    
    ghosts.forEach(g => {
        if (g.wait > 0) return;
        
        let gt = Math.min(1, g.accumulatedTime / g.moveInterval);
        let gdx = 0; let gdy = 0;
        if(canMove(g.x, g.y, g.vx, g.vy)) {
            gdx = g.vx * gt;
            gdy = g.vy * gt;
        }
        g.drawPx = (g.x + gdx) * tileSize + tileSize/2;
        g.drawPy = (g.y + gdy) * tileSize + tileSize/2;
        
        // Advanced Pixel-Perfect Collision Detection
        // Because pacman and ghosts update on independent timers now, we check their exact pixel distance!
        let dist = Math.hypot(pacman.drawPx - g.drawPx, pacman.drawPy - g.drawPy);
        if(dist < tileSize * 0.7) { 
            gameOver = true;
            gameOverElement.classList.remove('hidden');
        }
    });
    
    draw();
    if(!gameOver && !gameWin) {
        requestAnimationFrame(update);
    }
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for(let r=0; r<map.length; r++) {
        for(let c=0; c<map[r].length; c++) {
            let x = c * tileSize;
            let y = r * tileSize;
            
            if(map[r][c] === 1) {
                ctx.fillStyle = '#1e3a8a'; // Wall color
                ctx.fillRect(x, y, tileSize, tileSize);
            } else if(map[r][c] === 2) {
                ctx.fillStyle = '#fde047'; // Dot
                ctx.beginPath();
                ctx.arc(x + tileSize/2, y + tileSize/2, 3, 0, Math.PI*2);
                ctx.fill();
            } else if(map[r][c] === 3) {
                ctx.fillStyle = '#fde047'; // Power pellet
                ctx.beginPath();
                ctx.arc(x + tileSize/2, y + tileSize/2, 6, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
    
    // Draw pacman
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    
    let angle = 0;
    if(pacman.vx === 1) angle = 0;
    else if(pacman.vx === -1) angle = Math.PI;
    else if(pacman.vy === 1) angle = Math.PI/2;
    else if(pacman.vy === -1) angle = -Math.PI/2;
    else if(pacman.nextVx === -1) angle = Math.PI; // handle initial standing state
    else if(pacman.nextVy === -1) angle = -Math.PI/2;
    else if(pacman.nextVy === 1) angle = Math.PI/2;
    
    let mouth = pacman.mouthOpen * Math.PI / 2;
    
    ctx.arc(pacman.drawPx, pacman.drawPy, tileSize/2 - 2, angle + mouth, angle + Math.PI*2 - mouth);
    ctx.lineTo(pacman.drawPx, pacman.drawPy);
    ctx.fill();
    
    // Draw ghosts
    ghosts.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.drawPx, g.drawPy, tileSize/2 - 2, Math.PI, 0);
        ctx.lineTo(g.drawPx + tileSize/2 - 2, g.drawPy + tileSize/2 - 2);
        
        // Wavy bottom
        ctx.lineTo(g.drawPx + tileSize/4, g.drawPy + tileSize/2 - 5);
        ctx.lineTo(g.drawPx, g.drawPy + tileSize/2 - 2);
        ctx.lineTo(g.drawPx - tileSize/4, g.drawPy + tileSize/2 - 5);
        
        ctx.lineTo(g.drawPx - tileSize/2 + 2, g.drawPy + tileSize/2 - 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(g.drawPx - 4, g.drawPy - 2, 3, 0, Math.PI*2);
        ctx.arc(g.drawPx + 4, g.drawPy - 2, 3, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        let ex = 0, ey = 0;
        if(g.vx === 1) ex = 1;
        if(g.vx === -1) ex = -1;
        if(g.vy === 1) ey = 1;
        if(g.vy === -1) ey = -1;
        
        ctx.arc(g.drawPx - 4 + ex, g.drawPy - 2 + ey, 1.5, 0, Math.PI*2);
        ctx.arc(g.drawPx + 4 + ex, g.drawPy - 2 + ey, 1.5, 0, Math.PI*2);
        ctx.fill();
    });
}

// Start game
initGame();
