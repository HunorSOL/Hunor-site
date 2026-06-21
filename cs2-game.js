const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Game Constants & State ---
const MAP_SIZE = 3000;
const T_TEAM = 0;
const CT_TEAM = 1;

let scoreT = 0;
let scoreCT = 0;

let keys = {};
let mouse = { x: 0, y: 0, down: false };
let camera = { x: 0, y: 0 };

let lastTime = performance.now();
let gameOver = false;
let gameStarted = false;
let selectedLoadout = 'assault';
let selectedUtility = 'he';
let projectiles = [];
let smokeClouds = [];

// --- Weapon Configs ---
const WEAPONS = {
    'assault': { name: '1: AK-47', maxAmmo: 30, maxReserve: 60, fireDelay: 100, botDelay: 300, hitDist: 500, damage: 45, spread: 0.1, botSpread: 0.3, pellets: 1, isProjectile: false, color: 'rgba(255, 255, 200,' },
    'sniper': { name: '1: AWP Sniper', maxAmmo: 10, maxReserve: 20, fireDelay: 1500, botDelay: 1800, hitDist: 800, damage: 100, spread: 0.01, botSpread: 0.05, pellets: 1, isProjectile: true, bulletSpeed: 800, color: 'rgba(255, 50, 50,' },
    'shotgun': { name: '1: Nova Shotgun', maxAmmo: 8, maxReserve: 24, fireDelay: 800, botDelay: 1000, hitDist: 300, damage: 20, spread: 0.3, botSpread: 0.4, pellets: 6, isProjectile: false, color: 'rgba(200, 200, 255,' }
};

// --- Map (Mirage Approximation) ---
// Coordinate System: (0,0) top-left
const walls = [
    // Outer Boundaries
    {x: -100, y: -100, w: MAP_SIZE+200, h: 100},
    {x: -100, y: MAP_SIZE, w: MAP_SIZE+200, h: 100},
    {x: -100, y: 0, w: 100, h: MAP_SIZE},
    {x: MAP_SIZE, y: 0, w: 100, h: MAP_SIZE},
    
    // Mid
    {x: 1300, y: 1300, w: 300, h: 200}, // Top mid boxes
    {x: 1000, y: 1600, w: 200, h: 400}, // Mid pillars
    {x: 1600, y: 1000, w: 400, h: 200}, // Connector wall
    
    // A-Site (Top Right)
    {x: 2200, y: 600, w: 200, h: 200}, // Triple
    {x: 2600, y: 200, w: 150, h: 600}, // CT wall
    {x: 2300, y: 1000, w: 200, h: 100}, // Stairs
    {x: 1800, y: 200, w: 600, h: 150}, // Tetris
    
    // B-Site (Bottom Left)
    {x: 400, y: 2200, w: 300, h: 300}, // B plat
    {x: 900, y: 2400, w: 150, h: 150}, // Default
    {x: 300, y: 1500, w: 300, h: 500}, // B Apps
    {x: 900, y: 1800, w: 500, h: 100}, // Short
    
    // Spawns
    {x: 200, y: 2800, w: 800, h: 100}, // T spawn wall
];

// Navigation waypoints for simple bot pathfinding
const WAYPOINTS = [
    {x: 400, y: 2600}, // T Spawn
    {x: 400, y: 1400}, // B Apps entrance
    {x: 600, y: 2200}, // B Site
    {x: 1400, y: 2600}, // T Mid
    {x: 1400, y: 1800}, // Mid
    {x: 1400, y: 1000}, // Top Mid / Connector
    {x: 2600, y: 400}, // CT Spawn
    {x: 2000, y: 400}, // A CT
    {x: 2200, y: 800}, // A Site
    {x: 1800, y: 1200}, // A Ramp
    {x: 1000, y: 2200}, // Short B
];

// --- Physics & Collision ---
function circleRectCollide(circle, rect) {
    let testX = circle.x;
    let testY = circle.y;
    
    if (circle.x < rect.x) testX = rect.x;
    else if (circle.x > rect.x + rect.w) testX = rect.x + rect.w;
    
    if (circle.y < rect.y) testY = rect.y;
    else if (circle.y > rect.y + rect.h) testY = rect.y + rect.h;
    
    let distX = circle.x - testX;
    let distY = circle.y - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));
    
    return distance <= circle.radius;
}

