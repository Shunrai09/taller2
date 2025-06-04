export const JITTER = 1;
export const SPEED_RANGE = [0.3, 1];
export const DURATION_FACTOR = 25;
export const SPAWN_INTERVAL = 1500;
export const CYCLE_INTERVAL = 150;
export const TRAFFIC_INTERVAL = 10;
export const ACO_PARAMS = {
  alpha: 0.5,
  beta: 2,
  gamma: 1.5,  // Nuevo parámetro para peso del factor de congestión
  evaporationRate: 0.95,
  numAntsPerColony: 30,
};
export const ANT_STOP_DISTANCE = 10; 

export const TRAFFIC_PARAMS = {
  LANE_CAPACITY: 3,       // Máximo de hormigas por "carril"
  TRAFFIC_LIGHT_DELAY: 5, // Segundos entre cambios de semáforo
  CONGESTION_THRESHOLD: 5 // Número de hormigas para considerar congestión
};

