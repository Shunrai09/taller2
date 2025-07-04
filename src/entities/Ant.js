import { JITTER, SPEED_RANGE, DURATION_FACTOR } from '../config/constants';
import { ONE_WAY_STREETS } from '../config/traffic';

export class Ant {

    constructor(startIndex, targetIndex, nodes, scene, color) {
        this.scene = scene;
        this.current = startIndex;
        this.target = targetIndex;
        this.path = [startIndex];
        this.totalDistance = 0;
        this.nodes = nodes;
        this.color = color;
        this.arrived = false;
        this.isMoving = false;
        this.counted = false;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.maxStuckTime = 2000;
        this.speed = Phaser.Math.FloatBetween(...SPEED_RANGE);
        this.startTime = Date.now(); // Añadir esta línea para registrar el momento de creación
        this.travelTime = 0; // Añadir esta propiedad
        const { x, y } = nodes[startIndex];
        this.sprite = scene.add.circle(
            x + Phaser.Math.Between(-JITTER, JITTER),
            y + Phaser.Math.Between(-JITTER, JITTER),
            5,
            color   
        );
        this.maxRetries = 3; // Intentos máximos antes de reiniciar ruta
        this.retryCount = 0;
        this.visitedEdges = new Set(); // Registrar aristas visitadas
        this.directionVector = { x: 0, y: 0 }; // Vector de dirección general
        this.updateDirectionVector(); // Calcular dirección inicial

    }
    tryMove(ctx) {
        // Verificar si está dando vueltas
        if (this.path.length > ctx.nodes.length * 0.7) {
        console.log(`Hormiga ${this.path[0]} en posible ciclo, reiniciando`);
        this.path = [this.path[0]]; // Reiniciar camino
        this.current = this.path[0];
        this.visitedEdges.clear();
    return;
  }
        if (this.arrived || this.isMoving || this.isStuck || this.isAvoiding) {
            if (this.isStuck) {
                this.stuckTimer -= ctx.time.delta;
                if (this.stuckTimer <= 0) this.isStuck = false;
            }
            if (this.isAvoiding) {
                this.avoidanceTimer -= ctx.time.delta;
                if (this.avoidanceTimer <= 0) this.isAvoiding = false;
                else this.performAvoidance(ctx);
            }
            return;
        }

        const previousNode = this.path.length > 1 ? this.path[this.path.length - 2] : null;

        // 1. Obtener vecinos directos
        const neighbors = ctx.edges
            .filter(([u, v]) => u === this.current || v === this.current)
            .map(([u, v]) => (u === this.current ? v : u));

        // 2. Filtrar por reglas de movimiento
        const validNeighbors = neighbors.filter(n => {
            // Verificar calles unidireccionales
            const edgeKey = `${this.current}-${n}`;
            const reverseEdgeKey = `${n}-${this.current}`;

            // Si es unidireccional en esta dirección, permitir
            if (ONE_WAY_STREETS[edgeKey]) {
                return true;
            }

            // Si es unidireccional en dirección contraria, prohibir
            if (ONE_WAY_STREETS[reverseEdgeKey]) {
                return false;
            }

            // Evitar retroceso
            if (n === previousNode) {
                return false;
            }

            return true;
        });

        // Resto del método permanece igual...
        if (validNeighbors.length === 0) {
            console.log(`[Hormiga] No hay caminos válidos desde el nodo ${this.current}.`);
            return;
        }

        const next = validNeighbors.length === 1
            ? validNeighbors[0]
            : ctx.selectNextNode(this, validNeighbors);

        const dist = Phaser.Math.Distance.BetweenPoints(
            this.nodes[this.current],
            this.nodes[next]
        );
        this.moveTo(next, dist, ctx);
    }
    moveTo(nextNodeIndex, distance, ctx) {
        this.isMoving = true;
        this.current = nextNodeIndex;
        this.path.push(nextNodeIndex);
        this.totalDistance += distance;
        if (nextNodeIndex === this.target) {
            this.arrived = true;
            this.travelTime = Date.now() - this.startTime; // Calcular tiempo de viaje
            console.log(
                `Hormiga llegó a la meta en ${(this.travelTime / 1000).toFixed(2)} segundos. ` +
                `Recorrido: ${this.path.length - 1} nodos, Distancia: ${this.totalDistance.toFixed(2)}`
            );
            this.sprite.setFillStyle(this.color);
            this.isMoving = false;
            return;
        }

        if (nextNodeIndex === this.target) {
            this.arrived = true;
            this.sprite.setFillStyle(this.color);
            this.isMoving = false;
            return;
        }

        const { x, y } = this.nodes[nextNodeIndex];
        ctx.tweens.add({
            targets: this.sprite,
            x, y,
            duration: distance * DURATION_FACTOR * this.speed,
            ease: 'Linear',
            onComplete: () => this.isMoving = false
        });
    }
    updateDirectionVector() {
        const targetNode = this.nodes[this.target];
        const currentNode = this.nodes[this.current];
        this.directionVector = {
            x: targetNode.x - currentNode.x,
            y: targetNode.y - currentNode.y
        };
        // Normalizar el vector
        const length = Math.sqrt(this.directionVector.x**2 + this.directionVector.y**2);
        if (length > 0) {
            this.directionVector.x /= length;
            this.directionVector.y /= length;
        }
    }
    update() {
  // Mostrar dirección y destino
  if (this.sprite && !this.arrived) {
    const targetNode = this.nodes[this.target];
    this.scene.graphics.lineStyle(1, this.color, 0.3);
    this.scene.graphics.lineBetween(
      this.sprite.x, this.sprite.y,
      targetNode.x, targetNode.y
    );
    
    // Mostrar punto de destino
    this.scene.graphics.fillStyle(this.color, 0.5);
    this.scene.graphics.fillCircle(targetNode.x, targetNode.y, 8);
  }
}
}