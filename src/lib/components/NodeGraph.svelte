<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { createScene, createRaycaster } from '$lib/three/setup.js';
  import { create3DForceSimulation, addNodeToSimulation, addLinkToSimulation } from '$lib/d3/forceSimulation.js';
  import { AudioEngine } from '$lib/audio/audioEngine.js';
  import { graphStore } from '$lib/stores/graphStore.js';
  import { selectionStore } from '$lib/stores/selectionStore.js';
  import { audioStore } from '$lib/stores/audioStore.js';
  import Controls from './Controls.svelte';

  let container;
  let scene, camera, renderer, controls;
  let simulation;
  let audioEngine;
  let animationId;
  let raycaster, mouse;
  let nodes = [];
  let links = [];
  let nodeMeshes = [];
  let linkLines = [];

  // Subscribe to graph store
  const unsubscribeGraph = graphStore.subscribe(graph => {
    nodes = graph.nodes;
    links = graph.links;
    
    // If scene is initialized, update 3D objects
    if (scene) {
      updateNodeMeshes();
      updateLinkLines();
    }
  });

  // Create a node mesh with fresnel effect
  function createNodeMesh(node) {
    const size = node.size || 0.5;
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    
    // Create a transparent material with fresnel effect
    const material = new THREE.MeshPhysicalMaterial({
      color: node.color || 0x4287f5,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.95, // Make it transparent
      thickness: 0.5,     // Refraction thickness
      envMapIntensity: 1.0,
      clearcoat: 1.0,     // Add clearcoat layer
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.7
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    mesh.userData.nodeId = node.id;
    mesh.userData.nodeName = node.name || node.id;
    
    // Add a glow effect
    const glowGeometry = new THREE.SphereGeometry(size * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.color || 0x4287f5,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);
    
    scene.add(mesh);
    return mesh;
  }
  
  // Create a link line
  function createLinkLine(link) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xaaaaaa,
      opacity: 0.7,
      transparent: true
    });
    
    // Set positions (will be updated in updateLinkLine)
    const positions = new Float32Array(6); // 2 points * 3 coordinates
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    
    return line;
  }
  
  // Update node meshes based on current nodes
  function updateNodeMeshes() {
    // Remove old meshes
    for (const mesh of nodeMeshes) {
      scene.remove(mesh);
    }
    
    // Create new meshes
    nodeMeshes = nodes.map(node => createNodeMesh(node));
  }
  
  // Update link lines based on current links
  function updateLinkLines() {
    // Remove old lines
    for (const line of linkLines) {
      scene.remove(line);
    }
    
    // Create new lines
    linkLines = links.map(link => createLinkLine(link));
  }
  
  // Update link line positions
  function updateLinkPositions() {
    links.forEach((link, i) => {
      const line = linkLines[i];
      if (!line) return;
      
      const sourceNode = nodes.find(n => n.id === link.source.id || n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target.id || n.id === link.target);
      
      if (!sourceNode || !targetNode) return;
      
      const positions = line.geometry.attributes.position.array;
      
      // Source point
      positions[0] = sourceNode.x || 0;
      positions[1] = sourceNode.y || 0;
      positions[2] = sourceNode.z || 0;
      
      // Target point
      positions[3] = targetNode.x || 0;
      positions[4] = targetNode.y || 0;
      positions[5] = targetNode.z || 0;
      
      line.geometry.attributes.position.needsUpdate = true;
    });
  }

  onMount(() => {
    // Initialize Three.js scene
    ({ scene, camera, renderer, controls } = createScene(container));
    
    // Initialize raycaster for node selection
    raycaster = createRaycaster(camera);
    mouse = new THREE.Vector2();
    
    // Initialize D3 force simulation
    simulation = create3DForceSimulation(nodes, links);
    
    // Initialize audio engine
    audioEngine = new AudioEngine();
    audioEngine.initialize();
    audioStore.set(audioEngine);
    
    // Add event listener for audio context initialization
    document.addEventListener('click', () => {
      if (audioEngine.audioContext && audioEngine.audioContext.state === 'suspended') {
        audioEngine.audioContext.resume();
      }
    }, { once: true });
    
    // Create initial node meshes and link lines
    updateNodeMeshes();
    updateLinkLines();
    
    // Add mouse event listeners
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);
    
    // Start animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Only update link positions (nodes stay fixed)
      if (links.length > 0 && linkLines.length > 0) {
        updateLinkPositions();
      }
      
      // Update controls
      controls.update();
      
      // Render scene
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
    };
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    if (renderer) {
      renderer.dispose();
    }
    
    if (audioEngine) {
      audioEngine.dispose();
    }
    
    unsubscribeGraph();
  });
  
  // Handle mouse move for hover effects
  function handleMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
  }
  
  // Move camera to focus on a node
  function focusOnNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Get current camera position
    const startPos = new THREE.Vector3().copy(camera.position);
    
    // Calculate target position (slightly offset from node)
    const targetPos = new THREE.Vector3(
      node.x + 3,
      node.y + 2,
      node.z + 3
    );
    
    // Animate camera movement
    const duration = 1000; // ms
    const startTime = Date.now();
    
    function animateCamera() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease function (cubic)
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      // Interpolate position
      camera.position.lerpVectors(startPos, targetPos, ease);
      
      // Look at the node
      camera.lookAt(node.x, node.y, node.z);
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        // Set controls target to node position for orbiting around it
        controls.target.set(node.x, node.y, node.z);
      }
    }
    
    animateCamera();
  }
  
  // Handle click for node selection
  function handleClick(event) {
    // Update raycaster with mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with node meshes
    const intersects = raycaster.intersectObjects(nodeMeshes);
    
    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      const nodeId = selectedMesh.userData.nodeId;
      
      // Toggle selection
      const isSelected = selectionStore.toggle(nodeId);
      
      // If node is selected, focus camera on it
      if (isSelected) {
        focusOnNode(nodeId);
      }
      
      // Show node info
      const nodeName = selectedMesh.userData.nodeName;
      console.log(`Selected node: ${nodeName}`);
    } else {
      // Clear selection if clicking on empty space
      selectionStore.clear();
    }
  }

  // Function to add a new node
  function addNode() {
    // Generate random position away from center
    const distance = 5 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.sin(phi) * Math.sin(theta);
    const z = distance * Math.cos(phi);
    
    const newNode = {
      id: `node-${nodes.length}`,
      x: x,
      y: y,
      z: z,
      soundType: ['sine', 'square', 'sawtooth', 'triangle'][Math.floor(Math.random() * 4)],
      frequency: 220 + Math.random() * 440,
      size: 0.3 + Math.random() * 0.3,
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5).getHex(),
      name: `Audio Node ${nodes.length}`
    };
    
    // Add node to graph store
    graphStore.update(graph => {
      const updatedNodes = [...graph.nodes, newNode];
      
      // Connect to central node
      const updatedLinks = [
        ...graph.links, 
        { source: 'central-node', target: newNode.id }
      ];
      
      return {
        nodes: updatedNodes,
        links: updatedLinks
      };
    });
  }
</script>

<div class="node-graph" bind:this={container}>
  <!-- Three.js will render here -->
</div>

<div class="controls">
  <Controls {addNode} />
</div>

<div class="info">
  <p>3D Sound Node Visualization</p>
  <p>Click to select nodes | Add nodes with the button</p>
</div>

<style>
  .node-graph {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .controls {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 10;
  }
  
  .info {
    position: absolute;
    top: 20px;
    left: 20px;
    color: white;
    font-family: Arial, sans-serif;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 5px;
    z-index: 10;
  }
  
  .info p {
    margin: 5px 0;
    font-size: 14px;
  }
</style>