// Check if line segment intersects AABB (Line of Sight)
function lineRectCollide(x1, y1, x2, y2, rx, ry, rw, rh) {
    // Basic bounding box check first
    let minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    let minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    if (maxX < rx || minX > rx+rw || maxY < ry || minY > ry+rh) return false;

    // Line intersection with 4 borders
    function lineLine(x1,y1,x2,y2, x3,y3,x4,y4) {
        let uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        let uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
    }

    if (lineLine(x1,y1,x2,y2, rx,ry,rx+rw,ry)) return true;
    if (lineLine(x1,y1,x2,y2, rx+rw,ry,rx+rw,ry+rh)) return true;
    if (lineLine(x1,y1,x2,y2, rx+rw,ry+rh,rx,ry+rh)) return true;
    if (lineLine(x1,y1,x2,y2, rx,ry+rh,rx,ry)) return true;
    return false;
}

function hasLineOfSight(x1, y1, x2, y2) {
    for (let w of walls) {
        if (lineRectCollide(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) return false;
    }
    
    // Check smoke clouds
    for (let s of smokeClouds) {
        if (lineCircleCollide(x1, y1, x2, y2, s.x, s.y, s.radius)) return false;
    }
    
    return true;
}

function lineCircleCollide(x1, y1, x2, y2, cx, cy, r) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let a = dx*dx + dy*dy;
    let b = 2 * (dx*(x1-cx) + dy*(y1-cy));
    let c = (x1-cx)*(x1-cx) + (y1-cy)*(y1-cy) - r*r;
    let discriminant = b*b - 4*a*c;
    
    if (discriminant < 0) return false; // No intersection
    
    discriminant = Math.sqrt(discriminant);
    let t1 = (-b - discriminant) / (2*a);
    let t2 = (-b + discriminant) / (2*a);
    
    // Check if the intersection points are within the line segment
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;
    return false;
}

// --- Entities ---
let entities = [];
let particles = [];
let grenades = [];

class Entity {
    constructor(x, y, team, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.team = team;
        this.isPlayer = isPlayer;
        this.hp = 100;
        this.angle = 0;
        this.speed = isPlayer ? 300 : 200; // Bots move faster now
        this.isMoving = false;
        this.sprayHeat = 0;
        
        // Weapons: 1:Primary, 2:Utility, 3:Knife
        this.primaryWeaponType = isPlayer ? selectedLoadout : Object.keys(WEAPONS)[Math.floor(Math.random() * 3)];
        this.utilityType = isPlayer ? selectedUtility : (Math.random() > 0.5 ? 'he' : 'smoke');
        
        let wConf = WEAPONS[this.primaryWeaponType];
        
        this.weapon = 1;
        this.grenadeCount = 1;
        this.ammo = wConf.maxAmmo;
        this.reserveAmmo = wConf.maxReserve;
        this.isReloading = false;
        this.lastShot = 0;
        
        // AI State
        this.target = null;
        this.waypointIndex = Math.floor(Math.random() * WAYPOINTS.length);
        this.state = 'patrol';
        this.lastPathTime = 0;
    }

