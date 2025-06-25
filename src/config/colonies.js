
export const ENTRANCES = [
  { node: 0, name: "Av. España - Entrada Oeste", color: 0x00ff00, type: "entry" },
  { node: 18, name: "Av. América - Entrada Este", color: 0x00ff00, type: "entry" },
  { node: 10, name: "Calle San Martín - Entrada Norte", color: 0x00ff00, type: "entry" },
  { node: 7, name: "Calle Ayacucho - Entrada Sur", color: 0x00ff00, type: "entry" },
  { node: 5, name: "Entrada 5", color: 0x00ff00, type: "entry" },  // Nueva entrada
  { node: 3, name: "Entrada 3", color: 0x0000ff, type: "entry" },  // Nueva entrada
  { node: 1, name: "Entrada 1", color: 0xff0000, type: "entry" },  // Nueva entrada
  { node: 13, name: "Entrada 13", color: 0xffff00, type: "entry" },  // Nueva entrada
  { node: 15, name: "Entrada 15", color: 0x00ffff, type: "entry" },  // Nueva entrada
];

export const EXITS = [
  { node: 0, name: "Av. España - Salida Oeste", color: 0xff0000, type: "exit" },
  { node: 18, name: "Av. América - Salida Este", color: 0xff0000, type: "exit" },
  { node: 10, name: "Calle San Martín - Salida Norte", color: 0xff0000, type: "exit" },
  { node: 7, name: "Calle Ayacucho - Salida Sur", color: 0xff0000, type: "exit" },
  { node: 4, name: "Salida 4", color: 0xff0000, type: "exit" },  // Nueva salida
  { node: 2, name: "Salida 2", color: 0x0000ff, type: "exit" },  // Nueva salida
  { node: 14, name: "Salida 14", color: 0xff00ff, type: "exit" },  // Nueva salida
  { node: 16, name: "Salida 16", color: 0xffff00, type: "exit" },  // Nueva salida
];

export const COLONIES = [
  // Colonias predefinidas (rutas específicas)
  { name: 'Roja', start: 0, target: "randomExit", color: 0xff0000, type: "random" },
  { name: 'Azul', start: 18, target: "randomExit", color: 0x0000ff, type: "random" },
  
  // Colonias con entradas/salidas aleatorias
  { 
    name: 'verde', 
    start: 10, 
    target: "randomExit", 
    color: 0x00ff00,
    type: "random" 
  },
  { 
    name: 'Amarillo', 
    start: 7, 
    target: "randomExit",  // Salida fija pero entrada aleatoria
    color: 0xffff00,
    type: "random" 
  },
  {
    name: 'blanco', 
    start: 18, 
    target: "randomExit", 
    color: 0xffffff,
    type: "random" 
  },
  { 
    name: 'Amarillo', 
    start: 2, 
    target: "randomExit",  // Salida fija pero entrada aleatoria
    color: 0xfffff0,
    type: "random" 
  }
];

// Función para obtener nodos aleatorios de entrada/salida
export function getRandomNode(type) {
  const nodes = type === "entry" 
    ? ENTRANCES.map(e => e.node) 
    : EXITS.map(e => e.node);
  return nodes[Math.floor(Math.random() * nodes.length)];
}