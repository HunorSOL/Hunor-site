const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthHearts = document.querySelectorAll('.heart');
const soulDots = document.querySelectorAll('.soul-dot');
const gameOverElement = document.getElementById('game-over');
const gameWinElement = document.getElementById('game-win');

const GRAVITY = 0.4;
const FRICTION = 0.75;
const MAX_FALL_SPEED = 12;

let keys = {};
let prevKeys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.code] = false; keys[e.key] = false; });

document.getElementById('restart-btn').addEventListener('click', initGame);
document.getElementById('restart-win-btn').addEventListener('click', initGame);

const mapWidth = 10000;
const platforms = [
    { x: 0, y: 560, w: 8000, h: 40, type: 1 }, // Floor up to door
    { x: 0, y: 0, w: 40, h: 600, type: 1 },    // Left wall
    
    // Sector 1: Basics
    { x: 300, y: 480, w: 100, h: 20, type: 1 },
    { x: 500, y: 400, w: 100, h: 20, type: 1 },
    { x: 700, y: 320, w: 200, h: 20, type: 1 },
    { x: 750, y: 540, w: 150, h: 20, type: 2 }, // Spikes on floor
    
    // Sector 2: Dash Required
    { x: 1000, y: 240, w: 100, h: 20, type: 1 },
    { x: 1350, y: 240, w: 100, h: 20, type: 1 },
    { x: 1100, y: 540, w: 400, h: 20, type: 2 },
    
    // Sector 3: Drops & Precision
    { x: 1600, y: 400, w: 300, h: 20, type: 1 },
    { x: 1700, y: 380, w: 100, h: 20, type: 2 },
    { x: 2000, y: 150, w: 50, h: 450, type: 1 },
    { x: 2050, y: 540, w: 300, h: 20, type: 2 },
    { x: 2100, y: 350, w: 100, h: 20, type: 1 },
    
    // Sector 4: Long Dash Gaps
    { x: 2400, y: 450, w: 100, h: 20, type: 1 },
    { x: 2750, y: 350, w: 100, h: 20, type: 1 },
    { x: 3100, y: 250, w: 100, h: 20, type: 1 },
    { x: 2400, y: 540, w: 1000, h: 20, type: 2 },
    
    // Sector 5: The Gauntlet
    { x: 3400, y: 500, w: 100, h: 60, type: 1 },
    { x: 3600, y: 400, w: 100, h: 20, type: 1 },
    { x: 3800, y: 300, w: 100, h: 20, type: 1 },
    { x: 4000, y: 200, w: 100, h: 20, type: 1 },
    { x: 4300, y: 480, w: 300, h: 20, type: 1 },
    { x: 3500, y: 540, w: 700, h: 20, type: 2 },

    // Sector 6: New Extended Area
    { x: 4800, y: 400, w: 200, h: 20, type: 1 },
    { x: 5100, y: 300, w: 400, h: 20, type: 1 },
    { x: 5200, y: 280, w: 200, h: 20, type: 2 }, // Spikes on long platform
    { x: 5600, y: 480, w: 200, h: 20, type: 1 },
    { x: 4800, y: 540, w: 1200, h: 20, type: 2 }, // Sea of spikes
    
    // Sector 7: Tunnels & Pillars
    { x: 6100, y: 200, w: 100, h: 400, type: 1 }, // Giant Pillar 1
    { x: 6200, y: 540, w: 200, h: 20, type: 2 },
    { x: 6400, y: 300, w: 100, h: 300, type: 1 }, // Giant Pillar 2
    { x: 6500, y: 540, w: 200, h: 20, type: 2 },
    
    // Sector 8: Final Rush
    { x: 6800, y: 400, w: 100, h: 20, type: 1 },
    { x: 7000, y: 300, w: 100, h: 20, type: 1 },
    { x: 7200, y: 450, w: 300, h: 20, type: 1 },
    { x: 6800, y: 540, w: 800, h: 20, type: 2 }, // Final spike pit
    
    { x: 7850, y: 440, w: 80, h: 120, type: 3 }, // End Goal (teleports to boss)

    // BOSS ARENA (x = 9000 to 9800)
    { x: 9000, y: 560, w: 800, h: 40, type: 1 }, // Arena Floor
    { x: 8960, y: -200, w: 40, h: 800, type: 1 }, // Arena Left Wall
    { x: 9800, y: -200, w: 40, h: 800, type: 1 }, // Arena Right Wall
];