    fire() {
        let now = performance.now();
        if (this.weapon === 1) { // Primary
            if (this.isReloading) return;
            if (this.ammo <= 0) {
                this.reload();
                return;
            }

            let wConf = WEAPONS[this.primaryWeaponType];
            let fireDelay = this.isPlayer ? wConf.fireDelay : wConf.botDelay;
            
            if (now - this.lastShot > fireDelay) {
                this.lastShot = now;
                this.ammo--;
                if (this.isPlayer) updateHUD();

                // Fire pellets (1 for assault/sniper, 6 for shotgun)
                for (let p = 0; p < wConf.pellets; p++) {
                    let spread = (Math.random() - 0.5) * (this.isPlayer ? wConf.spread : wConf.botSpread);
                    
                    // Dynamic Recoil for Assault Rifle
                    if (this.primaryWeaponType === 'assault') {
                        let movePenalty = this.isMoving ? 3 : 1; // 3x spread if moving
                        spread = (Math.random() - 0.5) * (0.02 + this.sprayHeat * 0.4) * movePenalty;
                        if (!this.isPlayer) spread *= 1.5; // slight bot penalty
                    }
                    
                    let finalAngle = this.angle + spread;
                    
                    // Raycast bullet
                    let hitDist = wConf.hitDist;
                    let hitEnt = null;
                    
                    if (wConf.isProjectile) {
                        // Spawn a slow moving projectile instead of instant hit
                        projectiles.push({
                            x: this.x, y: this.y,
                            vx: Math.cos(finalAngle) * wConf.bulletSpeed,
                            vy: Math.sin(finalAngle) * wConf.bulletSpeed,
                            damage: wConf.damage,
                            owner: this,
                            maxDist: hitDist,
                            distTraveled: 0,
                            angle: finalAngle
                        });
                        continue; // Skip raycast logic
                    }
                    
                    // Check entities
                    for (let e of entities) {
                        if (e === this || e.team === this.team || e.hp <= 0) continue;
                        let dx = e.x - this.x;
                        let dy = e.y - this.y;
                        let d = Math.sqrt(dx*dx + dy*dy);
                        let angleToE = Math.atan2(dy, dx);
                        
                        let angleDiff = Math.abs(finalAngle - angleToE);
                        if (angleDiff > Math.PI) angleDiff = 2*Math.PI - angleDiff;
                        
                        if (angleDiff < 0.1 && d < hitDist) {
                            if (hasLineOfSight(this.x, this.y, e.x, e.y)) {
                                hitDist = d;
                                hitEnt = e;
                            }
                        }
                    }
                    
                    let endX = this.x + Math.cos(finalAngle) * hitDist;
                    let endY = this.y + Math.sin(finalAngle) * hitDist;
                    
                    // Clip bullet at walls
                    for (let w of walls) {
                        if (lineRectCollide(this.x, this.y, endX, endY, w.x, w.y, w.w, w.h)) {
                            let dx = (w.x + w.w/2) - this.x;
                            let dy = (w.y + w.h/2) - this.y;
                            let dw = Math.sqrt(dx*dx + dy*dy);
                            if (dw < hitDist) {
                                hitDist = dw;
                                hitEnt = null;
                                endX = this.x + Math.cos(finalAngle) * hitDist;
                                endY = this.y + Math.sin(finalAngle) * hitDist;
                            }
                        }
                    }

                    // Add Tracer
                    particles.push({
                        x: this.x, y: this.y,
                        endX: endX, endY: endY,
                        life: 0.1, maxLife: 0.1, type: 'tracer',
                        color: wConf.color
                    });

                    if (hitEnt) {
                        hitEnt.takeDamage(wConf.damage, this);
                    }
                }
            }
            
            // Add to spray heat
            if (this.primaryWeaponType === 'assault') {
                this.sprayHeat = Math.min(1.0, this.sprayHeat + 0.15);
            }
        } else if (this.weapon === 2 && this.grenadeCount > 0) { // Grenade
            if (now - this.lastShot > 1000) {
                this.lastShot = now;
                this.grenadeCount--;
                if (this.isPlayer) updateHUD();
                
                // Scale throw power based on mouse distance
                let throwPower = 600;
                if (this.isPlayer) {
                    let dx = mouse.x - canvas.width/2;
                    let dy = mouse.y - canvas.height/2;
                    let dist = Math.hypot(dx, dy);
                    throwPower = Math.min(dist * 2, 800); // Cap at 800 speed
                }
                
                grenades.push({
                    x: this.x, y: this.y,
                    vx: Math.cos(this.angle) * throwPower,
                    vy: Math.sin(this.angle) * throwPower,
                    timer: 1.5, // seconds
                    type: this.utilityType,
                    owner: this
                });
                
                // Auto swap back to AK
                setTimeout(() => { if (this.hp > 0) { this.weapon = 1; if(this.isPlayer) updateHUD(); } }, 500);
            }
        } else if (this.weapon === 3) { // Knife
            if (now - this.lastShot > 500) {
                this.lastShot = now;
                particles.push({
                    x: this.x, y: this.y, angle: this.angle,
                    life: 0.2, maxLife: 0.2, type: 'slash'
                });
                
                for (let e of entities) {
                    if (e === this || e.team === this.team || e.hp <= 0) continue;
                    let dx = e.x - this.x;
                    let dy = e.y - this.y;
                    let d = Math.sqrt(dx*dx + dy*dy);
                    if (d < 60) {
                        e.takeDamage(55, this);
                    }
                }
            }
        }
    }

