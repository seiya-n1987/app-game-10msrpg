// ===== GAME CONSTANTS =====
const GRID_SIZE = 12;
const CELL_SIZE = 50;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const TERRAIN_TYPES = {
    GRASS: { color: '#4a7c4e', moveCost: 1, defense: 0, name: '草原' },
    FOREST: { color: '#2d5a3d', moveCost: 2, defense: 20, name: '森' },
    MOUNTAIN: { color: '#6b5b5b', moveCost: 3, defense: 30, name: '山' },
    WATER: { color: '#4a7ba7', moveCost: 99, defense: 0, name: '水' },
    ROAD: { color: '#9b8b6b', moveCost: 1, defense: 0, name: '道' }
};

const UNIT_CLASSES = {
    WARRIOR: { name: '戦士', hp: 80, atk: 25, def: 15, move: 3, range: 1, color: '#e94560' },
    ARCHER: { name: '弓兵', hp: 60, atk: 20, def: 8, move: 3, range: 3, color: '#f0a500' },
    MAGE: { name: '魔道士', hp: 50, atk: 30, def: 5, move: 2, range: 2, color: '#8e44ad' },
    KNIGHT: { name: '騎士', hp: 100, atk: 20, def: 20, move: 4, range: 1, color: '#3498db' },
    PRIEST: { name: '僧侶', hp: 55, atk: 15, def: 10, move: 2, range: 2, color: '#f39c12' }
};

const PHASES = {
    PLAYER: 'player',
    ENEMY: 'enemy'
};

// ===== GAME STATE =====
class GameState {
    constructor() {
        this.map = [];
        this.units = [];
        this.selectedUnit = null;
        this.phase = PHASES.PLAYER;
        this.turnCount = 1;
        this.gameMode = 'select'; // select, move, attack
        this.moveRange = [];
        this.attackRange = [];
    }

