const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const sidebar = document.getElementById('sidebar');
const moneyDisplay = document.getElementById('money');

let money = 500;
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
    selectedTower = {
      color: tower.getAttribute('data-color'),
      cost: parseInt(tower.getAttribute('data-cost'))
    };
  });
});

// Update money display
function updateMoney() {
  moneyDisplay.textContent = `Money: $${money}`;
}

// Handle canvas clicks for tower placement
canvas.addEventListener('click', (e) => {
  if (selectedTower) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if player has enough money
    if (money >= selectedTower.cost) {
      // Check if the position is not on the path
      if (!isOnPath(x, y)) {
        towers.push({
          x,
          y,
          color: selectedTower.color,
          range: 100,
          damage: selectedTower.color === 'green' ? 1 : selectedTower.color === 'blue' ? 2 : 3,
          fireRate: selectedTower.color === 'green' ? 1000 : selectedTower.color === 'blue' ? 800 : 600,
          lastFire: 0
        });
        money -= selectedTower.cost;
        updateMoney();
      }
    }
    selectedTower = null;
  }
});

// Function to check if a position is on the path
function isOnPath(x, y) {
  // Simple check: distance to any path point
  for (let point of path) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < 40) return true;
  }
  return false;
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
    this.color = getRandomColor();
    this.health = 10;
    this.maxHealth = 10;
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
      updateMoney();
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

// Function to get random color
function getRandomColor() {
  const colors = ['purple', 'orange', 'cyan', 'magenta', 'yellow'];
  return colors[Math.floor(Math.random() * colors.length)];
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
  enemies.forEach(enemy => {
    enemy.move();
    enemy.draw();
  });
  
  // Move and draw projectiles
  projectiles.forEach(projectile => {
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
  ctx.stroke();
  ctx.closePath();
  
  // Reset the path line width for other drawings
  ctx.lineWidth = 1;
}

// Start the game loop
updateMoney();
gameLoop();
