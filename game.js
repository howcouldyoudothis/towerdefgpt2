const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const sidebar = document.getElementById('sidebar');
const moneyDisplay = document.getElementById('money');
const healthDisplay = document.getElementById('health');

let money = 500;
let playerHealth = 10;
let selectedTower = null;
const towers = [];
const enemies = [];
const projectiles = [];

// Define the path for enemies
const path = [
  {x: 0, y: 300},
  {x: 200, y: 300},
  {x: 200, y: 100},
  {x: 400, y: 100},
  {x: 400, y: 500},
  {x: 800, y: 500}
];

// Handle tower selection
document.querySelectorAll('.tower').forEach(tower => {
  tower.style.backgroundColor = tower.getAttribute('data-color');
  
  tower.addEventListener('click', () => {
    const towerCost = parseInt(tower.getAttribute('data-cost'));
    if (money >= towerCost) {
      selectedTower = {
        color: tower.getAttribute('data-color'),
        cost: towerCost,
        damage: getTowerDamage(tower.getAttribute('data-color'))
      };
      // Highlight selected tower
      document.querySelectorAll('.tower').forEach(t => t.classList.remove('selected'));
      tower.classList.add('selected');
    } else {
      alert('Not enough money to purchase this tower.');
    }
  });
});

// Update money and health display
function updateDisplay() {
  moneyDisplay.textContent = `Money: $${money}`;
  healthDisplay.textContent = `Health: ${playerHealth}`;
}

// Handle canvas clicks for tower placement
canvas.addEventListener('click', (e) => {
  if (selectedTower) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if player has enough money
    if (money >= selectedTower.cost) {
      // Check if the position is not on the path and not overlapping another tower
      if (!isOnPath(x, y) && !isTowerPlaced(x, y)) {
        towers.push({
          x,
          y,
          color: selectedTower.color,
          range: 100,
          damage: selectedTower.damage,
          fireRate: getFireRate(selectedTower.color),
          lastFire: 0
        });
        money -= selectedTower.cost;
        updateDisplay();
      } else {
        alert('Cannot place tower on the path or overlapping another tower.');
      }
    }
    // Deselect tower after placement attempt
    selectedTower = null;
    document.querySelectorAll('.tower').forEach(t => t.classList.remove('selected'));
  }
});

// Function to check if a position is on the path
function isOnPath(x, y) {
  // Simple check: distance to any path segment
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    if (distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 40) {
      return true;
    }
  }
  return false;
}

// Function to calculate distance from point to segment
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) // in case of 0 length line
      param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Function to check if a tower is already placed at the position
function isTowerPlaced(x, y) {
  for (let tower of towers) {
    const distance = Math.hypot(tower.x - x, tower.y - y);
    if (distance < 40) return true;
  }
  return false;
}

// Function to get tower damage based on color
function getTowerDamage(color) {
  switch(color) {
    case 'green': return 1;
    case 'blue': return 2;
    case 'red': return 3;
    default: return 1;
  }
}

// Function to get tower fire rate based on color
function getFireRate(color) {
  switch(color) {
    case 'green': return 1000; // in milliseconds
    case 'blue': return 800;
    case 'red': return 600;
    default: return 1000;
  }
}

// Enemy class
class Enemy {
  constructor() {
    this.path = path;
    this.currentPathIndex = 0;
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.speed = 1;
    this.radius = 10;
    this.color = getRandomEnemyColor();
    this.health = getEnemyHealth(this.color);
    this.maxHealth = this.health;
    this.damageToPlayer = getEnemyDamage(this.color);
  }
  
  move() {
    if (this.currentPathIndex < this.path.length -1 ) {
      const target = this.path[this.currentPathIndex +1];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < this.speed) {
        this.x = target.x;
        this.y = target.y;
        this.currentPathIndex++;
      } else {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }
    }
  }
  
  draw() {
    // Draw enemy
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI *2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
    
    // Health bar
    ctx.beginPath();
    ctx.rect(this.x - 10, this.y - 20, 20, 4);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
    
    ctx.beginPath();
    ctx.rect(this.x - 10, this.y - 20, (this.health / this.maxHealth) * 20, 4);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();
  }
}

// Projectile class
class Projectile {
  constructor(x, y, target, damage) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 5;
    this.radius = 4;
    this.damage = damage;
  }
  
  move() {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < this.speed) {
      this.hit();
      return;
    }
    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;
  }
  
  hit() {
    this.target.health -= this.damage;
    const index = projectiles.indexOf(this);
    if (index > -1) projectiles.splice(index, 1);
    if (this.target.health <= 0) {
      money += 50;
      updateDisplay();
      const enemyIndex = enemies.indexOf(this.target);
      if (enemyIndex > -1) enemies.splice(enemyIndex, 1);
    }
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI *2);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.closePath();
  }
}

// Function to get random enemy color
function getRandomEnemyColor() {
  const colors = ['purple', 'orange', 'cyan', 'magenta', 'yellow'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Function to get enemy health based on color
function getEnemyHealth(color) {
  switch(color) {
    case 'purple': return 5;
    case 'orange': return 8;
    case 'cyan': return 10;
    case 'magenta': return 12;
    case 'yellow': return 15;
    default: return 5;
  }
}

// Function to get enemy damage to player based on color
function getEnemyDamage(color) {
  switch(color) {
    case 'purple': return 1;
    case 'orange': return 2;
    case 'cyan': return 3;
    case 'magenta': return 4;
    case 'yellow': return 5;
    default: return 1;
  }
}

// Spawn enemies periodically
setInterval(() => {
  enemies.push(new Enemy());
}, 2000);

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawPath();
  
  // Move and draw enemies
  enemies.forEach((enemy, enemyIndex) => {
    enemy.move();
    enemy.draw();
    
    // Check if enemy has reached the end
    if (enemy.currentPathIndex >= enemy.path.length -1) {
      playerHealth -= enemy.damageToPlayer;
      updateDisplay();
      enemies.splice(enemyIndex, 1);
      
      // Check for game over
      if (playerHealth <= 0) {
        alert('Game Over!');
        document.location.reload();
      }
    }
  });
  
  // Move and draw projectiles
  projectiles.forEach((projectile, projIndex) => {
    projectile.move();
    projectile.draw();
  });
  
  // Draw towers and handle shooting
  towers.forEach(tower => {
    // Draw tower
    ctx.fillStyle = tower.color;
    ctx.fillRect(tower.x -15, tower.y -15, 30, 30);
    
    // Draw tower range (optional)
    // ctx.beginPath();
    // ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    // ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    // ctx.stroke();
    // ctx.closePath();
    
    // Find enemies in range
    enemies.forEach(enemy => {
      const distance = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      if (distance <= tower.range) {
        if (Date.now() - tower.lastFire > tower.fireRate) {
          projectiles.push(new Projectile(tower.x, tower.y, enemy, tower.damage));
          tower.lastFire = Date.now();
        }
      }
    });
  });
  
  requestAnimationFrame(gameLoop);
}

// Function to draw the path
function drawPath() {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let point of path) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = '#7f8c8d';
  ctx.lineWidth = 40; // Path width
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.closePath();
  
  // Reset the path line width for other drawings
  ctx.lineWidth = 1;
}

// Initialize and start the game
updateDisplay();
gameLoop();
