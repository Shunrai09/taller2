import Phaser from 'phaser';
import { Ant } from '../entities/Ant';
import {
  JITTER, SPEED_RANGE, DURATION_FACTOR,
  SPAWN_INTERVAL, CYCLE_INTERVAL, TRAFFIC_INTERVAL,
  ACO_PARAMS, TRAFFIC_PARAMS
} from '../config/constants';
import { COLONIES } from '../config/colonies';
import { NODES } from '../config/nodes';
import { BASE_EDGES } from '../config/edges';
import { SPECIAL_EDGES } from '../config/traffic';
import { ONE_WAY_STREETS } from '../config/traffic';


export class ACOScene extends Phaser.Scene {
  constructor() {
    super('ACOScene');
    // Agregar a tu clase ACOScene (en la parte de inicialización)
    this.edgeStates = {
      '22-33': true,  // true = semáforo verde, false = semáforo rojo
      '33-34': true,
      '34-35': true,
      '9-22': true,
      '31-34': true
    };
    
    // Parámetros ACO
    this.edgeUsage = {}
    this.alpha = ACO_PARAMS.alpha;
    this.beta = ACO_PARAMS.beta;
    this.evaporationRate = ACO_PARAMS.evaporationRate;
    this.numAntsPerColony = ACO_PARAMS.numAntsPerColony;

    // Estructuras
    this.nodes = NODES;
    this.edges = [];
    this.pheromones = [];
    this.ants = [];

    // Colonias
    this.colonies = COLONIES;

    // Semáforos
    this.specialEdges = SPECIAL_EDGES;
    this.edgeStates = {};
    this.specialEdges.forEach(key => this.edgeStates[key] = true);
    this.specialEdgeTimers = {};

    this.collisionCount = 0;
    this.collisionText = null;
  }

  preload() { }