const initialEnemies = [
    { x: 400, y: 520, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 400, moveRange: 150, color: '#ef4444', hitTimer: 0 },
    { x: 750, y: 280, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 750, moveRange: 80, color: '#ef4444', hitTimer: 0 },
    { x: 1650, y: 360, w: 30, h: 40, vx: 1.5, vy: 0, hp: 2, startX: 1650, moveRange: 100, color: '#ef4444', hitTimer: 0 },
    { x: 2150, y: 310, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 2150, moveRange: 40, color: '#ef4444', hitTimer: 0 },
    { x: 2450, y: 410, w: 30, h: 40, vx: 1.5, vy: 0, hp: 2, startX: 2450, moveRange: 30, color: '#ef4444', hitTimer: 0 },
    { x: 3420, y: 460, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 3420, moveRange: 30, color: '#ef4444', hitTimer: 0 },
    { x: 4400, y: 440, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 4400, moveRange: 80, color: '#ef4444', hitTimer: 0 },
    { x: 4850, y: 360, w: 30, h: 40, vx: 1.5, vy: 0, hp: 2, startX: 4850, moveRange: 60, color: '#ef4444', hitTimer: 0 },
    { x: 5120, y: 260, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 5120, moveRange: 50, color: '#ef4444', hitTimer: 0 },
    { x: 5400, y: 260, w: 30, h: 40, vx: 1.5, vy: 0, hp: 2, startX: 5400, moveRange: 50, color: '#ef4444', hitTimer: 0 },
    { x: 5650, y: 440, w: 30, h: 40, vx: -1.5, vy: 0, hp: 2, startX: 5650, moveRange: 60, color: '#ef4444', hitTimer: 0 },
    { x: 6050, y: 520, w: 30, h: 40, vx: -1.5, vy: 0, hp: 3, startX: 6050, moveRange: 40, color: '#dc2626', hitTimer: 0 },
    { x: 6350, y: 520, w: 30, h: 40, vx: 1.5, vy: 0, hp: 3, startX: 6350, moveRange: 40, color: '#dc2626', hitTimer: 0 },
    { x: 6750, y: 520, w: 30, h: 40, vx: -1.5, vy: 0, hp: 3, startX: 6750, moveRange: 40, color: '#dc2626', hitTimer: 0 },
    { x: 7250, y: 410, w: 30, h: 40, vx: -1.5, vy: 0, hp: 3, startX: 7250, moveRange: 50, color: '#dc2626', hitTimer: 0 },
    { x: 7350, y: 410, w: 30, h: 40, vx: 1.5, vy: 0, hp: 3, startX: 7350, moveRange: 50, color: '#dc2626', hitTimer: 0 },
];

const bgLayers = [
    { speed: 0.15, color: '#0f172a', items: [] },
    { speed: 0.3, color: '#1e293b', items: [] }
];
for(let i=0; i<150; i++) {
    bgLayers[0].items.push({ x: Math.random() * mapWidth, w: 100 + Math.random()*200 });
    bgLayers[1].items.push({ x: Math.random() * mapWidth, w: 80 + Math.random()*150 });
}

let player, enemies, particles, projectiles, cameraX, gameState, gameLoop, bossActive;