    reload() {
        let wConf = WEAPONS[this.primaryWeaponType];
        if (this.isReloading || this.ammo >= wConf.maxAmmo || this.reserveAmmo <= 0) return;
        this.isReloading = true;
        if (this.isPlayer) {
            document.getElementById('ammo-current').innerText = "R...";
        }
        
        // Bots stop shooting to reload
        setTimeout(() => {
            if (this.hp <= 0) return; // Cancel reload if died
            this.isReloading = false;
            let needed = wConf.maxAmmo - this.ammo;
            let take = Math.min(needed, this.reserveAmmo);
            this.reserveAmmo -= take;
            this.ammo += take;
            if (this.isPlayer) updateHUD();
        }, 2000); // 2 second reload time
    }

    takeDamage(amt, attacker) {
        this.hp -= amt;
        if (this.isPlayer) {
            updateHUD();
            let overlay = document.getElementById('damage-overlay');
            if (overlay) {
                overlay.style.opacity = '1';
                setTimeout(() => { overlay.style.opacity = '0'; }, 100);
            }
        }
        
        if (this.hp <= 0) {
            logKill(attacker, this);
            
            // Deathmatch: Instant Respawn
            let wConf = WEAPONS[this.primaryWeaponType];
            this.hp = 100;
            this.grenadeCount = 1;
            this.weapon = 1;
            this.ammo = wConf.maxAmmo;
            this.reserveAmmo = wConf.maxReserve;
            this.isReloading = false;
            
            if (this.team === T_TEAM) {
                this.x = 300 + Math.random() * 200;
                this.y = 2500 + Math.random() * 200;
            } else {
                this.x = 2500 + Math.random() * 200;
                this.y = 300 + Math.random() * 200;
            }
            
            if (this.isPlayer) updateHUD();
            
            // Add points to scoreboard
            if (attacker && attacker.team !== this.team) {
                if (attacker.team === T_TEAM) {
                    scoreT++;
                    document.getElementById('score-t').innerText = scoreT;
                } else {
                    scoreCT++;
                    document.getElementById('score-ct').innerText = scoreCT;
                }
            }
        } else if (!this.isPlayer && attacker) {
            this.target = attacker;
            this.state = 'attack';
        }
    }

    updateAI(dt) {
        if (this.hp <= 0) return;
        
        let startX = this.x;
        let startY = this.y;
        
        // Find nearest visible enemy
        let nearestEnemy = null;
        let minDist = 800; // Increased sight range to match sniper max distance
        
        for (let e of entities) {
            if (e.team === this.team || e.hp <= 0) continue;
            let d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDist && hasLineOfSight(this.x, this.y, e.x, e.y)) {
                minDist = d;
                nearestEnemy = e;
            }
        }

        if (nearestEnemy) {
            this.state = 'attack';
            this.target = nearestEnemy;
            
            // Reload logic for bots
            if (this.ammo <= 0) {
                this.reload();
            }
            
            // Add a slight delay/inaccuracy to their aiming angle
            let targetAim = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
            // Smoothly interpolate angle instead of snapping instantly
            let diff = targetAim - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 10 * dt; // Turn faster
            
            // Fire if roughly facing
            if (Math.abs(diff) < 0.5) {
                this.weapon = 1;
                this.fire();
            }
            
            // Stop moving if close, otherwise inch forward
            if (minDist > 300) {
                this.x += Math.cos(this.angle) * this.speed * 0.5 * dt;
                this.y += Math.sin(this.angle) * this.speed * 0.5 * dt;
            } else if (minDist < 150) {
                // Back up
                this.x -= Math.cos(this.angle) * this.speed * 0.5 * dt;
                this.y -= Math.sin(this.angle) * this.speed * 0.5 * dt;
            }
            
        } else {
            this.state = 'patrol';
            // Move to waypoint
            let wp = WAYPOINTS[this.waypointIndex];
            let d = Math.hypot(wp.x - this.x, wp.y - this.y);
            if (d < 50) {
                this.waypointIndex = Math.floor(Math.random() * WAYPOINTS.length);
            } else {
                this.angle = Math.atan2(wp.y - this.y, wp.x - this.x);
                this.x += Math.cos(this.angle) * this.speed * dt;
                this.y += Math.sin(this.angle) * this.speed * dt;
            }
        }
        this.resolveCollisions();
        
