const canvas = document.getElementById('flappyCanvas');
const ctx = canvas.getContext('2d');

// Fixed logical resolution for consistent physics
canvas.width = 400;
canvas.height = 800;

// Game State
let bird = { x: 80, y: 400, size: 24, vy: 0 };
let gravity = 1800;
let flapPower = -600;
let gameSpeed = 250;

let pipes = [];
let particles = [];
let score = 0;
let bestScore = localStorage.getItem('neonFlapBest') || 0;

let isPlaying = false;
let isDead = false;
let pipeTimer = 0;
let lastTime = 0;
let bgOffset = 0;

document.getElementById('best-score').innerText = `Best: ${bestScore}`;

// --- Inputs ---
function flap() {
    if (isDead) return;
    
    if (!isPlaying) {
        // First flap starts the game
        document.getElementById('start-screen').classList.add('hidden');
        isPlaying = true;
    }
    
    bird.vy = flapPower;
    
    // Spawn flap particles
    for(let i=0; i<10; i++) {
        particles.push({
            x: bird.x,
            y: bird.y + bird.size,
            vx: (Math.random() - 0.5) * 100,
            vy: Math.random() * 200,
            life: 1.0,
            color: '#06b6d4'
        });
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') flap();
});
window.addEventListener('touchstart', flap);
window.addEventListener('mousedown', flap);

// --- Game Loop ---
function startGame() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    bird = { x: 80, y: 400, size: 24, vy: 0 };
    pipes = [];
    particles = [];
    score = 0;
    document.getElementById('score-display').innerText = score;
    isPlaying = false;
    isDead = false;
    pipeTimer = 0;
    bgOffset = 0;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    isDead = true;
    isPlaying = false;
    
    // Explosion particles
    for(let i=0; i<50; i++) {
        particles.push({
            x: bird.x + bird.size/2,
            y: bird.y + bird.size/2,
            vx: (Math.random() - 0.5) * 600,
            vy: (Math.random() - 0.5) * 600,
            life: 1.5,
            color: '#ef4444'
        });
    }
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonFlapBest', bestScore);
    }
    
    document.getElementById('final-score').innerText = `Score: ${score}`;
    document.getElementById('best-score').innerText = `Best: ${bestScore}`;
    document.getElementById('game-over').classList.remove('hidden');
}

function spawnPipe() {
    let gapSize = 200;
    let minPipeHeight = 100;
    let maxPipeHeight = canvas.height - gapSize - minPipeHeight;
    
    let topHeight = minPipeHeight + Math.random() * (maxPipeHeight - minPipeHeight);
    
    pipes.push({
        x: canvas.width,
        w: 60,
        topHeight: topHeight,
        bottomY: topHeight + gapSize,
        passed: false
    });
}

function update(dt) {
    if (!isPlaying && !isDead) {
        // Hover animation before starting
        bird.y = 400 + Math.sin(performance.now() / 200) * 10;
        return;
    }
    
    if (isDead) {
        // Bird falls to bottom
        bird.vy += gravity * dt;
        bird.y += bird.vy * dt;
        if (bird.y > canvas.height) bird.y = canvas.height;
    } else {
        // Normal gameplay physics
        bird.vy += gravity * dt;
        bird.y += bird.vy * dt;
        
        // Trail particles
        particles.push({
            x: bird.x,
            y: bird.y + bird.size/2 + (Math.random()-0.5)*10,
            vx: -gameSpeed * 0.5,
            vy: 0,
            life: 0.5,
            color: 'rgba(6, 182, 212, 0.5)'
        });
        
        // Scroll Background
        bgOffset += gameSpeed * 0.5 * dt;
        if (bgOffset > 40) bgOffset -= 40;
        
        // Pipes
        pipeTimer -= dt;
        if (pipeTimer <= 0) {
            spawnPipe();
            pipeTimer = 1.5; // spawn every 1.5 seconds
        }
        
        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i];
            p.x -= gameSpeed * dt;
            
            // Score
            if (!p.passed && bird.x > p.x + p.w) {
                p.passed = true;
                score++;
                document.getElementById('score-display').innerText = score;
                // Speed up slightly
                gameSpeed += 2; 
            }
            
            // Collision
            if (bird.x + bird.size > p.x && bird.x < p.x + p.w) {
                if (bird.y < p.topHeight || bird.y + bird.size > p.bottomY) {
                    gameOver();
                }
            }
            
            if (p.x + p.w < 0) pipes.splice(i, 1);
        }
        
        // Floor / Ceiling Collision
        if (bird.y < 0 || bird.y + bird.size > canvas.height) {
            gameOver();
        }
    }
    
    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    // Clear Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Scrolling Grid (Synthwave aesthetic)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width + 40; i += 40) {
        ctx.moveTo(i - bgOffset, 0);
        ctx.lineTo(i - bgOffset, canvas.height);
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    // Draw Pipes
    for (let p of pipes) {
        // Top Pipe
        let grad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
        grad.addColorStop(0, '#7e22ce');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#7e22ce');
        
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, p.w, p.topHeight);
        
        // Bottom Pipe
        ctx.fillRect(p.x, p.bottomY, p.w, canvas.height - p.bottomY);
        
        // Glowing Pipe Caps
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#a855f7';
        ctx.fillStyle = '#d8b4fe';
        ctx.fillRect(p.x - 5, p.topHeight - 20, p.w + 10, 20);
        ctx.fillRect(p.x - 5, p.bottomY, p.w + 10, 20);
        ctx.shadowBlur = 0;
    }

    // Draw Particles
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }

    // Draw Bird
    if (!isDead || bird.y < canvas.height) {
        ctx.save();
        ctx.translate(bird.x + bird.size/2, bird.y + bird.size/2);
        
        // Rotate bird based on vertical velocity
        let angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy * 0.001)));
        ctx.rotate(angle);
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = isDead ? '#ef4444' : '#06b6d4';
        ctx.fillStyle = isDead ? '#ef4444' : '#06b6d4';
        
        ctx.fillRect(-bird.size/2, -bird.size/2, bird.size, bird.size);
        
        // Inner detail
        ctx.fillStyle = '#fff';
        ctx.fillRect(-bird.size/4, -bird.size/4, bird.size/2, bird.size/2);
        
        ctx.restore();
    }
}

function gameLoop(time) {
    let dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt > 0.1) dt = 0.1; // Cap delta
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame((time) => {
    lastTime = time;
    startGame();
});