function initGame() {
    player = {
        x: 100, y: 400, w: 24, h: 36,
        vx: 0, vy: 0, speed: 0.5, maxSpeed: 3.5, jumpPower: -10,
        hp: 5, isGrounded: false, facingRight: true,
        isAttacking: false, attackTimer: 0, invulnTimer: 0,
        isDashing: false, dashTimer: 0, dashCooldown: 0, dashTrail: [],
        doubleJumpsLeft: 3, soul: 0,
        color: '#60a5fa'
    };

    enemies = initialEnemies.map(e => ({...e}));
    particles = [];
    projectiles = [];
    cameraX = 0;
    gameState = 'playing';
    bossActive = false;

    updateHealthUI();
    updateSoulUI();
    gameOverElement.classList.add('hidden');
    gameWinElement.classList.add('hidden');

    if (gameLoop) cancelAnimationFrame(gameLoop);
    update();
}

function updateHealthUI() {
    healthHearts.forEach((heart, index) => {
        if (index < player.hp) heart.classList.add('active');
        else heart.classList.remove('active');
    });
}

function updateSoulUI() {
    soulDots.forEach((dot, index) => {
        if (index < player.soul) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function spawnParticles(x, y, color, count = 15, isDash = false) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: isDash ? (player.facingRight ? -Math.random()*5 : Math.random()*5) : (Math.random() - 0.5) * 10,
            vy: isDash ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 10 - 2,
            life: 20 + Math.random() * 20,
            color: color
        });
    }
}

function takeDamage(damage = 1) {
    if (player.invulnTimer > 0 || gameState !== 'playing') return;
    player.hp -= damage;
    updateHealthUI();
    player.invulnTimer = 60;
    spawnParticles(player.x + player.w/2, player.y + player.h/2, '#60a5fa', 20);
    player.vy = -5; // knockback

    if (player.hp <= 0) {
        gameState = 'lost';
        gameOverElement.classList.remove('hidden');
    }
}

function winGame() {
    if (gameState !== 'playing') return;
    gameState = 'won';
    gameWinElement.classList.remove('hidden');
}

function spawnBoss() {
    bossActive = true;
    enemies.push({
        isBoss: true,
        x: 9600, y: 460, w: 80, h: 100,
        vx: 0, vy: 0, hp: 30, maxHp: 30,
        color: '#475569', hitTimer: 0,
        attackCooldown: 0
    });
}

function spawnMinion(x, y, vx) {
    let activeMinions = enemies.filter(e => e.isMinion && e.hp > 0).length;
    if (activeMinions >= 3) return; // Max 3 minions

    enemies.push({
        isBoss: false,
        isMinion: true,
        x: x, y: y, w: 24, h: 24,
        vx: vx, vy: -8, hp: 1, startX: x, moveRange: 800,
        color: '#f59e0b', hitTimer: 0
    });
}