        this.isMoving = (this.x !== startX || this.y !== startY);
        if (this.sprayHeat > 0 && performance.now() - this.lastShot > 150) {
            this.sprayHeat = Math.max(0, this.sprayHeat - dt * 2);
        }
    }

    resolveCollisions() {
        for (let w of walls) {
            if (circleRectCollide(this, w)) {
                // Extremely simple pushback
                let cx = w.x + w.w/2;
                let cy = w.y + w.h/2;
                if (Math.abs(this.x - cx) > Math.abs(this.y - cy)) {
                    this.x += (this.x > cx) ? 5 : -5;
                } else {
                    this.y += (this.y > cy) ? 5 : -5;
                }
            }
        }
    }
}

// --- Global Game Start & Buy Menu ---
window.selectPrimary = function(type) {
    selectedLoadout = type;
    document.querySelectorAll('#btn-assault, #btn-sniper, #btn-shotgun').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + type).classList.add('active');
};

window.selectUtility = function(type) {
    selectedUtility = type;
    document.querySelectorAll('#btn-he, #btn-smoke').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + type).classList.add('active');
};

window.deploy = function() {
    document.getElementById('buy-menu').classList.add('hidden');
    if (!gameStarted && entities.length === 0) {
        gameStarted = true;
        spawnTeams();
    } else {
        // Hot swap mid-game
        player.primaryWeaponType = selectedLoadout;
        player.utilityType = selectedUtility;
        player.ammo = WEAPONS[selectedLoadout].maxAmmo;
        player.reserveAmmo = WEAPONS[selectedLoadout].maxReserve;
        player.grenadeCount = 1;
        player.weapon = 1;
        updateHUD();
        gameStarted = true; // Unpause
    }
};

// --- Player Initialization ---
let player;

function spawnTeams() {
    entities = [];
    grenades = [];
    particles = [];
    projectiles = [];
    smokeClouds = [];
    gameOver = false;
    document.getElementById('round-over').classList.add('hidden');

    // T Spawn: ~400, 2600
    // CT Spawn: ~2600, 400
    
    // Player (T)
    player = new Entity(400, 2600, T_TEAM, true);
    entities.push(player);
    
    // 9 T Bots (Player + 9 = 10)
    for (let i = 0; i < 9; i++) {
        entities.push(new Entity(300 + Math.random()*200, 2500 + Math.random()*200, T_TEAM));
    }
    
    // 10 CT Bots
    for (let i = 0; i < 10; i++) {
        entities.push(new Entity(2500 + Math.random()*200, 300 + Math.random()*200, CT_TEAM));
    }
    
    updateHUD();
}

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (!player || player.hp <= 0 || gameOver) return;
    
    if (e.key === '1') player.weapon = 1;
    if (e.key === '2') player.weapon = 2;
    if (e.key === '3') player.weapon = 3;
    if (e.key.toLowerCase() === 'r') player.reload();
    if (e.key.toLowerCase() === 'b') {
        document.getElementById('buy-menu').classList.remove('hidden');
        gameStarted = false; // Pause game while in menu
    }
    updateHUD();
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// --- UI Updates ---
function updateHUD() {
    document.getElementById('player-hp').innerText = Math.max(0, player.hp);
    document.getElementById('player-hp-bar').style.width = Math.max(0, player.hp) + '%';
    
    if (player.isReloading) {
        document.getElementById('ammo-current').innerText = "R...";
    } else {
        document.getElementById('ammo-current').innerText = player.ammo;
    }
    document.getElementById('ammo-reserve').innerText = player.reserveAmmo;
    
    document.getElementById('slot-1').innerText = WEAPONS[player.primaryWeaponType].name;
    document.getElementById('slot-2').innerHTML = `2: ${player.utilityType === 'he' ? 'HE Grenade' : 'Smoke Grenade'} <span id="grenade-count">(${player.grenadeCount})</span>`;
    
    document.getElementById('slot-1').classList.toggle('active', player.weapon === 1);
    document.getElementById('slot-2').classList.toggle('active', player.weapon === 2);
    document.getElementById('slot-3').classList.toggle('active', player.weapon === 3);
    
    document.getElementById('grenade-count').innerText = `(${player.grenadeCount})`;
}

