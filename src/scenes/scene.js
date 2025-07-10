import Phaser from 'phaser';
import { Ant } from '../entities/Ant';
import {
  JITTER, SPEED_RANGE, DURATION_FACTOR,
  SPAWN_INTERVAL, CYCLE_INTERVAL, TRAFFIC_INTERVAL,
  ACO_PARAMS, TRAFFIC_PARAMS, MIN_ANTS_PER_MINUTE, MAX_ANTS_PER_MINUTE, SPAWN_RANDOMNESS
} from '../config/constants';
import { COLONIES, ENTRANCES, EXITS, getRandomNode } from '../config/colonies';
import { NODES } from '../config/nodes';
import { BASE_EDGES } from '../config/edges';
import { SPECIAL_EDGES } from '../config/traffic';
import { ONE_WAY_STREETS } from '../config/traffic';


export class ACOScene extends Phaser.Scene {
  constructor() {
    super('ACOScene');
    this.numCarsText = null; 
    this.mostUsedRoutesText = null;  
    this.avgTimeText = null;  
    this.numCars = 0;
    this.mostUsedRoutes = {}; 
    this.totalTravelTime = 0;
    this.totalArrived = 0;
    this.edgeUsage = {}
    this.alpha = 0;
    this.beta = 0;
    this.evaporationRate = 0;
    this.numAntsPerColony = 0;
    this.nodes = NODES;
    this.edges = [];
    this.pheromones = [];
    this.ants = [];
    this.colonies = COLONIES;
    this.specialEdges = SPECIAL_EDGES;
    this.edgeStates = {};
    this.specialEdges.forEach(key => this.edgeStates[key] = true);
    this.specialEdgeTimers = {};
    this.colonyStats = {};
    this.antsPerSecondRange = [
      MIN_ANTS_PER_MINUTE / 50,  // ~1.16 hormigas/seg
      MAX_ANTS_PER_MINUTE / 60   // ~1.66 hormigas/seg
    ];
    this.nextSpawnInterval = this.calculateNextSpawnInterval();
    this.HORMIGAS_POR_MINUTO = 150;
    this.hormigasGeneradasEsteMinuto = 0;
    this.ultimoMinuto = 0;

  }
  calculateNextSpawnInterval() {
    const antsPerSecond = Phaser.Math.FloatBetween(...this.antsPerSecondRange);
    const baseInterval = 1000 / antsPerSecond; // Convertir a ms entre hormigas

    return Phaser.Math.Between(
      baseInterval * (1 - SPAWN_RANDOMNESS),
      baseInterval * (1 + SPAWN_RANDOMNESS)
    );
  }
  preload() { }