function isIntersecting(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function applyPhysicsAndCollision(entity) {
    entity.isGrounded = false;
    
    if (!entity.isDashing) {
        entity.vy += GRAVITY;
        if (entity.vy > MAX_FALL_SPEED) entity.vy = MAX_FALL_SPEED;
    }

    // X Collision
    entity.x += entity.vx;
    platforms.forEach(p => {
        if (isIntersecting(entity, p)) {
            if (entity.vx > 0) entity.x = p.x - entity.w;
            else if (entity.vx < 0) entity.x = p.x + p.w;
            
            if (entity.isDashing) {
                entity.isDashing = false;
                entity.dashTimer = 0;
            }
            if (!entity.isBoss) entity.vx = 0; // Don't cancel boss horizontal arc velocity on wall hit

            if (entity === player) {
                if (p.type === 2) takeDamage();
                if (p.type === 3 && !bossActive) {
                    // Teleport to Boss Arena!
                    player.x = 9100;
                    player.y = 100;
                    player.vx = 0;
                    player.vy = 0;
                    cameraX = 9000;
                    spawnBoss();
                }
            }
        }
    });

    // Y Collision
    entity.y += entity.vy;
    platforms.forEach(p => {
        if (isIntersecting(entity, p)) {
            if (entity.vy > 0) {
                entity.y = p.y - entity.h;
                entity.isGrounded = true;
            } else if (entity.vy < 0) {
                entity.y = p.y + p.h;
            }
            entity.vy = 0;

            if (entity === player) {
                if (p.type === 2) takeDamage();
                if (p.type === 3 && !bossActive) {
                    player.x = 9100;
                    player.y = 100;
                    player.vx = 0;
                    player.vy = 0;
                    cameraX = 9000;
                    spawnBoss();
                }
            }
        }
    });
}

function bossJumpTo(e, targetX, stateStr) {
    e.bossState = stateStr;
    e.bossTargetX = targetX;
    e.vy = -18;
    let timeInAir = 2 * (18 / GRAVITY); // approx 90 frames
    e.vx = (targetX - e.x) / timeInAir;
}

function update() {
    if (gameState === 'playing') {
        if (player.attackTimer > 0) player.attackTimer--;
        if (player.invulnTimer > 0) player.invulnTimer--;
        if (player.dashCooldown > 0) player.dashCooldown--;

        // Heal Logic (Focus Soul)
        if (keys['KeyF'] && !prevKeys['KeyF']) {
            if (player.soul >= 1 && player.hp < 5) {
                player.soul -= 1;
                player.hp++;
                updateHealthUI();
                updateSoulUI();
                spawnParticles(player.x + player.w/2, player.y + player.h/2, '#10b981', 30);
            }
        }

        // Spell Logic (Vengeful Spirit)
        if (keys['KeyE'] && !prevKeys['KeyE']) {
            if (player.soul >= 3) {
                player.soul = 0;
                updateSoulUI();
                projectiles.push({
                    x: player.facingRight ? player.x + player.w : player.x - 60,
                    y: player.y - 10,
                    w: 60, h: 40,
                    vx: player.facingRight ? 16 : -16,
                    life: 60 
                });
                spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 20);
                player.vx = player.facingRight ? -4 : 4;
            }
        }

        // Dash Initiation
        if ((keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyK']) && player.dashCooldown <= 0 && !player.isDashing) {
            player.isDashing = true;
            player.dashTimer = 15;
            player.dashCooldown = 60;
            player.vy = 0; 
            player.vx = player.facingRight ? 18 : -18;
            spawnParticles(player.x, player.y + player.h/2, '#60a5fa', 10, true);
        }

        if (player.isDashing) {
            player.dashTimer--;
            player.vy = 0;
            
            if (player.dashTimer % 2 === 0) {
                player.dashTrail.push({x: player.x, y: player.y, facingRight: player.facingRight, life: 15});
            }
            
            if (player.dashTimer <= 0) {
                player.isDashing = false;
                player.vx = player.facingRight ? player.maxSpeed : -player.maxSpeed;
            }
        } else {
            if (keys['KeyA'] || keys['ArrowLeft']) {
                player.vx -= player.speed;
                player.facingRight = false;
            } else if (keys['KeyD'] || keys['ArrowRight']) {
                player.vx += player.speed;
                player.facingRight = true;
            } else {
                player.vx *= FRICTION;
            }

            if (player.vx > player.maxSpeed) player.vx = player.maxSpeed;
            if (player.vx < -player.maxSpeed) player.vx = -player.maxSpeed;

            if (player.isGrounded) {
                player.doubleJumpsLeft = 3;
            }

            let jumpPressed = (keys['Space'] && !prevKeys['Space']) || 
                              (keys['KeyW'] && !prevKeys['KeyW']) || 
                              (keys['ArrowUp'] && !prevKeys['ArrowUp']);

            if (jumpPressed) {
                if (player.isGrounded) {
                    player.vy = player.jumpPower;
                    spawnParticles(player.x + player.w/2, player.y + player.h, '#fff', 5);
                } else if (player.doubleJumpsLeft > 0) {
                    player.vy = player.jumpPower;
                    player.doubleJumpsLeft--;
                    spawnParticles(player.x + player.w/2, player.y + player.h, '#60a5fa', 10);
                }
            }
        }

        player.dashTrail.forEach(t => t.life--);
        player.dashTrail = player.dashTrail.filter(t => t.life > 0);

        // Attack
        if (keys['KeyJ'] && player.attackTimer <= 0 && !player.isDashing) {
            player.attackTimer = 25;
            
            let isPogo = !player.isGrounded && (keys['KeyS'] || keys['ArrowDown']);
            player.isPogoAttacking = isPogo;
            
            let attackBox;
            if (isPogo) {
                attackBox = { x: player.x - 10, y: player.y + player.h, w: player.w + 20, h: 35 };
            } else {
                attackBox = { x: player.facingRight ? player.x + player.w : player.x - 50, y: player.y - 10, w: 50, h: player.h + 20 };
            }
            
            let pogoHit = false;
            
            enemies.forEach(e => {
                if (e.hp > 0 && isIntersecting(attackBox, e)) {
                    if (e.isBoss && e.isInvulnerable) {
                        spawnParticles(e.x + e.w/2, e.y + e.h/2, '#94a3b8', 5); // clang sound/visual
                        if (isPogo) pogoHit = true;
                    } else {
                        e.hp -= 1;
                        e.hitTimer = 10;
                        e.vx = isPogo ? 0 : (player.facingRight ? 3 : -3); 
                        spawnParticles(e.x + e.w/2, e.y + e.h/2, '#ef4444');
                        if (isPogo) pogoHit = true;
                        
                        if (e.hp <= 0) {
                            if (!e.isBoss && player.soul < 3) {
                                player.soul++;
                                updateSoulUI();
                            }
                            spawnParticles(e.x + e.w/2, e.y + e.h/2, '#ef4444', e.isBoss ? 200 : 20);
                            if (e.isBoss) winGame();
                        }
                    }
                }
            });
            
            if (isPogo) {
                platforms.forEach(p => {
                    if (p.type === 2 && isIntersecting(attackBox, p)) {
                        pogoHit = true;
                        spawnParticles(attackBox.x + attackBox.w/2, attackBox.y + attackBox.h/2, '#fff', 10);
                    }
                });
                
                if (pogoHit) {
                    player.vy = player.jumpPower * 1.1;
                    player.doubleJumpsLeft = 3; 
                }
            }
        }

        applyPhysicsAndCollision(player);

        // Projectiles Update
        for(let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.x += p.vx;
            p.life--;
            
            spawnParticles(p.x + p.w/2, p.y + p.h/2, '#fff', 2);
            let destroyed = false;

            platforms.forEach(plat => {
                if (plat.type === 1 && isIntersecting(p, plat)) {
                    destroyed = true;
                }
            });

            if (!destroyed) {
                enemies.forEach(e => {
                    if (e.hp > 0 && isIntersecting(p, e)) {
                        if (e.isBoss) {
                            if (e.isInvulnerable) {
                                destroyed = true;
                                spawnParticles(p.x + p.w/2, p.y + p.h/2, '#94a3b8', 10); // spell bounces
                            } else {
                                e.hp -= 2; // Spell does 2 damage to boss
                                e.hitTimer = 10;
                                destroyed = true;
                                spawnParticles(e.x + e.w/2, e.y + e.h/2, '#fff', 50); 
                            }
                        } else {
                            e.hp = 0; // Instant kill normal enemy
                            destroyed = true;
                            spawnParticles(e.x + e.w/2, e.y + e.h/2, '#fff', 50); 
                        }
                        
                        if (e.hp <= 0) {
                            if (!e.isBoss && player.soul < 3) {
                                player.soul++;
                                updateSoulUI();
                            }
                            if (e.isBoss) winGame();
                        }
                    }
                });
            }

            if (destroyed || p.life <= 0) {
                projectiles.splice(i, 1);
            }
        }

        enemies.forEach(e => {
            if (e.hp <= 0) return;
            if (e.hitTimer > 0) e.hitTimer--;

            if (e.isBoss) {
                // Boss Jump & Stun AI
                if (!e.bossState) {
                    e.isInvulnerable = true;
                    bossJumpTo(e, 9100, 'jump_left');
                }

                if (e.bossState === 'stunned') {
                    e.vx = 0;
                    e.isInvulnerable = false;
                    e.stunTimer--;
                    e.color = e.stunTimer % 20 < 10 ? '#ef4444' : '#94a3b8'; // Flash to show vulnerability

                    if (e.stunTimer <= 0) {
                        e.isInvulnerable = true;
                        e.color = '#475569';
                        bossJumpTo(e, 9100, 'jump_left');
                    }
                } else {
                    e.isInvulnerable = true;
                    e.color = '#475569';
                    
                    if (e.isGrounded) {
                        e.vx = 0;
                        if (e.bossState === 'jump_left') {
                            spawnMinion(e.x, e.y, 2);
                            spawnMinion(e.x + e.w, e.y, 4);
                            bossJumpTo(e, 9600, 'jump_right');
                        } else if (e.bossState === 'jump_right') {
                            spawnMinion(e.x, e.y, -2);
                            spawnMinion(e.x + e.w, e.y, -4);
                            bossJumpTo(e, 9350, 'jump_middle');
                        } else if (e.bossState === 'jump_middle') {
                            spawnMinion(e.x, e.y, -3);
                            spawnMinion(e.x + e.w, e.y, 3);
                            e.bossState = 'stunned';
                            e.stunTimer = 300; // 5 seconds stunned
                            spawnParticles(e.x + e.w/2, e.y + e.h/2, '#ef4444', 30);
                        }
                    }
                }
            } else {
                // Normal AI
                if (e.hitTimer === 0) {
                    e.vx = e.x > e.startX + e.moveRange ? -1.5 : (e.x < e.startX - e.moveRange ? 1.5 : e.vx);
                }
            }
            
            applyPhysicsAndCollision(e);

            if (isIntersecting(player, e) && e.hp > 0 && !player.isDashing) {
                takeDamage(e.isBoss ? 2 : 1); // Boss deals 2 damage!
                player.vx = player.x < e.x ? -8 : 8; // Huge knockback
            }
        });

        // Update Camera
        if (bossActive) {
            // Lock camera to boss arena
            cameraX += (9000 - cameraX) * 0.1;
        } else {
            let targetCameraX = player.x - canvas.width / 2;
            cameraX += (targetCameraX - cameraX) * 0.1;
            if (cameraX < 0) cameraX = 0;
            if (cameraX > 8000 - canvas.width) cameraX = 8000 - canvas.width; // clamp before boss area
        }
    }

    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY * 0.5;
        p.life--;
        if (p.life <= 0) particles.splice(index, 1);
    });

    Object.keys(keys).forEach(k => prevKeys[k] = keys[k]);

    draw();
    gameLoop = requestAnimationFrame(update);
}