function logKill(killer, victim) {
    let kf = document.getElementById('killfeed');
    let log = document.createElement('div');
    log.className = `kill-log ${killer.team === T_TEAM ? 't-kill' : 'ct-kill'}`;
    
    let kName = killer.isPlayer ? "YOU" : (killer.team === T_TEAM ? "Terrorist" : "Counter-Terrorist");
    let vName = victim.isPlayer ? "YOU" : (victim.team === T_TEAM ? "Terrorist" : "Counter-Terrorist");
    
    log.innerHTML = `<strong>${kName}</strong> <span>⚔</span> <span>${vName}</span>`;
    kf.appendChild(log);
    
    setTimeout(() => { if (log.parentElement) log.remove(); }, 5000);
}

function checkRoundOver() {
    let aliveT = entities.filter(e => e.team === T_TEAM && e.hp > 0).length;
    let aliveCT = entities.filter(e => e.team === CT_TEAM && e.hp > 0).length;
    
    if (aliveT === 0 || aliveCT === 0) {
        gameOver = true;
        document.getElementById('round-over').classList.remove('hidden');
        if (aliveT === 0) {
            document.getElementById('round-winner-text').innerText = "COUNTER-TERRORISTS WIN";
            document.getElementById('round-winner-text').style.color = "#3b82f6";
            scoreCT++;
            document.getElementById('score-ct').innerText = scoreCT;
        } else {
            document.getElementById('round-winner-text').innerText = "TERRORISTS WIN";
            document.getElementById('round-winner-text').style.color = "#eab308";
            scoreT++;
            document.getElementById('score-t').innerText = scoreT;
        }
    }
}

document.getElementById('restart-btn').addEventListener('click', spawnTeams);

