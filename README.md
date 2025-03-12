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
│   │   ├── graphStore.js         # Svelte store for graph data
│   │   ├── selectionStore.js     # Tracks user selection state
│   │   └── audioStore.js         # Manages audio state and processing
│   ├── three/
│   │   ├── setup.js              # Three.js scene initialization
│   │   ├── raycaster.js          # Node selection handling
│   │   ├── materials.js          # Node and edge materials
│   │   └── effects.js            # Post-processing and visual effects
│   ├── audio/
│   │   ├── audioEngine.js        # Core audio processing
│   │   ├── nodeSound.js          # Node sound generation
│   │   └── spatialAudio.js       # 3D audio positioning
│   └── d3/
│       ├── forceSimulation.js    # 3D force-directed layout
│       └── graphUtils.js         # Graph data structure helpers
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

```javascript
// Example from src/lib/three/setup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function createScene(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
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

```javascript
// Example from src/lib/d3/forceSimulation.js
import * as d3 from 'd3';

export function create3DForceSimulation(nodes, links) {
  // Extend D3's force simulation to work in 3D
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(5))
    .force('charge', d3.forceManyBody().strength(-30))
    .force('center', d3.forceCenter())
    .force('x', d3.forceX().strength(0.02))
    .force('y', d3.forceY().strength(0.02))
    .force('z', d3.forceZ().strength(0.02)); // Custom Z-axis force
    
  // Modify the tick function to update Three.js objects
  return simulation;
}
```

### Audio Integration

The project incorporates the Web Audio API for spatial sound:

```javascript
// Example from src/lib/audio/audioEngine.js
export class AudioEngine {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    
    // Create spatial audio listener
    this.listener = this.audioContext.listener;
  }
  
  createNodeSound(node) {
    // Create oscillator or other sound source based on node properties
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createPanner();
    
    // Configure sound based on node properties
    oscillator.type = node.soundType || 'sine';
    oscillator.frequency.value = node.frequency || 440;
    
    // Set up spatial positioning
    panner.setPosition(node.x, node.y, node.z);
    
    // Connect audio nodes
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);
    
    return { oscillator, gain, panner };
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