  updateIndicatorTexts() {
    // Datos simulados (puedes ajustar estos valores según lo que necesites)
    const simulatedData = {
        intersections: 67,          // Número fijo de intersecciones
        routes: 120,                 // Número fijo de rutas
        trafficLightTime: 10,
        avgSpeed: Phaser.Math.FloatBetween(10, 15).toFixed(2),  // Valor aleatorio
        topRoutes: [
            { route: "22-33", count: 120 },
            { route: "33-34", count: 115 },
            { route: "24-32", count: 95 }
        ]
    };

    // Actualizar los textos con datos simulados
    this.intersectionsText.setText(`Intersecciones modeladas: ${simulatedData.intersections}`);
    this.routesText.setText(`Rutas implementadas: ${simulatedData.routes}`);
    this.trafficLightTimeText.setText(`Tiempo de semáforos: ${simulatedData.trafficLightTime}s`);
    this.avgSpeedText.setText(`Velocidad promedio: ${simulatedData.avgSpeed}px/s`);
    this.algorithmTimeText.setText(`Tiempo de ejecucion:${simulatedData.algorithmTime}`)

    // Rutas más usadas (simuladas)
    let routesText = 'Rutas más usadas:\n';
    simulatedData.topRoutes.forEach(route => {
        routesText += `${route.route}: ${route.count} veces\n`;
    });
    this.mostUsedRoutesText.setText(routesText);
}
  create() {
    this.numCarsText = this.add.text(
      600, 
      50,  
      'Número de autos: 0',
      { font: '14px Arial', fill: '#ffffff' }
    );
    this.mostUsedRoutesText = this.add.text(
      600, 
      70,  
      'Rutas más usadas: ',
      { font: '14px Arial', fill: '#ffffff' }
    );
    this.timeElapsedText = this.add.text(
      600,
      150,
      'Tiempo transcurrido: 0s',
      { font: '14px Arial', fill: '#ffffff' }
    );
    this.intersectionsText = this.add.text(
        600, 200,
        'Intersecciones modeladas: 0',
        { font: '14px Arial', fill: '#ffffff' }
    );

    this.routesText = this.add.text(
        600, 220,
        'Rutas implementadas: 0',
        { font: '14px Arial', fill: '#ffffff' }
    );

  

    this.trafficLightTimeText = this.add.text(
        600, 260,
        'Tiempo de semáforos: 5s',
        { font: '14px Arial', fill: '#ffffff' }
    );

    this.avgSpeedText = this.add.text(
        600, 280,
        'Velocidad promedio: 0',
        { font: '14px Arial', fill: '#ffffff' }
    );

    this.algorithmTimeText = this.add.text(
        600, 320,
        'Tiempo de ejecución: 0s',
        { font: '14px Arial', fill: '#ffffff' }
    );

    // Inicializar los valores
    this.updateIndicatorTexts();

    this.setupNodes();
    this.setupEdges();
    this.initPheromones();
    this.setupColonies();
    this.createUI();
    this.startTimers();
    this.graphics = this.add.graphics();
    this.trafficLights = {};
    this.trafficLights = {};
    ENTRANCES.forEach(ent => {
      this.add.circle(this.nodes[ent.node].x, this.nodes[ent.node].y, 12, ent.color)
        .setAlpha(0.7);
      this.add.text(this.nodes[ent.node].x - 30, this.nodes[ent.node].y - 25,
        ent.name, { font: '10px Arial', fill: '#ffffff' });
    });

    EXITS.forEach(ex => {
      this.add.rectangle(this.nodes[ex.node].x, this.nodes[ex.node].y, 15, 15, ex.color)
        .setAlpha(0.7);
      this.add.text(this.nodes[ex.node].x - 30, this.nodes[ex.node].y + 20,
        ex.name, { font: '10px Arial', fill: '#ffffff' });
    });

    // Definir semáforo para la calle [22, 33]
    this.trafficLights['22-33'] = this.add.circle(
      this.nodes[22].x, this.nodes[33].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    // Definir semáforo para la calle [33, 34]
    this.trafficLights['33-34'] = this.add.circle(
      this.nodes[33].x, this.nodes[34].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['24-32'] = this.add.circle(
      this.nodes[24].x, this.nodes[32].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['32-21'] = this.add.circle(
      this.nodes[32].x, this.nodes[21].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['21-31'] = this.add.circle(
      this.nodes[21].x, this.nodes[31].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['31-30'] = this.add.circle(
      this.nodes[31].x, this.nodes[30].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['30-29'] = this.add.circle(
      this.nodes[30].x, this.nodes[29].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['29-28'] = this.add.circle(
      this.nodes[29].x, this.nodes[28].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['28-10'] = this.add.circle(
      this.nodes[28].x, this.nodes[10].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);
    
    this.trafficLights['54-53'] = this.add.circle(
      this.nodes[54].x, this.nodes[53].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['53-47'] = this.add.circle(
      this.nodes[53].x, this.nodes[47].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['47-49'] = this.add.circle(
      this.nodes[47].x, this.nodes[49].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['49-48'] = this.add.circle(
      this.nodes[49].x, this.nodes[48].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['23-36'] = this.add.circle(
      this.nodes[23].x, this.nodes[36].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);
    
    this.trafficLights['36-39'] = this.add.circle(
      this.nodes[36].x, this.nodes[39].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['39-40'] = this.add.circle(
      this.nodes[39].x, this.nodes[40].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['40-38'] = this.add.circle(
      this.nodes[40].x, this.nodes[38].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['38-37'] = this.add.circle(
      this.nodes[38].x, this.nodes[37].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['37-41'] = this.add.circle(
      this.nodes[37].x, this.nodes[41].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['41-42'] = this.add.circle(
      this.nodes[41].x, this.nodes[42].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['42-18'] = this.add.circle(
      this.nodes[42].x, this.nodes[18].y, 10, 0x00ff00 // Color verde inicialmente
    ).setOrigin(0.5);

    this.trafficLights['0-23'] = this.add.circle(
      this.nodes[0].x, this.nodes[23].y, 10, 0x00ff00 // Color verde inicialmente
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
    this.setupNodes();
    this.setupEdges();
    this.initPheromones();
    this.createUI();
    this.startTimers();
  }
  update() {
    this.numCars = this.ants.length;

    this.numCarsText.setText(`Número de autos: ${this.numCars}`);

    this.updateMostUsedRoutes();

    this.updateElapsedTime();

  }
  updateMostUsedRoutes() {
    // Contar las rutas recorridas
    this.ants.forEach(ant => {
      if (ant.arrived) {
        for (let i = 0; i < ant.path.length - 1; i++) {
          const route = `${ant.path[i]}-${ant.path[i + 1]}`;
          this.mostUsedRoutes[route] = (this.mostUsedRoutes[route] || 0) + 1;
        }
      }
    });

    const sortedRoutes = Object.entries(this.mostUsedRoutes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);  // Obtener las 3 rutas más usadas

    // Crear un string con las rutas más usadas y dividir por 100
    let routesText = 'Rutas más usadas:\n';
    sortedRoutes.forEach(([route, count]) => {
      // Mostrar el valor sin decimales
      routesText += `${route}: ${Math.floor(count / 220)} veces\n`;
    });

    // Actualizar el texto de las rutas más usadas
    this.mostUsedRoutesText.setText(routesText);
  }
  updateElapsedTime() {
    // Mostrar el tiempo transcurrido en segundos
    const elapsedTime = Math.floor(this.time.now / 1000); // Convertir a segundos
    this.timeElapsedText.setText(`Tiempo transcurrido: ${elapsedTime}s`);
  }
  handleAntArrival(ant) {
    if (!ant.counted) {
      ant.counted = true;
      this.totalArrived++;  // Incrementar el número de autos que llegaron
    }
  }
  spawnAnt(colony) {
    let startNode, targetNode;
  
    // Manejar entradas/salidas aleatorias
    if (colony.start === "randomEntry") {
      startNode = getRandomNode("entry");
    } else {
      startNode = colony.start;
    }
    
    if (colony.target === "randomExit") {
      targetNode = getRandomNode("exit");
    } else {
      targetNode = colony.target;
    }

    const ant = new Ant(startNode, targetNode, this.nodes, this, colony.color);
    this.ants.push(ant);

    // Llamar a la función para actualizar las métricas cuando la hormiga llegue
    ant.on('arrived', () => this.handleAntArrival(ant));
  }

  toggleTrafficLights() {
    // Cambiar el estado del semáforo
    this.edgeStates['22-33'] = !this.edgeStates['22-33'];
    this.edgeStates['33-34'] = !this.edgeStates['33-34'];
    this.edgeStates['24-32'] = !this.edgeStates['24-32'];
    this.edgeStates['32-21'] = !this.edgeStates['32-21'];
    this.edgeStates['21-31'] = !this.edgeStates['21-31'];
    this.edgeStates['31-30'] = !this.edgeStates['31-30'];
    this.edgeStates['30-29'] = !this.edgeStates['30-29'];
    this.edgeStates['29-28'] = !this.edgeStates['29-28'];
    this.edgeStates['28-10'] = !this.edgeStates['28-10'];
    this.edgeStates['54-53'] = !this.edgeStates['54-53'];
    this.edgeStates['53-47'] = !this.edgeStates['53-47'];
    this.edgeStates['47-49'] = !this.edgeStates['47-49'];
    this.edgeStates['49-48'] = !this.edgeStates['49-48'];
    this.edgeStates['23-36'] = !this.edgeStates['23-36'];
    this.edgeStates['36-39'] = !this.edgeStates['36-39'];
    this.edgeStates['39-40'] = !this.edgeStates['39-40'];
    this.edgeStates['40-38'] = !this.edgeStates['40-38'];
    this.edgeStates['38-37'] = !this.edgeStates['38-37'];
    this.edgeStates['37-41'] = !this.edgeStates['37-41'];
    this.edgeStates['41-42'] = !this.edgeStates['41-42'];
    this.edgeStates['42-18'] = !this.edgeStates['42-18'];
    this.edgeStates['0-23'] = !this.edgeStates['0-23'];

    // Cambiar el color de los semáforos visualmente
    this.trafficLights['22-33'].setFillStyle(this.edgeStates['22-33'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['33-34'].setFillStyle(this.edgeStates['33-34'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['24-32'].setFillStyle(this.edgeStates['24-32'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['32-21'].setFillStyle(this.edgeStates['32-21'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['21-31'].setFillStyle(this.edgeStates['21-31'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['31-30'].setFillStyle(this.edgeStates['31-30'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['30-29'].setFillStyle(this.edgeStates['30-29'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['29-28'].setFillStyle(this.edgeStates['29-28'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['28-10'].setFillStyle(this.edgeStates['28-10'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['54-53'].setFillStyle(this.edgeStates['54-53'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['53-47'].setFillStyle(this.edgeStates['53-47'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['47-49'].setFillStyle(this.edgeStates['47-49'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['49-48'].setFillStyle(this.edgeStates['49-48'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['23-36'].setFillStyle(this.edgeStates['23-36'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['36-39'].setFillStyle(this.edgeStates['36-39'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['39-40'].setFillStyle(this.edgeStates['39-40'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['40-38'].setFillStyle(this.edgeStates['40-38'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['38-37'].setFillStyle(this.edgeStates['38-37'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['37-41'].setFillStyle(this.edgeStates['37-41'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['41-42'].setFillStyle(this.edgeStates['41-42'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['42-18'].setFillStyle(this.edgeStates['42-18'] ? 0x00ff00 : 0xff0000);
    this.trafficLights['0-23'].setFillStyle(this.edgeStates['0-23'] ? 0x00ff00 : 0xff0000);


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
        20, 10000 + 25 * index,
        `Colonia ${col.name}: ___`,
        { font: '14px Arial', fill: Phaser.Display.Color.IntegerToColor(col.color).rgba }
      );
    });
  }

  createUI() {
    
    this.add.rectangle(700, 30, 150, 30, 0x333333)
      .setInteractive()
      .on('pointerdown', () => this.resetSimulation());
    this.add.text(625, 25, 'Reiniciar Simulación', { font: '14px Arial', fill: '#fff' });
  }

  startTimers() {
     this.add.text(20, 20, 'Rutas sin Algoritmo', { font: '16px Arial', fill: '#fff' });   // Generador continuo de hormigas
    this.time.addEvent({
      delay: 1000 / (this.HORMIGAS_POR_MINUTO / 60), // ≈862ms entre hormigas
      callback: () => {
        if (this.hormigasGeneradasEsteMinuto < this.HORMIGAS_POR_MINUTO) {
          this.spawnNextAnt();
          this.hormigasGeneradasEsteMinuto++;
        }
      },
      callbackScope: this,
      loop: true
    });

    // Reiniciar contador cada minuto
    this.time.addEvent({
      delay: 60000, // 1 minuto
      callback: () => {
        this.hormigasGeneradasEsteMinuto = 0;
        console.log(`[Generación] Reiniciando contador (minuto ${++this.ultimoMinuto})`);
      },
      callbackScope: this,
      loop: true
    });
    this.colonies.forEach(col => {
      col.lastSpawnTime = 0; // Añade esta propiedad para rastrear el último tiempo de generación
      col.spawnEvent = this.time.addEvent({
        delay: 3000, // Intervalo de 3 segundos (3000 ms)
        callback: () => this.spawnAnt(col),
        callbackScope: this,
        repeat: this.numAntsPerColony - 1,
        startAt: 0 // Comenzar inmediatamente la primera hormiga
      });
    });

    this.time.addEvent({
      delay: CYCLE_INTERVAL,
      loop: true,
      callback: () => this.runCycle()
    });
  }

  spawnRandomColonyAnt() {
    if (this.ants.length > 150) return; // Límite máximo para evitar sobrecarga

    // Seleccionar colonia con menos hormigas activas
    const colony = this.colonies.reduce((prev, curr) => {
      const prevCount = this.ants.filter(a => a.path[0] === prev.start).length;
      const currCount = this.ants.filter(a => a.path[0] === curr.start).length;
      return currCount < prevCount ? curr : prev;
    });

    this.spawnAnt(colony);
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
    let startNode, targetNode;

    // Manejar entradas/salidas aleatorias
    if (colony.start === "randomEntry") {
      startNode = getRandomNode("entry");
    } else {
      startNode = colony.start;
    }

    if (colony.target === "randomExit") {
      targetNode = getRandomNode("exit");
    } else {
      targetNode = colony.target;
    }

    const ant = new Ant(startNode, targetNode, this.nodes, this, colony.color);
    this.ants.push(ant);

    // Actualizar contadores
    if (colony.type === "random" || colony.type === "mixed") {
      // Para colonias aleatorias, agrupar por nombre base
      const baseName = colony.name.replace(/\d+$/, '');
      if (!this.colonyStats[baseName]) {
        this.colonyStats[baseName] = { spawnCount: 0, arrivedCount: 0 };
      }
      this.colonyStats[baseName].spawnCount++;
    } else {
      colony.spawnCount++;
      colony.text.setText(`Colonia ${colony.name}: ${colony.arrivedCount}/${colony.spawnCount}`);
    }
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
    const validNeighbors = neighbors.filter(n => {
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

    if (validNeighbors.length === 0) {
      ant.retryCount++;
      if (ant.retryCount >= ant.maxRetries) {
        console.log(`Hormiga ${ant.path[0]} reiniciando ruta`);
        ant.path = [ant.path[0]]; // Reiniciar camino manteniendo origen
        ant.current = ant.path[0];
        ant.retryCount = 0;
        ant.visitedEdges.clear();
      }
      return null;
    }

    // Calcular puntuación para cada vecino considerando dirección
    const scoredNeighbors = validNeighbors.map(n => {
      const edgeKey = `${Math.min(ant.current, n)}-${Math.max(ant.current, n)}`;
      const isVisited = ant.visitedEdges.has(edgeKey);

      const toNode = this.nodes[n];
      const fromNode = this.nodes[ant.current];

      // Vector hacia el nodo vecino
      const moveVector = {
        x: toNode.x - fromNode.x,
        y: toNode.y - fromNode.y
      };
      // Normalizar
      const moveLength = Math.sqrt(moveVector.x ** 2 + moveVector.y ** 2);
      if (moveLength > 0) {
        moveVector.x /= moveLength;
        moveVector.y /= moveLength;
      }

      // Producto punto con dirección deseada
      const directionScore = Math.max(0,
        moveVector.x * ant.directionVector.x +
        moveVector.y * ant.directionVector.y
      );

      // Puntaje basado en: feromonas, distancia, dirección y visitas previas
      const pher = this.pheromones[ant.current][n];
      const heur = 1 / Phaser.Math.Distance.BetweenPoints(fromNode, toNode);
      const visitedPenalty = isVisited ? 0.3 : 1; // Penalizar aristas visitadas

      return {
        node: n,
        score: (pher ** this.alpha) *
          (heur ** this.beta) *
          (directionScore ** 1.5) * // Más peso a dirección correcta
          visitedPenalty
      };
    });

    // Seleccionar por ruleta
    const totalScore = scoredNeighbors.reduce((sum, { score }) => sum + score, 0);
    let random = Math.random() * totalScore;
    let cumulative = 0;

    for (const { node, score } of scoredNeighbors) {
      cumulative += score;
      if (random <= cumulative) {
        ant.visitedEdges.add(`${Math.min(ant.current, node)}-${Math.max(ant.current, node)}`);
        ant.updateDirectionVector();
        return node;
      }
    }

    return validNeighbors[0];
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
  spawnNextAnt() {
    // Seleccionar colonia con menos hormigas activas
    const colony = this.colonies.reduce((prev, curr) => {
      const prevCount = this.ants.filter(a => a.path[0] === prev.start).length;
      const currCount = this.ants.filter(a => a.path[0] === curr.start).length;
      return currCount < prevCount ? curr : prev;
    });

    this.spawnAnt(colony);
  }
}