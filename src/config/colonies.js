/*
export const COLONIES = [
    { name: 'Roja', start: 0, target: 18, color: 0xff0000 },
    { name: 'Azul', start: 6, target: 15, color: 0x0000ff },
    { name: 'Rosa', start: 16, target: 7, color: 0xff69b4 },
    { name: 'Naranja', start: 10, target: 1, color: 0xffa500 }
  ];
  */
 export const ENTRANCES = [
  { node: 0, name: "Av. España - Entrada Oeste", color: 0x00ff00, type: "entry" },
  { node: 18, name: "Av. América - Entrada Este", color: 0x00ff00, type: "entry" },
  { node: 10, name: "Calle San Martín - Entrada Norte", color: 0x00ff00, type: "entry" },
  { node: 7, name: "Calle Ayacucho - Entrada Sur", color: 0x00ff00, type: "entry" },
  // Puedes agregar más entradas según las vías principales de Trujillo
];

export const EXITS = [
  { node: 0, name: "Av. España - Salida Oeste", color: 0xff0000, type: "exit" },
  { node: 18, name: "Av. América - Salida Este", color: 0xff0000, type: "exit" },
  { node: 10, name: "Calle San Martín - Salida Norte", color: 0xff0000, type: "exit" },
  { node: 7, name: "Calle Ayacucho - Salida Sur", color: 0xff0000, type: "exit" },
  // Puedes agregar más salidas según las vías principales de Trujillo
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
  }
];

// Función para obtener nodos aleatorios de entrada/salida
export function getRandomNode(type) {
  const nodes = type === "entry" 
    ? ENTRANCES.map(e => e.node) 
    : EXITS.map(e => e.node);
  return nodes[Math.floor(Math.random() * nodes.length)];
}