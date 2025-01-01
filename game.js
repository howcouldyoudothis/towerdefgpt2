const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const moneyDisplay = document.getElementById('money');
const healthDisplay = document.getElementById('health');
const towerPanel = document.getElementById('tower-panel');

let money = 500;
let playerHealth = 10;
let selectedTower = null;
const towers = [];
const enemies = [];
const projectiles = [];

// Drag and Drop Variables
let isDragging = false;
let draggedTower = null;
let previewTower = null;

// Define the path for enemies
const path = [
  {x: 0, y: 300},
  {x: 200, y: 300},
  {x: 200, y: 100},
  {x: 400, y: 100},
  {x: 400, y: 500},
  {x: 800, y: 500}
];

// Handle tower selection via Drag and Drop
document.querySelectorAll('.tower').forEach(tower => {
  tower.style.backgroundColor = tower.getAttribute('data-color');

  tower.addEventListener('dragstart', (e) => {
    if (money < parseInt(tower.getAttribute('data-cost'))) {
      e.preventDefault();
      alert('Not enough money to purchase this tower.');
      return;
    }
    isDragging = true;
    draggedTower = {
      color: tower.getAttribute('data-color'),
      cost: parseInt(tower.getAttribute('data-cost')),
      damage: 1 // Each projectile hit deducts one health
    };

    // Create a preview tower following the cursor
    previewTower = {
      x: 0,
      y: 0,
      color: draggedTower.color,
      size: 30
    };

    // Set drag image to a transparent image to hide default drag image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAiHzl/wAAAABJRU5ErkJggg==';
    e.dataTransfer.setDragImage(img, 0, 0);
  });

  tower.addEventListener('dragend', () => {
    isDragging = false;
    draggedTower = null;
    previewTower = null;
  });
});

// Handle canvas drag events
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (isDragging && previewTower) {
    const rect = canvas.getBoundingClientRect();
    previewTower.x = e.clientX - rect.left;
    previewTower.y = e.clientY - rect.top;
  }
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  if (isDragging && draggedTower) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if the position is not on the path and not overlapping another tower
    if (!isOnPath(x, y) && !isTowerPlaced(x, y)) {
      towers.push({
        x,
        y,
        color: draggedTower.color,
        range: 100,
        damage: 1, // Each projectile hit deducts one health
        fireRate: getFireRate(draggedTower.color),
        lastFire: 0
      });
      money -= draggedTower.cost;
      updateDisplay();
    } else {
      alert('Cannot place tower on the path or overlapping another tower.');
    }

    // Reset dragging variables
    isDragging = false;
    draggedTower = null;
    previewTower = null;
  }
});

// Update money and health display
function updateDisplay() {
  moneyDisplay.textContent = `Money: $${money}`;
  healthDisplay.textContent = `Health: ${playerHealth}`;
}

// Function to check if a position is on the path
function isOnPath(x, y) {
  // Check distance to any path segment
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

// Function to get tower fire rate based on color
function getFireRate(color) {
  switch(color) {
    case 'green': return 1000; // in milliseconds
    case 'blue': return 800;
    case 'red': return 600;
    default: return 1000;
  }
}

// Enemy class with variable health based on color
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

    // Health bar background
    ctx.beginPath();
    ctx.rect(this.x - 10, this.y - 20, 20, 4);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();

    // Health bar foreground
    ctx.beginPath();
    ctx.rect(this.x - 10, this.y - 20, (this.health / this.maxHealth) * 20, 4);
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.closePath();
  }
}

// Projectile class
class Projectile {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 5;
    this.radius = 4;
    this.damage = 1; // Each projectile hit deducts one health
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
  const colors = ['yellow', 'purple', 'orange', 'cyan', 'magenta'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Function to get enemy health based on color
function getEnemyHealth(color) {
  switch(color) {
    case 'yellow': return 5;
    case 'purple': return 20;
    case 'orange': return 10;
    case 'cyan': return 15;
    case 'magenta': return 25;
    default: return 5;
  }
}

// Function to get enemy damage to player based on color
function getEnemyDamage(color) {
  switch(color) {
    case 'yellow': return 1;
    case 'purple': return 2;
    case 'orange': return 1;
    case 'cyan': return 3;
    case 'magenta': return 2;
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
    if (enemy.currentPathIndex >= path.length -1) {
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

    // Find enemies in range
    enemies.forEach(enemy => {
      const distance = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      if (distance <= tower.range) {
        if (Date.now() - tower.lastFire > tower.fireRate) {
          projectiles.push(new Projectile(tower.x, tower.y, enemy));
          tower.lastFire = Date.now();
        }
      }
    });
  });

  // Draw preview tower if dragging
  if (previewTower) {
    ctx.beginPath();
    ctx.arc(previewTower.x, previewTower.y, 15, 0, Math.PI *2);
    ctx.fillStyle = previewTower.color;
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.closePath();
  }

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
}

// Initialize and start the game
updateDisplay();
gameLoop();