function drawPlayerModel(x, y, facingRight, alpha = 1) {
    ctx.globalAlpha = alpha;
    
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    let capeOffset = facingRight ? -10 : 10;
    let capeSway = Math.sin(Date.now() / 200) * 5;
    ctx.moveTo(x + player.w/2, y + 10);
    ctx.quadraticCurveTo(
        x + player.w/2 + capeOffset, y + 20, 
        x + player.w/2 + capeOffset * 2 - (player.vx*1.5) + capeSway, y + 36
    );
    ctx.lineTo(x + player.w/2 + capeOffset * 1.5 - (player.vx*1.5) + capeSway + (facingRight?5:-5), y + 36);
    ctx.fill();

    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(x, y + 10, player.w, player.h - 10);
    
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 6, y - 8);
    ctx.lineTo(x + 6, y + 4);
    ctx.lineTo(x + player.w - 6, y + 4);
    ctx.lineTo(x + player.w + 6, y - 8);
    ctx.lineTo(x + player.w, y + 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    let eyeX = facingRight ? x + 12 : x + 4;
    ctx.fillRect(eyeX, y + 12, 4, 8);
    ctx.fillRect(eyeX + 8, y + 12, 4, 8);
    
    ctx.globalAlpha = 1;
}

function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    bgLayers.forEach(layer => {
        ctx.fillStyle = layer.color;
        layer.items.forEach(item => {
            let drawX = (item.x - cameraX * layer.speed) % mapWidth;
            if (drawX < -item.w) drawX += mapWidth; 
            ctx.fillRect(drawX, 0, item.w, canvas.height);
        });
    });

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Draw Platforms
    platforms.forEach(p => {
        if (p.type === 1) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fillRect(p.x, p.y, p.w, 4);
        } else if (p.type === 2) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ef4444';
            for(let i=0; i<p.w/20; i++) {
                ctx.beginPath();
                ctx.moveTo(p.x + i*20, p.y + p.h);
                ctx.lineTo(p.x + i*20 + 10, p.y);
                ctx.lineTo(p.x + i*20 + 20, p.y + p.h);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        } else if (p.type === 3) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#10b981';
            ctx.fillStyle = '#059669';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#34d399';
            ctx.fillRect(p.x + 20, p.y + 20, p.w - 40, p.h - 20);
            ctx.shadowBlur = 0;
        }
    });

    // Draw Enemies & Boss
    enemies.forEach(e => {
        if (e.hp <= 0) return;
        
        ctx.fillStyle = e.hitTimer > 0 ? '#fff' : e.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = e.color;
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#000';
        if (e.isBoss) {
            // Boss Eyes (angry & large)
            let eyeOffsetX = e.vx > 0 ? 30 : 10;
            ctx.beginPath();
            ctx.moveTo(e.x + eyeOffsetX, e.y + 20);
            ctx.lineTo(e.x + eyeOffsetX + 15, e.y + 30);
            ctx.lineTo(e.x + eyeOffsetX, e.y + 40);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(e.x + eyeOffsetX + 25, e.y + 20);
            ctx.lineTo(e.x + eyeOffsetX + 10, e.y + 30);
            ctx.lineTo(e.x + eyeOffsetX + 25, e.y + 40);
            ctx.fill();
            
            // Health bar for boss above his head
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(e.x, e.y - 15, e.w * (e.hp / e.maxHp), 6);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(e.x, e.y - 15, e.w, 6);
        } else {
            // Normal Eyes
            let eyeOffsetX = e.vx > 0 ? 15 : 5;
            ctx.beginPath();
            ctx.moveTo(e.x + eyeOffsetX, e.y + 10);
            ctx.lineTo(e.x + eyeOffsetX + 6, e.y + 14);
            ctx.lineTo(e.x + eyeOffsetX, e.y + 18);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(e.x + eyeOffsetX + 10, e.y + 10);
            ctx.lineTo(e.x + eyeOffsetX + 4, e.y + 14);
            ctx.lineTo(e.x + eyeOffsetX + 10, e.y + 18);
            ctx.fill();
        }
    });

    // Draw Projectiles
    projectiles.forEach(proj => {
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2, proj.h/2, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Dash Trail
    player.dashTrail.forEach(t => {
        drawPlayerModel(t.x, t.y, t.facingRight, t.life / 15 * 0.5);
    });

    // Draw Player
    if (player.invulnTimer % 10 < 5 && gameState !== 'lost') {
        drawPlayerModel(player.x, player.y, player.facingRight, 1);
    }

    // Draw Attack Arc
    if (player.attackTimer > 15) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        if (player.isPogoAttacking) {
            ctx.arc(player.x + player.w/2, player.y + player.h, 35, 0, Math.PI);
        } else {
            let arcX = player.facingRight ? player.x + player.w : player.x;
            let arcDir = player.facingRight ? 1 : -1;
            ctx.arc(arcX, player.y + player.h/2 + 5, 45, -Math.PI/2 * arcDir, Math.PI/3 * arcDir, player.facingRight ? false : true);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    // Draw Particles
    particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    });

    ctx.restore();
}

initGame();
