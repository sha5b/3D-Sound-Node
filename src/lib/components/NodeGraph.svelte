<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { create3DForceSimulation } from '$lib/d3/forceSimulation';
  import type { Node, Link } from '$lib/d3/forceSimulation';
  import { AudioEngine } from '$lib/audio/audioEngine';
  import { graphStore } from '$lib/stores/graphStore';
  import { selectionStore } from '$lib/stores/selectionStore';
  import { audioStore } from '$lib/stores/audioStore';
  import { createRaycaster } from '$lib/three/setup';
  import Controls from './Controls.svelte';
  import Camera3D from './Camera3D.svelte';
  import Node3D from './Node3D.svelte';
  import Edge3D from './Edge3D.svelte';

  let container: HTMLElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: any; // OrbitControls type
  let cameraComponent: Camera3D;
  let simulation: any; // d3.Simulation type
  let audioEngine: AudioEngine;
  let animationId: number;
  let raycaster: THREE.Raycaster;
  let mouse: THREE.Vector2;
  let nodes: Node[] = [];
  let links: Link[] = [];
  let sceneInitialized = false;

  // Lines for connections
  let edgeLines: THREE.Line[] = [];

  // Subscribe to graph store
  const unsubscribeGraph = graphStore.subscribe(graph => {
    nodes = graph.nodes;
    links = graph.links;
    
    // Update edges if scene is initialized
    if (sceneInitialized && scene) {
      updateEdges();
    }
  });
  
  // Create and update edges
  function updateEdges() {
    // Remove old lines
    for (const line of edgeLines) {
      scene.remove(line);
    }
    edgeLines = [];
    
    // Create new lines for each link
    links.forEach(link => {
      // Find source and target nodes
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);
      
      if (!sourceNode || !targetNode) return;
      
      // Get node meshes from scene to ensure we're using the actual positions
      const sourceNodeMesh = scene.children.find(
        child => child.userData && child.userData['nodeId'] === sourceId
      ) as THREE.Mesh;
      
      const targetNodeMesh = scene.children.find(
        child => child.userData && child.userData['nodeId'] === targetId
      ) as THREE.Mesh;
      
      // Use mesh positions if available, otherwise fall back to node data
      const sourcePos = sourceNodeMesh ? sourceNodeMesh.position : 
        new THREE.Vector3(sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0);
      
      const targetPos = targetNodeMesh ? targetNodeMesh.position : 
        new THREE.Vector3(targetNode.x || 0, targetNode.y || 0, targetNode.z || 0);
      
      // Create line geometry
      const points = [
        sourcePos.clone(),
        targetPos.clone()
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Create line material
      const material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        opacity: 0.7,
        transparent: true
      });
      
      // Create the line and add to scene
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      edgeLines.push(line);
    });
  }

  onMount(() => {
    initScene();
    initAudio();
    
    // Add mouse event listeners
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);
    
    // Start animation loop
    animate();
    
    return () => {
      cleanup();
    };
  });

  function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Add renderer to DOM
    container.appendChild(renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Initialize D3 force simulation
    simulation = create3DForceSimulation(nodes, links);
    
    sceneInitialized = true;
    
    // Delay initial edge creation to ensure nodes are positioned
    setTimeout(() => {
      if (scene) {
        updateEdges();
      }
    }, 500);
  }
  
  function initAudio() {
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
  }
  
  // Frame counter for less frequent updates
  let frameCount = 0;
  
  // Flag to track if simulation is running
  let isSimulationRunning = true;
  
  function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Update controls if available
    if (controls) {
      controls.update();
    }
    
    // Run simulation for a few steps to stabilize node positions
    if (simulation && isSimulationRunning) {
      // Run simulation for fewer ticks (1 instead of 3)
      simulation.tick();
      
      // Update node meshes with new positions from simulation
      scene.children.forEach(child => {
        if (child.userData && child.userData['nodeId']) {
          const nodeId = child.userData['nodeId'];
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            child.position.set(node.x || 0, node.y || 0, node.z || 0);
          }
        }
      });
      
      // Stop simulation sooner (after 50 frames instead of 100)
      if (frameCount > 50) {
        isSimulationRunning = false;
        console.log('Simulation stabilized');
      }
    }
    
    // Update edges less frequently to improve performance
    // Only update every 5 frames
    frameCount++;
    if (scene && frameCount % 5 === 0) {
      updateEdges();
    }
    
    // Render scene
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  
  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    if (renderer) {
      renderer.dispose();
    }
    
    if (audioEngine) {
      audioEngine.dispose();
    }
    
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('click', handleClick);
    
    unsubscribeGraph();
  }
  
  // Handle camera ready event
  function handleCameraReady(event) {
    camera = event.detail.camera;
    controls = event.detail.controls;
    
    // Initialize raycaster for node selection
    raycaster = createRaycaster(camera);
    mouse = new THREE.Vector2();
  }
  
  // Handle mouse move for hover effects
  function handleMouseMove(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
  }
  
  // Handle click for node selection
  function handleClick(_event: MouseEvent): void {
    if (!raycaster || !camera || !scene) return;
    
    // Update raycaster with mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Get all node meshes from the scene
    const nodeMeshes = scene.children.filter(
      child => child.userData && child.userData['nodeId']
    );
    
    // Check for intersections with node meshes
    const intersects = raycaster.intersectObjects(nodeMeshes);
    
    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object as THREE.Mesh;
      const nodeId = selectedMesh.userData['nodeId'] as string;
      
      // Toggle selection
      const isSelected = selectionStore.toggle(nodeId);
      
      // If node is selected, focus camera on it
      if (isSelected && cameraComponent) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          const nodePos = new THREE.Vector3(
            node.x || 0, 
            node.y || 0, 
            node.z || 0
          );
          cameraComponent.focusOnNode(nodePos);
        }
      }
    } else {
      // Clear selection if clicking on empty space
      selectionStore.clear();
    }
  }
  
  // Handle window resize
  function handleResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Listen for window resize
  $: if (camera && renderer) {
    window.addEventListener('resize', handleResize);
  }
</script>

<div class="node-graph" bind:this={container}>
  {#if sceneInitialized}
    <Camera3D 
      {scene} 
      {container} 
      on:ready={handleCameraReady}
      bind:this={cameraComponent}
    />
    
    {#each nodes as node (node.id)}
      <Node3D {node} {scene} />
    {/each}
  {/if}
</div>

<div class="controls">
  <Controls />
</div>

<div class="info">
  <p>3D Sound Node Visualization</p>
  <p>Click to select nodes</p>
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
