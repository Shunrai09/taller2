export const JITTER = 1;
export const SPEED_RANGE = [0.3, 1];
export const DURATION_FACTOR = 25;
export const SPAWN_INTERVAL = 1500;
export const CYCLE_INTERVAL = 150;
export const TRAFFIC_INTERVAL = 10;
export const MIN_ANTS_PER_MINUTE = 140;
export const MAX_ANTS_PER_MINUTE = 200;
export const SPAWN_RANDOMNESS = 0.2; // Variabilidad del 20%

// ≈706ms por hormiga
export const ACO_PARAMS = {
  alpha: 1.0,
  beta: 2,
    gamma: 1.2,  // Nuevo parámetro para peso del factor de congestión
  evaporationRate: 0.97,
  numAntsPerColony: 20, // Menos vehículos para mejor flujo
  maxDetourRatio: 1.5   // Máximo desvío permitido (150% del camino directo)
};
export const ANT_STOP_DISTANCE = 10; 

export const TRAFFIC_PARAMS = {
  LANE_CAPACITY: 3,       // Máximo de hormigas por "carril"
  TRAFFIC_LIGHT_DELAY: 5, // Segundos entre cambios de semáforo
  CONGESTION_THRESHOLD: 5 // Número de hormigas para considerar congestión
};
export const FLOW_MODES = {
  FIXED: "fixed",      // Solo colonias predefinidas
  RANDOM: "random",    // Solo colonias aleatorias
  MIXED: "mixed"       // Mezcla de ambas
};

export const SIMULATION_MODE = FLOW_MODES.MIXED;