    generateMap() {
        this.map = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            const row = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                row.push(this.generateTerrain(x, y));
            }
            this.map.push(row);
        }
    }

    generateTerrain(x, y) {
        const rand = Math.random();
        const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) + Math.random() * 0.5;

        if (noise > 0.8) return 'MOUNTAIN';
        if (noise > 0.5) return 'FOREST';
        if (noise < -0.5) return 'WATER';
        if (Math.random() > 0.85) return 'ROAD';
        return 'GRASS';
    }

    generateUnits() {
        this.units = [];
        const classKeys = Object.keys(UNIT_CLASSES);

        // Player units (3-4 units)
        const playerCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < playerCount; i++) {
            const classKey = classKeys[Math.floor(Math.random() * classKeys.length)];
            const unit = this.createUnit(classKey, 'player', i);
            this.placeUnit(unit, 0, 2);
        }

        // Enemy units (3-5 units)
        const enemyCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < enemyCount; i++) {
            const classKey = classKeys[Math.floor(Math.random() * classKeys.length)];
            const unit = this.createUnit(classKey, 'enemy', i);
            this.placeUnit(unit, GRID_SIZE - 3, GRID_SIZE - 1);
        }
    }

    createUnit(classKey, team, index) {
        const template = UNIT_CLASSES[classKey];
        const variance = 0.8 + Math.random() * 0.4; // 80%-120% stats

        return {
            id: `${team}_${index}`,
            team: team,
            class: classKey,
            name: `${template.name}${index + 1}`,
            hp: Math.floor(template.hp * variance),
            maxHp: Math.floor(template.hp * variance),
            atk: Math.floor(template.atk * variance),
            def: Math.floor(template.def * variance),
            move: template.move,
            range: template.range,
            color: template.color,
            x: 0,
            y: 0,
            acted: false
        };
    }

    placeUnit(unit, minX, maxX) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
            const x = minX + Math.floor(Math.random() * (maxX - minX + 1));
            const y = Math.floor(Math.random() * GRID_SIZE);

            if (!this.getUnitAt(x, y) && this.map[y][x] !== 'WATER') {
                unit.x = x;
                unit.y = y;
                this.units.push(unit);
                placed = true;
            }
            attempts++;
        }
    }

    getUnitAt(x, y) {
        return this.units.find(u => u.x === x && u.y === y && u.hp > 0);
    }

    getTerrain(x, y) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
        return TERRAIN_TYPES[this.map[y][x]];
    }

    calculateMoveRange(unit) {
        const range = [];
        const visited = new Set();
        const queue = [{ x: unit.x, y: unit.y, moves: 0 }];

        while (queue.length > 0) {
            const { x, y, moves } = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (x !== unit.x || y !== unit.y) {
                range.push({ x, y });
            }

            if (moves >= unit.move) continue;

            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const terrain = this.getTerrain(nx, ny);

                if (terrain && terrain.moveCost < 99) {
                    const otherUnit = this.getUnitAt(nx, ny);
                    if (!otherUnit || otherUnit.id === unit.id) {
                        const newMoves = moves + terrain.moveCost;
                        if (newMoves <= unit.move) {
                            queue.push({ x: nx, y: ny, moves: newMoves });
                        }
                    }
                }
            }
        }

        return range;
    }

    calculateAttackRange(unit) {
        const range = [];
        const centerX = unit.x;
        const centerY = unit.y;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                if (distance > 0 && distance <= unit.range) {
                    range.push({ x, y });
                }
            }
        }

        return range;
    }

    moveUnit(unit, x, y) {
        unit.x = x;
        unit.y = y;
    }

    attack(attacker, defender) {
        const terrain = this.getTerrain(defender.x, defender.y);
        const terrainDefense = terrain ? terrain.defense : 0;

        const damage = Math.max(1, attacker.atk - (defender.def + terrainDefense / 2));
        const actualDamage = Math.floor(damage * (0.9 + Math.random() * 0.2));

        defender.hp = Math.max(0, defender.hp - actualDamage);

        return {
            damage: actualDamage,
            killed: defender.hp === 0
        };
    }

    checkVictory() {
        const playerUnits = this.units.filter(u => u.team === 'player' && u.hp > 0);
        const enemyUnits = this.units.filter(u => u.team === 'enemy' && u.hp > 0);

        if (enemyUnits.length === 0) return 'victory';
        if (playerUnits.length === 0) return 'defeat';
        return null;
    }

    nextPhase() {
        if (this.phase === PHASES.PLAYER) {
            this.phase = PHASES.ENEMY;
            this.units.forEach(u => u.acted = false);
        } else {
            this.phase = PHASES.PLAYER;
            this.turnCount++;
            this.units.forEach(u => u.acted = false);
        }
    }
}