  create() {
    this.graphics = this.add.graphics();

    this.setupNodes();
    this.setupEdges();
    this.initPheromones();
    this.setupColonies();
    this.createUI();
    this.startTimers();
    this.graphics = this.add.graphics();

    this.trafficLights = {};

    this.trafficLights = {};

    // Definir semáforo para la calle [22, 33]
    this.trafficLights['22-33'] = this.add.circle(
      this.nodes[22].x, this.nodes[33].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);
  
    // Definir semáforo para la calle [33, 34]
    this.trafficLights['33-34'] = this.add.circle(
      this.nodes[33].x, this.nodes[34].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['34-35'] = this.add.circle(
      this.nodes[34].x, this.nodes[35].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);
  
    // Definir semáforo para la calle [33, 34]
    this.trafficLights['9-22'] = this.add.circle(
      this.nodes[9].x, this.nodes[22].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['31-34'] = this.add.circle(
      this.nodes[31].x, this.nodes[34].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);
    

    // Crear otros gráficos de la simulación
    this.graphics = this.add.graphics();
  
    // **Aquí agregamos el temporizador que alterna el estado de los semáforos cada 10 segundos**
    this.time.addEvent({
      delay: 5000,  // Intervalo de 10 segundos (10000 ms)
      loop: true,
      callback: this.toggleTrafficLights,
      callbackScope: this
    });

    // Crear otros gráficos de la simulación
    this.graphics = this.add.graphics();
    // Añadir texto para mostrar colisiones
    this.collisionText = this.add.text(20, 60, 'Colisiones: 0', {
      font: '14px Arial',
      fill: '#ff0000'
    });
  }
  update() {
    // Verificar colisiones globales
    this.checkGlobalCollisions();
  }
  checkGlobalCollisions() {
    const collisions = new Set();

    for (let i = 0; i < this.ants.length; i++) {
      for (let j = i + 1; j < this.ants.length; j++) {
        const ant1 = this.ants[i];
        const ant2 = this.ants[j];

        if (ant1.arrived || ant2.arrived) continue;

        const distance = Phaser.Math.Distance.Between(
          ant1.sprite.x, ant1.sprite.y,
          ant2.sprite.x, ant2.sprite.y
        );

        if (distance < ant1.collisionRadius + ant2.collisionRadius) {
          collisions.add(ant1);
          collisions.add(ant2);

          // Visualización de colisión
          this.graphics.lineStyle(2, 0xff0000, 0.5);
          this.graphics.lineBetween(
            ant1.sprite.x, ant1.sprite.y,
            ant2.sprite.x, ant2.sprite.y
          );
        }
      }
    }

    if (collisions.size > 0) {
      this.collisionCount += collisions.size;
      this.collisionText.setText(`Colisiones: ${this.collisionCount}`);

      // Mostrar estadísticas periódicamente
      if (this.time.now % 5000 < 16) {
        console.log(`Colisiones detectadas: ${collisions.size}`);
        console.log(`Total de colisiones: ${this.collisionCount}`);
      }
    }
  }
  toggleTrafficLights() {
    // Cambiar el estado del semáforo
    this.edgeStates['22-33'] = !this.edgeStates['22-33'];
    this.edgeStates['33-34'] = !this.edgeStates['33-34'];
    this.edgeStates['34-35'] = !this.edgeStates['34-35'];
    this.edgeStates['9-22'] = !this.edgeStates['9-22'];
    this.edgeStates['31-34'] = !this.edgeStates['31-34'];
  
    // Cambiar el color de los semáforos visualmente
    this.trafficLights['22-33'].setFillStyle(this.edgeStates['22-33'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['33-34'].setFillStyle(this.edgeStates['33-34'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['34-35'].setFillStyle(this.edgeStates['34-35'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['9-22'].setFillStyle(this.edgeStates['9-22'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['31-34'].setFillStyle(this.edgeStates['31-34'] ? 0x00ff00 : 0xff0000);
  
    console.log('Estado de semáforo:', this.edgeStates);
  }
  setupNodes() {
    this.nodes.forEach((n, i) => {
      this.add.circle(n.x, n.y, 8, 0xffffff);  // Color blanco para todos los nodos
      this.add.text(n.x - 5, n.y - 5, `${i}`, { font: '10px Arial', fill: '#000' });
    });
  }

  setupEdges() {
    // Usar solo las aristas base definidas en la configuración
    this.edges = BASE_EDGES;

    // Añadir aristas críticas
    BASE_EDGES.forEach(([i, j]) => {
      if (i < this.nodes.length && j < this.nodes.length &&
        !this.edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) {
        this.edges.push([i, j]);
      }
    });
  }

  initPheromones() {
    const N = this.nodes.length;
    this.pheromones = Array(N).fill().map(() => Array(N).fill(0.1));
    this.edges.forEach(([i, j]) => {
      const d = Phaser.Math.Distance.BetweenPoints(this.nodes[i], this.nodes[j]);
      this.pheromones[i][j] = this.pheromones[j][i] = 1 / d;
    });
  }

  setupColonies() {
    this.colonies.forEach((col, index) => {
      col.spawnCount = 0;
      col.arrivedCount = 0;
      col.text = this.add.text(
        20, 100 + 25 * index,
        `Colonia ${col.name}: 0/${this.numAntsPerColony}`,
        { font: '14px Arial', fill: Phaser.Display.Color.IntegerToColor(col.color).rgba }
      );
    });
  }

  createUI() {
    this.add.text(20, 20, 'ACO – Múltiples Colonias', { font: '16px Arial', fill: '#fff' });
    this.add.rectangle(700, 30, 150, 30, 0x333333)
      .setInteractive()
      .on('pointerdown', () => this.resetSimulation());
    this.add.text(625, 25, 'Reiniciar Simulación', { font: '14px Arial', fill: '#fff' });
  }

  startTimers() {
    this.colonies.forEach(col => {
      col.spawnEvent = this.time.addEvent({
        delay: SPAWN_INTERVAL,
        callback: () => this.spawnAnt(col),
        callbackScope: this,
        repeat: this.numAntsPerColony - 1
      });
    });
    this.time.addEvent({
      delay: CYCLE_INTERVAL,
      loop: true,
      callback: () => this.runCycle()
    });
  }

  resetSimulation() {
    this.ants.forEach(a => a.sprite.destroy());
    this.ants = [];
    this.graphics.clear();
    this.initPheromones();
    this.colonies.forEach(col => {
      col.spawnCount = col.arrivedCount = 0;
      col.text.setText(`Colonia ${col.name}: 0/${this.numAntsPerColony}`);
      col.spawnEvent.reset({ repeat: this.numAntsPerColony - 1, delay: SPAWN_INTERVAL });
    });
  }

  spawnAnt(colony) {
    const ant = new Ant(colony.start, colony.target, this.nodes, this, colony.color);
    this.ants.push(ant);
    colony.spawnCount++;
    colony.text.setText(`Colonia ${colony.name}: ${colony.arrivedCount}/${colony.spawnCount}`);
  }

  runCycle() {
    this.moveAnts();
    this.updatePheromones();
    this.renderPheromones();
  }

  moveAnts() {
    this.ants.forEach(ant => ant.tryMove(this));
  }

  selectNextNode(ant, neighbors) {
    if (!neighbors || neighbors.length === 0) return null;
  
    const previousNode = ant.path.length >= 2 ? ant.path[ant.path.length - 2] : null;
    let validNeighbors = neighbors.filter(n => {
      // Validar que el nodo existe
      if (n === undefined || n >= this.nodes.length) return false;
  
      // Evitar retroceso
      if (n === previousNode) return false;
  
      const edgeKey = `${ant.current}-${n}`;
      const reverseEdgeKey = `${n}-${ant.current}`;
  
      // Verificar semáforo
      if (this.edgeStates[edgeKey] === false) {
        // Si el semáforo está rojo (false), no permitir el paso
        return false;
      }
  
      // Verificar si es contravía (arista unidireccional)
      if (ONE_WAY_STREETS[reverseEdgeKey]) {
        return false;
      }
  
      return true;
    });
  
    // Resto del código sigue igual...
    const probs = validNeighbors.map(n => {
      const pher = this.pheromones[ant.current][n];
      const heur = 1 / Phaser.Math.Distance.BetweenPoints(
          this.nodes[ant.current], 
          this.nodes[n]
      );
  
      // Factor de congestión (inversamente proporcional al tráfico)
      const traffic = this.getEdgeTraffic(ant.current, n);
      const congestionFactor = 1 / (1 + traffic);
  
      return Math.pow(pher, this.alpha) * 
             Math.pow(heur, this.beta) * 
             Math.pow(congestionFactor, ACO_PARAMS.gamma || 1);
    });
  
    const total = probs.reduce((s, p) => s + p, 0);
    let rnd = Math.random(), sum = 0;
  
    for (let i = 0; i < validNeighbors.length; i++) {
      sum += probs[i] / total;
      if (rnd <= sum) return validNeighbors[i];
    }
  
    return validNeighbors[validNeighbors.length - 1];
  }
  

  getEdgeTraffic(u, v) {
    const edgeKey = `${Math.min(u, v)}-${Math.max(u, v)}`;
    return this.ants.filter(ant =>
      ant.isMoving &&
      ant.current === u &&
      ant.currentTarget === v
    ).length;
  }
  renderPheromones() {
    this.ants.forEach(ant => {
      const speedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xff0000), // Rojo (lento)
        Phaser.Display.Color.ValueToColor(0x00ff00), // Verde (rápido)
        100,
        (ant.currentSpeed / ant.maxSpeed) * 100
      ).color;

      this.graphics.fillStyle(speedColor);
      this.graphics.fillCircle(ant.sprite.x, ant.sprite.y, 3);

      // Mostrar dirección
      if (ant.currentTarget) {
        const targetNode = this.nodes[ant.currentTarget];
        this.graphics.lineStyle(1, 0xffffff);
        this.graphics.lineBetween(
          ant.sprite.x, ant.sprite.y,
          targetNode.x, targetNode.y
        );
      }
    });
    // Visualización de congestión
    this.edges.forEach(([i, j]) => {
      const traffic = this.getEdgeTraffic(i, j);
      const congestion = Math.min(traffic / TRAFFIC_PARAMS.CONGESTION_THRESHOLD, 1);

      this.graphics.lineStyle(
        3 + congestion * 5, // Grosor según congestión
        Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x00ff00), // Verde
          Phaser.Display.Color.ValueToColor(0xff0000), // Rojo
          100,
          congestion * 100
        ).color
      );

      this.graphics.lineBetween(
        this.nodes[i].x, this.nodes[i].y,
        this.nodes[j].x, this.nodes[j].y
      );
    });
  }

  updatePheromones() {
    // evaporación
    this.edges.forEach(([i, j]) => {
      this.pheromones[i][j] *= this.evaporationRate;
      this.pheromones[j][i] *= this.evaporationRate;
    });

    // contar llegadas y refuerzo
    this.ants.forEach(ant => {
      if (ant.arrived && !ant.counted) {
        ant.counted = true;
        const col = this.colonies.find(c => c.start === ant.path[0]);
        if (col) {
          col.arrivedCount++;
          // Mostrar estadísticas por colonia
          console.log(
            `[Colonia ${col.name}] Hormiga llegó en ${(ant.travelTime / 1000).toFixed(2)}s ` +
            `(Promedio: ${this.getAverageTime(col)}s)`
          );
          col.text.setText(`Colonia ${col.name}: ${col.arrivedCount}/${col.spawnCount}`);
        }
      }

      if (ant.arrived) {
        for (let k = 0; k < ant.path.length - 1; k++) {
          const u = ant.path[k], v = ant.path[k + 1];
          const edgeKey = `${Math.min(u, v)}-${Math.max(u, v)}`;

          // Contar uso de la arista
          this.edgeUsage[edgeKey] = (this.edgeUsage[edgeKey] || 0) + 1;

          // ... resto del código existente ...
        }
      }
      if (ant.arrived) {
        const pherAdd = 100 / ant.totalDistance;
        for (let k = 0; k < ant.path.length - 1; k++) {
          const u = ant.path[k], v = ant.path[k + 1];
          this.pheromones[u][v] += pherAdd;
          this.pheromones[v][u] += pherAdd;
        }
      }
    });
    if (this.time.now % 5000 < 16) { // Cada ~5 segundos
      this.showBusiestEdges(5); // Mostrar top 5 calles
    }
  }
  getAverageTime(colony) {
    const colonyAnts = this.ants.filter(a =>
      a.path[0] === colony.start && a.arrived
    );
    if (colonyAnts.length === 0) return 0;

    const totalTime = colonyAnts.reduce((sum, ant) => sum + ant.travelTime, 0);
    return (totalTime / colonyAnts.length / 1000).toFixed(2);
  }
  showBusiestEdges(topN = 5) {
    const edgesSorted = Object.entries(this.edgeUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    if (edgesSorted.length > 0) {
      console.log('--- Calles más concurridas ---');
      edgesSorted.forEach(([edge, count]) => {
        const [u, v] = edge.split('-').map(Number);
        const nodeA = this.nodes[u];
        const nodeB = this.nodes[v];
        const distance = Phaser.Math.Distance.Between(
          nodeA.x, nodeA.y,
          nodeB.x, nodeB.y
        ).toFixed(2);

        console.log(
          `Calle ${edge}: ${count} hormigas | ` +
          `Distancia: ${distance} | ` +
          `Unidireccional: ${ONE_WAY_STREETS[edge] ? 'Sí' : 'No'}`
        );
      });
    }
  }
  renderPheromones() {
    this.graphics.clear();
    const maxPheromone = Math.max(...this.edges.map(([i, j]) => this.pheromones[i][j]));

    // Definir las calles con mayor grosor (puedes agregar más según lo necesites)
    const thickerStreets = [
      "0-1", "0-11", "11-12", "12-13", "13-14", "14-15", "15-16", "16-17", "17-19", "18-19", "18-55", "10-55", "9-10", "8-9", "7-8", "6-7", "5-6", "4-5", "3-4", "2-3", "1-2"
    ];

    this.edges.forEach(([i, j]) => {
      const edgeKey = `${i}-${j}`;
      if (ONE_WAY_STREETS[edgeKey]) {
        // Dibujar una flecha pequeña en la mitad de la arista
        const midX = (this.nodes[i].x + this.nodes[j].x) / 2;
        const midY = (this.nodes[i].y + this.nodes[j].y) / 2;
        this.graphics.fillStyle(0xff0000, 1);
        this.graphics.fillTriangle(
          midX, midY,
          midX - 5, midY - 10,
          midX + 5, midY - 10
        );
      }
    });
    const maxUsage = Math.max(...Object.values(this.edgeUsage));
    this.edges.forEach(([i, j]) => {
      const edgeKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
      const usage = this.edgeUsage[edgeKey] || 0;

      if (usage > 0) {
        // Intensidad del color basada en el tráfico
        const intensity = usage / maxUsage;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x00ff00), // Verde bajo
          Phaser.Display.Color.ValueToColor(0xff0000), // Rojo alto
          100,
          intensity * 100
        ).color;

        this.graphics.lineStyle(3 + intensity * 5, color);
        this.graphics.lineBetween(
          this.nodes[i].x, this.nodes[i].y,
          this.nodes[j].x, this.nodes[j].y
        );
      }
    });


    this.edges.forEach(([i, j]) => {
      const edgeKey = `${Math.min(i, j)}-${Math.max(i, j)}`;

      let color, width;

      // Si la arista es una de las "gruesas", asignamos el grosor y color correspondientes
      if (thickerStreets.includes(edgeKey)) {
        width = 6;  // Doble de gruesa (grosor base: 3 para las normales)
        color = 0xff7f00;  // Naranja para las calles gruesas
      } else {
        width = 3;  // Grosor base para las calles normales
        color = Phaser.Display.Color.GetColor(25, 100, 100);  // Amarillo para las calles normales
      }

      // Dibujar la línea de la arista
      this.graphics.lineStyle(width, color);
      this.graphics.lineBetween(
        this.nodes[i].x, this.nodes[i].y,
        this.nodes[j].x, this.nodes[j].y
      );

    });
  }
}