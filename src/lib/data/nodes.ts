export interface Node {
  id: string;
  type: 'central' | 'audio';
  position: { x: number; y: number; z: number };
  connections: string[];
  audioFile?: string;
  color?: string;
}

// Dummy data for the nodes
export const nodes: Node[] = [
  {
    id: 'central',
    type: 'central',
    position: { x: 0, y: 0, z: 0 },
    connections: ['node1', 'node2', 'node3'],
    color: '#ffffff'
  },
  {
    id: 'node1',
    type: 'audio',
    position: { x: 5, y: 2, z: 5 },
    connections: ['central'],
    audioFile: 'sounds/Alesis-Fusion-Bass-C3.wav',
    color: '#00ff7f'
  },
  {
    id: 'node2',
    type: 'audio',
    position: { x: -5, y: -1, z: 5 },
    connections: ['central'],
    audioFile: 'sounds/Bamboo.wav',
    color: '#7fff00'
  },
  {
    id: 'node3',
    type: 'audio',
    position: { x: 0, y: 1, z: -7 },
    connections: ['central'],
    audioFile: 'sounds/Casio-MT-45-Bass-I-C2.wav',
    color: '#00ffff'
  }
];

// Function to get a node by ID
export function getNodeById(id: string): Node | undefined {
  return nodes.find(node => node.id === id);
}

// Function to get connected nodes
export function getConnectedNodes(nodeId: string): Node[] {
  const node = getNodeById(nodeId);
  if (!node) return [];
  
  return node.connections
    .map(id => getNodeById(id))
    .filter((node): node is Node => node !== undefined);
}