// ===== GAME RENDERER =====
class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
    }

    render(state) {
        this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw terrain
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                this.drawCell(x, y, state.map[y][x]);
            }
        }

        // Draw move range
        if (state.moveRange.length > 0) {
            this.ctx.fillStyle = 'rgba(100, 149, 237, 0.3)';
            state.moveRange.forEach(({ x, y }) => {
                this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            });
        }

        // Draw attack range
        if (state.attackRange.length > 0) {
            this.ctx.fillStyle = 'rgba(255, 69, 0, 0.3)';
            state.attackRange.forEach(({ x, y }) => {
                this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            });
        }

        // Draw grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * CELL_SIZE, 0);
            this.ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * CELL_SIZE);
            this.ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            this.ctx.stroke();
        }

        // Draw units
        state.units.filter(u => u.hp > 0).forEach(unit => {
            this.drawUnit(unit, unit === state.selectedUnit);
        });
    }

    drawCell(x, y, terrainType) {
        const terrain = TERRAIN_TYPES[terrainType];
        this.ctx.fillStyle = terrain.color;
        this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    drawUnit(unit, selected) {
        const x = unit.x * CELL_SIZE;
        const y = unit.y * CELL_SIZE;

        // Unit circle
        this.ctx.fillStyle = unit.color;
        this.ctx.beginPath();
        this.ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Team indicator (border)
        this.ctx.strokeStyle = unit.team === 'player' ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = selected ? 4 : 2;
        this.ctx.stroke();

        // HP bar
        const hpRatio = unit.hp / unit.maxHp;
        const barWidth = CELL_SIZE * 0.8;
        const barHeight = 4;
        const barX = x + (CELL_SIZE - barWidth) / 2;
        const barY = y + CELL_SIZE - 8;

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        this.ctx.fillStyle = hpRatio > 0.5 ? '#5cb85c' : hpRatio > 0.25 ? '#f0ad4e' : '#d9534f';
        this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // Acted indicator
        if (unit.acted) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor() {
        this.elements = {
            titleScreen: document.getElementById('title-screen'),
            gameScreen: document.getElementById('game-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            defeatScreen: document.getElementById('defeat-screen'),
            turnCount: document.getElementById('turn-count'),
            currentPhase: document.getElementById('current-phase'),
            unitDetails: document.getElementById('unit-details'),
            logContent: document.getElementById('log-content'),
            moveBtn: document.getElementById('move-btn'),
            attackBtn: document.getElementById('attack-btn'),
            waitBtn: document.getElementById('wait-btn'),
            cancelBtn: document.getElementById('cancel-btn'),
            endTurnBtn: document.getElementById('end-turn-btn')
        };
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        this.elements[screenName].classList.add('active');
    }

    updateTurnInfo(turnCount, phase) {
        this.elements.turnCount.textContent = turnCount;
        this.elements.currentPhase.textContent = phase === PHASES.PLAYER ? '味方' : '敵';
        this.elements.currentPhase.style.color = phase === PHASES.PLAYER ? '#5cb85c' : '#e94560';
    }

    updateUnitInfo(unit) {
        if (!unit) {
            this.elements.unitDetails.innerHTML = '<p>ユニットを選択してください</p>';
            return;
        }

        this.elements.unitDetails.innerHTML = `
            <p><strong>${unit.name}</strong> (${UNIT_CLASSES[unit.class].name})</p>
            <p>HP: ${unit.hp}/${unit.maxHp}</p>
            <p>攻撃: ${unit.atk} / 防御: ${unit.def}</p>
            <p>移動: ${unit.move} / 射程: ${unit.range}</p>
            <p>所属: ${unit.team === 'player' ? '味方' : '敵'}</p>
        `;
    }

    addLog(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        this.elements.logContent.insertBefore(entry, this.elements.logContent.firstChild);

        // Keep only last 20 entries
        while (this.elements.logContent.children.length > 20) {
            this.elements.logContent.removeChild(this.elements.logContent.lastChild);
        }
    }

    updateActionButtons(enabled, mode) {
        this.elements.moveBtn.disabled = !enabled || mode === 'move';
        this.elements.attackBtn.disabled = !enabled || mode === 'attack';
        this.elements.waitBtn.disabled = !enabled;
        this.elements.cancelBtn.disabled = mode === 'select';
    }

    showVictory(turnCount, units) {
        const survivingUnits = units.filter(u => u.team === 'player' && u.hp > 0);
        document.getElementById('victory-stats').innerHTML = `
            <p>クリアターン数: ${turnCount}</p>
            <p>生存ユニット数: ${survivingUnits.length}</p>
            <p>平均HP: ${Math.floor(survivingUnits.reduce((sum, u) => sum + u.hp, 0) / survivingUnits.length)}</p>
        `;
        this.showScreen('victoryScreen');
    }

    showDefeat(turnCount) {
        document.getElementById('defeat-stats').innerHTML = `
            <p>生存ターン数: ${turnCount}</p>
            <p>再挑戦して勝利を掴め!</p>
        `;
        this.showScreen('defeatScreen');
    }
}

// ===== AI CONTROLLER =====
class AIController {
    constructor(gameState) {
        this.state = gameState;
    }

    async executeTurn(ui, renderer) {
        ui.addLog('--- 敵ターン開始 ---', 'info');
        await this.sleep(800);

        const enemyUnits = this.state.units.filter(u =>
            u.team === 'enemy' && u.hp > 0 && !u.acted
        );

        for (const unit of enemyUnits) {
            await this.executeUnitAction(unit, ui, renderer);
            await this.sleep(500);
        }

        ui.addLog('--- 敵ターン終了 ---', 'info');
        this.state.nextPhase();
        ui.updateTurnInfo(this.state.turnCount, this.state.phase);
    }

    async executeUnitAction(unit, ui, renderer) {
        // Find targets
        const attackRange = this.state.calculateAttackRange(unit);
        const targets = attackRange
            .map(pos => this.state.getUnitAt(pos.x, pos.y))
            .filter(u => u && u.team === 'player');

        if (targets.length > 0) {
            // Attack
            const target = targets[Math.floor(Math.random() * targets.length)];
            const result = this.state.attack(unit, target);
            ui.addLog(`${unit.name}が${target.name}を攻撃! ${result.damage}ダメージ!`, 'damage');

            if (result.killed) {
                ui.addLog(`${target.name}は倒れた...`, 'damage');
            }
        } else {
            // Move towards nearest player unit
            const playerUnits = this.state.units.filter(u => u.team === 'player' && u.hp > 0);
            if (playerUnits.length > 0) {
                const moveRange = this.state.calculateMoveRange(unit);
                if (moveRange.length > 0) {
                    const nearest = playerUnits.reduce((closest, u) => {
                        const dist = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
                        const closestDist = Math.abs(closest.x - unit.x) + Math.abs(closest.y - unit.y);
                        return dist < closestDist ? u : closest;
                    });

                    const bestMove = moveRange.reduce((best, pos) => {
                        const dist = Math.abs(pos.x - nearest.x) + Math.abs(pos.y - nearest.y);
                        const bestDist = Math.abs(best.x - nearest.x) + Math.abs(best.y - nearest.y);
                        return dist < bestDist ? pos : best;
                    });

                    this.state.moveUnit(unit, bestMove.x, bestMove.y);
                    ui.addLog(`${unit.name}が移動`, 'info');
                }
            }
        }

        unit.acted = true;
        renderer.render(this.state);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== GAME CONTROLLER =====
class GameController {
    constructor() {
        this.state = new GameState();
        this.renderer = null;
        this.ui = new UIManager();
        this.ai = new AIController(this.state);

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-victory-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('restart-defeat-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('end-turn-btn').addEventListener('click', () => this.endTurn());

        document.getElementById('move-btn').addEventListener('click', () => this.setMode('move'));
        document.getElementById('attack-btn').addEventListener('click', () => this.setMode('attack'));
        document.getElementById('wait-btn').addEventListener('click', () => this.waitUnit());
        document.getElementById('cancel-btn').addEventListener('click', () => this.cancelAction());
    }

    startGame() {
        this.state = new GameState();
        this.state.generateMap();
        this.state.generateUnits();

        const canvas = document.getElementById('battlefield');
        this.renderer = new GameRenderer(canvas);

        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        this.ui.showScreen('gameScreen');
        this.ui.updateTurnInfo(this.state.turnCount, this.state.phase);
        this.ui.addLog('=== 戦闘開始 ===', 'info');

        this.renderer.render(this.state);
    }

    restartGame() {
        this.ui.elements.logContent.innerHTML = '';
        this.startGame();
    }

    handleCanvasClick(event) {
        if (this.state.phase !== PHASES.PLAYER) return;

        const rect = event.target.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
        const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);

        if (this.state.gameMode === 'select') {
            this.selectUnit(x, y);
        } else if (this.state.gameMode === 'move') {
            this.moveSelectedUnit(x, y);
        } else if (this.state.gameMode === 'attack') {
            this.attackWithSelectedUnit(x, y);
        }
    }

    selectUnit(x, y) {
        const unit = this.state.getUnitAt(x, y);

        if (unit && unit.team === 'player' && !unit.acted) {
            this.state.selectedUnit = unit;
            this.state.moveRange = [];
            this.state.attackRange = [];
            this.ui.updateUnitInfo(unit);
            this.ui.updateActionButtons(true, 'select');
            this.ui.addLog(`${unit.name}を選択`, 'info');
        } else {
            this.state.selectedUnit = null;
            this.state.moveRange = [];
            this.state.attackRange = [];
            this.ui.updateUnitInfo(null);
            this.ui.updateActionButtons(false, 'select');
        }

        this.renderer.render(this.state);
    }

    setMode(mode) {
        if (!this.state.selectedUnit) return;

        this.state.gameMode = mode;

        if (mode === 'move') {
            this.state.moveRange = this.state.calculateMoveRange(this.state.selectedUnit);
            this.state.attackRange = [];
            this.ui.addLog('移動先を選択してください', 'info');
        } else if (mode === 'attack') {
            this.state.attackRange = this.state.calculateAttackRange(this.state.selectedUnit);
            this.state.moveRange = [];
            this.ui.addLog('攻撃対象を選択してください', 'info');
        }

        this.ui.updateActionButtons(true, mode);
        this.renderer.render(this.state);
    }

    moveSelectedUnit(x, y) {
        const inRange = this.state.moveRange.some(pos => pos.x === x && pos.y === y);
        const occupied = this.state.getUnitAt(x, y);

        if (inRange && !occupied) {
            const unit = this.state.selectedUnit;
            this.state.moveUnit(unit, x, y);
            this.ui.addLog(`${unit.name}が移動`, 'info');
            this.cancelAction();
        }
    }

    attackWithSelectedUnit(x, y) {
        const inRange = this.state.attackRange.some(pos => pos.x === x && pos.y === y);
        const target = this.state.getUnitAt(x, y);

        if (inRange && target && target.team === 'enemy') {
            const attacker = this.state.selectedUnit;
            const result = this.state.attack(attacker, target);

            this.ui.addLog(`${attacker.name}が${target.name}を攻撃! ${result.damage}ダメージ!`, 'damage');

            if (result.killed) {
                this.ui.addLog(`${target.name}は倒れた...`, 'damage');
            }

            attacker.acted = true;
            this.state.selectedUnit = null;
            this.state.gameMode = 'select';
            this.state.attackRange = [];
            this.ui.updateActionButtons(false, 'select');
            this.ui.updateUnitInfo(null);
            this.renderer.render(this.state);

            this.checkGameEnd();
        }
    }

    waitUnit() {
        if (this.state.selectedUnit) {
            this.state.selectedUnit.acted = true;
            this.ui.addLog(`${this.state.selectedUnit.name}は待機`, 'info');
            this.state.selectedUnit = null;
            this.state.gameMode = 'select';
            this.state.moveRange = [];
            this.state.attackRange = [];
            this.ui.updateActionButtons(false, 'select');
            this.ui.updateUnitInfo(null);
            this.renderer.render(this.state);
        }
    }

    cancelAction() {
        this.state.gameMode = 'select';
        this.state.moveRange = [];
        this.state.attackRange = [];
        this.ui.updateActionButtons(true, 'select');
        this.renderer.render(this.state);
    }

    async endTurn() {
        if (this.state.phase !== PHASES.PLAYER) return;

        this.state.selectedUnit = null;
        this.state.gameMode = 'select';
        this.state.moveRange = [];
        this.state.attackRange = [];
        this.ui.updateActionButtons(false, 'select');
        this.ui.updateUnitInfo(null);

        this.state.nextPhase();
        this.ui.updateTurnInfo(this.state.turnCount, this.state.phase);

        await this.ai.executeTurn(this.ui, this.renderer);

        this.checkGameEnd();
        this.renderer.render(this.state);
    }

    checkGameEnd() {
        const result = this.state.checkVictory();

        if (result === 'victory') {
            setTimeout(() => {
                this.ui.showVictory(this.state.turnCount, this.state.units);
            }, 1000);
        } else if (result === 'defeat') {
            setTimeout(() => {
                this.ui.showDefeat(this.state.turnCount);
            }, 1000);
        }
    }
}

// ===== INITIALIZATION =====
let game;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}

window.addEventListener('DOMContentLoaded', () => {
    game = new GameController();
});
