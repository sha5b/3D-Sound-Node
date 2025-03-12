# 3D Sound Node Visualization System

An interactive 3D node-based visualization system built with SvelteKit, Three.js, and D3.js that allows users to create, connect, and manipulate nodes in three-dimensional space with audio feedback.

![Project Preview](docs/preview.png)

## Features

- **Interactive 3D Environment**
  - Fully navigable 3D space with intuitive camera controls
  - Responsive design that works across desktop and modern mobile browsers
  - Smooth animations and transitions between states

- **Node-Based System**
  - Create, delete, connect, and manipulate nodes in 3D space
  - Drag and reposition nodes with real-time physics simulation
  - Customize node properties (size, color, texture, sound profile)
  - Group and organize nodes into functional clusters

- **Audio Integration**
  - Nodes generate sounds based on their properties and connections
  - Spatial audio positioning based on node location in 3D space
  - Interactive sound manipulation through node interactions
  - Audio visualization effects tied to node activity

- **Performance Optimized**
  - Instanced rendering for handling large node sets
  - Spatial partitioning (octree) for efficient interaction
  - Level-of-detail system for complex scenes
  - WebGL optimizations for smooth performance

## Getting Started

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/3D-Sound-Node.git
cd 3D-Sound-Node

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# The application will be available at http://localhost:5173
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── NodeGraph.svelte      # Main 3D graph component
│   │   ├── Node3D.svelte         # Individual node component
│   │   ├── Edge3D.svelte         # Connection between nodes
│   │   ├── Controls.svelte       # Camera and interaction controls
│   │   └── UI/                   # UI components for interaction
│   ├── stores/
│   │   ├── graphStore.ts         # Svelte store for graph data
│   │   ├── selectionStore.ts     # Tracks user selection state
│   │   └── audioStore.ts         # Manages audio state and processing
│   ├── three/
│   │   ├── setup.ts              # Three.js scene initialization
│   │   ├── raycaster.ts          # Node selection handling
│   │   ├── materials.ts          # Node and edge materials
│   │   └── effects.ts            # Post-processing and visual effects
│   ├── audio/
│   │   ├── audioEngine.ts        # Core audio processing
│   │   ├── nodeSound.ts          # Node sound generation
│   │   └── spatialAudio.ts       # 3D audio positioning
│   └── d3/
│       ├── forceSimulation.ts    # 3D force-directed layout
│       └── graphUtils.ts         # Graph data structure helpers
├── routes/
│   ├── +page.svelte             # Main application page
│   ├── +layout.svelte           # App layout with global UI elements
│   └── api/                     # Backend API routes (if needed)
├── app.html                     # SvelteKit template
└── static/
    ├── assets/                  # Static assets (textures, models)
    └── sounds/                  # Audio samples and effects
```

## Technical Implementation

### Three.js Integration

The project uses Three.js for 3D rendering within a SvelteKit application:

```typescript
// Example from src/lib/three/setup.ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene(container: HTMLElement): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
} {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  container.appendChild(renderer.domElement);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(ambientLight);
  scene.add(directionalLight);
  
  // Set up camera controls
  const controls = new OrbitControls(camera, renderer.domElement);
  camera.position.z = 15;
  
  return { scene, camera, renderer, controls };
}
```

### D3.js Force Simulation in 3D

The project extends D3's force simulation to work in three dimensions:

```typescript
// Example from src/lib/d3/forceSimulation.ts
import * as d3 from 'd3';
import type { Node, Link } from '$lib/d3/forceSimulation';

export function create3DForceSimulation(nodes: Node[], links: Link[]) {
  // Extend D3's force simulation to work in 3D
  const simulation = d3.forceSimulation<Node, Link>(nodes)
    .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(5))
    .force('charge', d3.forceManyBody<Node>().strength(-30))
    .force('center', d3.forceCenter<Node>())
    .force('x', d3.forceX<Node>().strength(0.02))
    .force('y', d3.forceY<Node>().strength(0.02))
    .force('z', forceZ(0.02)); // Custom Z-axis force
    
  // Modify the tick function to update Three.js objects
  return simulation;
}

// Custom force for Z-axis in 3D space
function forceZ(strength = 0.1) {
  let nodes: Node[] = [];
  let strength_ = strength;
  let target_ = 0;
  
  function force(alpha: number) {
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      // Apply force toward target position
      node.vz = node.vz || 0;
      node.vz += alpha * strength_ * (target_ - node.z);
      node.z += node.vz * 0.9;
    }
  }
  
  force.initialize = function(_: Node[]) {
    nodes = _;
  };
  
  return force;
}
```

### Audio Integration

The project incorporates the Web Audio API for spatial sound:

```typescript
// Example from src/lib/audio/audioEngine.ts
import type { Node } from '$lib/d3/forceSimulation';

export class AudioEngine {
  audioContext: AudioContext;
  oscillators: Map<string, OscillatorNode>;
  gainNodes: Map<string, GainNode>;
  masterGain: GainNode;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.oscillators = new Map();
    this.gainNodes = new Map();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
  }
  
  createOscillator(nodeId: string, type: OscillatorType = 'sine', frequency: number = 440): void {
    // Stop and remove existing oscillator if it exists
    this.stopOscillator(nodeId);
    
    // Create new oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    // Create gain node for this oscillator
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    
    // Connect oscillator to gain node and gain node to master gain
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start oscillator
    oscillator.start();
    
    // Store references
    this.oscillators.set(nodeId, oscillator);
    this.gainNodes.set(nodeId, gainNode);
  }
  
  playNode(nodeId: string, duration: number = 0.5): void {
    const gainNode = this.gainNodes.get(nodeId);
    
    if (!gainNode) return;
    
    // Ramp up gain
    gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
    
    // Ramp down gain after duration
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
  }
}
```

## Performance Optimization

For handling large node sets efficiently:

1. **Instanced Mesh Rendering**
   - Use `THREE.InstancedMesh` for rendering many similar nodes
   - Update instance matrices instead of individual meshes

2. **Spatial Partitioning**
   - Implement octree for efficient spatial queries
   - Optimize raycasting and collision detection

3. **Level of Detail (LOD)**
   - Render distant nodes with simpler geometry
   - Reduce physics simulation complexity for distant nodes

4. **WebWorkers**
   - Offload heavy computations to background threads
   - Keep UI responsive during complex calculations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Three.js not rendering in SSR mode**
   - Solution: Use `onMount` or browser checks before initializing Three.js
   ```javascript
   import { onMount } from 'svelte';
   
   let container;
   
   onMount(() => {
     const { scene, camera, renderer } = createScene(container);
     // Rest of Three.js initialization
   });
   ```

2. **Performance issues with large graphs**
   - Solution: Enable instancing and reduce simulation complexity
   ```javascript
   // Use instanced mesh for nodes
   const geometry = new THREE.SphereGeometry(1, 16, 16);
   const material = new THREE.MeshStandardMaterial();
   const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
   ```

3. **Audio context not starting**
   - Solution: Initialize audio context on user interaction
   ```javascript
   document.addEventListener('click', () => {
     if (audioContext.state === 'suspended') {
       audioContext.resume();
     }
   }, { once: true });
   ```

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [D3.js Force Simulation](https://d3js.org/d3-force)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Threlte (Svelte Three.js library)](https://threlte.xyz/)

## License

[MIT License](LICENSE)