// --- Main Loop ---
function update(dt) {
    if (!gameStarted) return;
    
    if (!gameOver && player.hp > 0) {
        // Player Move
        let dx = 0, dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        
        if (dx !== 0 || dy !== 0) {
            let len = Math.sqrt(dx*dx + dy*dy);
            player.x += (dx/len) * player.speed * dt;
            player.y += (dy/len) * player.speed * dt;
            player.resolveCollisions();
            player.isMoving = true;
        } else {
            player.isMoving = false;
        }
        
        // Cool down recoil when not shooting
        if (player.sprayHeat > 0 && performance.now() - player.lastShot > 150) {
            player.sprayHeat = Math.max(0, player.sprayHeat - dt * 2);
        }
        
        // Player Aim
        let targetAngle = Math.atan2((mouse.y - canvas.height/2), (mouse.x - canvas.width/2));
        player.angle = targetAngle;
        
        // Player Shoot
        if (mouse.down) {
            player.fire();
        }
    }
    
    // Update Bots
    for (let e of entities) {
        if (!e.isPlayer && e.hp > 0) e.updateAI(dt);
    }
    
    // Update Grenades
    for (let i = grenades.length - 1; i >= 0; i--) {
        let g = grenades[i];
        g.timer -= dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        
        // Friction
        g.vx *= 0.95;
        g.vy *= 0.95;
        
        // Wall Bounce
        for (let w of walls) {
            if (circleRectCollide({x: g.x, y: g.y, radius: 5}, w)) {
                g.vx *= -1; g.vy *= -1; // Simple bounce
            }
        }
        
        if (g.timer <= 0) {
            if (g.type === 'he') {
                // Detonate HE
                particles.push({
                    x: g.x, y: g.y, radius: 0, maxRadius: 150,
                    life: 0.5, maxLife: 0.5, type: 'explosion'
                });
                
                // Damage
                for (let e of entities) {
                    if (e.hp > 0) {
                        let d = Math.hypot(e.x - g.x, e.y - g.y);
                        if (d < 150 && hasLineOfSight(g.x, g.y, e.x, e.y)) {
                            e.takeDamage(100 * (1 - d/150), g.owner);
                        }
                    }
                }
            } else if (g.type === 'smoke') {
                // Bloom Smoke Cloud
                smokeClouds.push({
                    x: g.x, y: g.y,
                    radius: 180,
                    timer: 10 // Lasts 10 seconds
                });
            }
            grenades.splice(i, 1);
        }
    }
    
    // Update Smoke Clouds
    for (let i = smokeClouds.length - 1; i >= 0; i--) {
        smokeClouds[i].timer -= dt;
        if (smokeClouds[i].timer <= 0) {
            smokeClouds.splice(i, 1);
        }
    }
    
    // Update Projectiles (Sniper Bullets)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let moveDist = Math.hypot(p.vx * dt, p.vy * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.distTraveled += moveDist;
        
        let destroyed = false;
        
        // Max Range
        if (p.distTraveled > p.maxDist) destroyed = true;
        
        // Wall Collision
        for (let w of walls) {
            if (circleRectCollide({x: p.x, y: p.y, radius: 4}, w)) {
                destroyed = true;
                break;
            }
        }
        
        // Entity Collision
        if (!destroyed) {
            for (let e of entities) {
                if (e === p.owner || e.team === p.owner.team || e.hp <= 0) continue;
                let d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < e.radius + 4) {
                    e.takeDamage(p.damage, p.owner);
                    destroyed = true;
                    
                    // Blood Particle
                    particles.push({
                        x: p.x, y: p.y, radius: 0, maxRadius: 20,
                        life: 0.2, maxLife: 0.2, type: 'explosion' // Red explosion acting as blood
                    });
                    break;
                }
            }
        }
        
        if (destroyed) {
            projectiles.splice(i, 1);
        }
    }
    
    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].life -= dt;
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    
    // Camera Follow
    if (player.hp > 0) {
        camera.x = player.x - canvas.width/2;
        camera.y = player.y - canvas.height/2;
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw Floor Grid (for texture)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_SIZE; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE); ctx.stroke();
    }
    for (let y = 0; y < MAP_SIZE; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y); ctx.stroke();
    }
    
    // Draw Walls
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    for (let w of walls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
    
    // Render Entities
    for (let e of entities) {
        // No dead bodies in deathmatch, they respawn instantly!
        if (e.hp <= 0) continue;
        
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        
        // Body
        ctx.fillStyle = e.team === T_TEAM ? '#eab308' : '#3b82f6';
        if (e.isPlayer) ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
        
        // Weapon / Hands
        ctx.fillStyle = '#64748b';
        if (e.weapon === 1) { // AK
            ctx.fillRect(10, -5, 25, 6);
        } else if (e.weapon === 2) { // Grenade
            ctx.beginPath(); ctx.arc(15, 0, 5, 0, Math.PI*2); ctx.fill();
        } else if (e.weapon === 3) { // Knife
            ctx.fillRect(10, -2, 12, 4);
        }
        
        ctx.restore();
        
        // HP Bar overhead
        if (!e.isPlayer && e.hp < 100) {
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - 15, e.y - 25, 30, 4);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(e.x - 15, e.y - 25, 30 * (e.hp/100), 4);
        }
    }
    
    // Draw Grenades
    for (let g of grenades) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(g.x, g.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw Projectiles
    for (let p of projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#ef4444'; // Red bullet
        ctx.fillRect(-10, -3, 20, 6);
        ctx.fillStyle = '#fff';
        ctx.fillRect(5, -2, 5, 4); // White tip
        ctx.restore();
    }
    
    // Draw Smoke Clouds
    for (let s of smokeClouds) {
        // Fade in and out
        let alpha = 1;
        if (s.timer > 9.5) alpha = (10 - s.timer) * 2;
        if (s.timer < 1) alpha = s.timer;
        
        ctx.fillStyle = `rgba(100, 116, 139, ${alpha * 0.9})`; // Thick grey cloud
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Draw Particles
    for (let p of particles) {
        if (p.type === 'tracer') {
            ctx.strokeStyle = p.color ? `${p.color} ${p.life/p.maxLife})` : `rgba(255, 255, 200, ${p.life/p.maxLife})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.endX, p.endY);
            ctx.stroke();
        } else if (p.type === 'explosion') {
            let r = p.maxRadius * (1 - p.life/p.maxLife);
            ctx.fillStyle = `rgba(239, 68, 68, ${p.life/p.maxLife})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'slash') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.life/p.maxLife})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 40, -Math.PI/4, Math.PI/4);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    ctx.restore();
    
    // Draw Crosshair
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 10, mouse.y); ctx.lineTo(mouse.x + 10, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 10); ctx.lineTo(mouse.x, mouse.y + 10);
    ctx.stroke();
}

function loop() {
    let now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    
    update(dt);
    draw();
    
    requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Start Game loop immediately (but update is blocked until buy menu closes)
loop();
