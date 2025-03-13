<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { nodes, getNodeById, type Node } from '$lib/data/nodes';
  import { audioService } from '$lib/services/audioService';

  // Props
  export let width: number = 0;
  export let height: number = 0;

  // Three.js objects
  let container: HTMLElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let nodeObjects: Map<string, THREE.Object3D> = new Map();
  let nodeVisualizers: Map<string, THREE.Mesh> = new Map();
  let nodeConnections: THREE.Line[] = [];
  let raycaster: THREE.Raycaster;
  let mouse: THREE.Vector2;
  
  // Audio visualization
  let activeNodeId: string | null = null;
  let spectrogramMesh: THREE.Mesh | null = null;
  
  // Spectrogram parameters
  const frequencySamples = 256;
  const timeSamples = 400;
  const data = new Uint8Array(frequencySamples);
  const nVertices = (frequencySamples + 1) * (timeSamples + 1);
  let heights = new Uint8Array(nVertices);
  
  // Dimensions - smaller size for node-based visualization
  let xSegments = timeSamples;
  let ySegments = frequencySamples;
  let xSize = 10; // Reduced from 40
  let ySize = 5;  // Reduced from 20
  let xHalfSize = xSize / 2;
  let yHalfSize = ySize / 2;
  
  // Grid parameters
  let gridHelper: THREE.GridHelper | null = null;
  
  // Animation
  let animationFrameId: number;
  let isInitialized = false;
  
  // Vertex shader
  const vertexShader = `
    attribute float displacement;
    varying vec3 vColor;
    uniform vec3 vLut[256];
    
    void main() {
      // Get the displacement value (0-255)
      float d = displacement;
      
      // Set color from lookup table
      vColor = vLut[int(d)];
      
      // Calculate new position with displacement
      vec3 newPosition = position;
      newPosition.z = d / 10.0;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;
  
  // Fragment shader
  const fragmentShader = `
    varying vec3 vColor;
    
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

  // Generate color lookup table for shader
  function generateColorLUT() {
    // Create a color gradient from blue to red
    const colors = [];
    for (let i = 0; i < 256; i++) {
      const color = new THREE.Color();
      // Use HSL for easier color control
      // Hue: 0.6 (blue) to 0 (red)
      // Saturation: 1.0 (full)
      // Lightness: 0.5 (medium)
      color.setHSL(0.6 - (i / 255) * 0.6, 1.0, 0.5);
      colors.push(color);
    }
    // First color is transparent (black)
    colors[0] = new THREE.Color(0, 0, 0);
    
    return colors.map(color => new THREE.Vector3(color.r, color.g, color.b));
  }
  
  // Create 3D grid for scale reference
  function createGrid(size: number, divisions: number, position: THREE.Vector3) {
    // Remove existing grid if any
    if (gridHelper) {
      scene.remove(gridHelper);
    }
    
    // Create new grid
    gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
    gridHelper.position.copy(position);
    
    // Add to scene
    scene.add(gridHelper);
    
    return gridHelper;
  }

  // Create 3D spectrogram mesh
  function createSpectrogram() {
    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();
    
    // Generate vertices
    let indices = [];
    let vertices = [];
    
    // Generate vertices for grid geometry
    for (let i = 0; i <= xSegments; i++) {
      const x = (i * (xSize / xSegments)) - xHalfSize;
      for (let j = 0; j <= ySegments; j++) {
        // Use logarithmic scale for frequency (y-axis)
        const yPowMax = Math.log(ySize);
        const yBase = Math.E;
        const pow = (ySegments - j) / ySegments * yPowMax;
        const y = -Math.pow(yBase, pow) + yHalfSize + 1;
        
        vertices.push(x, y, 0);
      }
    }
    
    // Generate indices for faces
    for (let i = 0; i < xSegments; i++) {
      for (let j = 0; j < ySegments; j++) {
        const a = i * (ySegments + 1) + (j + 1);
        const b = i * (ySegments + 1) + j;
        const c = (i + 1) * (ySegments + 1) + j;
        const d = (i + 1) * (ySegments + 1) + (j + 1);
        
        // Generate two triangles per grid cell
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('displacement', new THREE.Uint8BufferAttribute(heights, 1));
    
    // Create shader material with color lookup table
    const uniforms = {
      vLut: { value: generateColorLUT() }
    };
    
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.DoubleSide
    });
    
    // Create mesh
    spectrogramMesh = new THREE.Mesh(geometry, material);
    
    // Set rotation to -45 degrees around X axis (to match the reference image)
    spectrogramMesh.rotation.x = -Math.PI / 4; // -45 degrees
    
    // Adjust the height to be lower
    spectrogramMesh.position.y = -2;
    
    // Initially hide the spectrogram until a node is clicked
    spectrogramMesh.visible = false;
    
    // Add to scene
    scene.add(spectrogramMesh);
  }

  // Initialize the scene
  function init() {
    if (isInitialized) return;
    
    // Set dimensions
    width = window.innerWidth;
    height = window.innerHeight;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(20, width / height, 1, 1000);
    camera.position.set(0, 0, 75);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI / 2;
    
    // Setup raycaster for interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create a global 3D grid that's always visible
    createGrid(20, 20, new THREE.Vector3(0, 0, 0));
    
    // Create 3D spectrogram
    createSpectrogram();
    
    // Create nodes
    createNodes();
    createConnections();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Add click event listener
    renderer.domElement.addEventListener('click', onMouseClick);
    
    isInitialized = true;
  }

  // Create 3D objects for nodes
  function createNodes() {
    nodes.forEach(node => {
      // Create invisible sphere for clicking
      const geometry = new THREE.SphereGeometry(node.type === 'central' ? 1.5 : 1, 32, 32);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.userData = { nodeId: node.id, type: node.type };
      
      scene.add(mesh);
      nodeObjects.set(node.id, mesh);
      
      // Create visualizer for audio nodes
      if (node.type === 'audio') {
        createNodeVisualizer(node);
      }
    });
  }
  
  // Create visualizer for a node
  function createNodeVisualizer(node: Node) {
    // Create a small sphere to indicate the node position
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: node.color || 0x00ff00,
      emissive: node.color || 0x00ff00,
      emissiveIntensity: 0.5,
      shininess: 30
    });
    
    // Create mesh
    const visualizer = new THREE.Mesh(geometry, material);
    
    // Position at the node
    visualizer.position.copy(new THREE.Vector3(
      node.position.x,
      node.position.y,
      node.position.z
    ));
    
    // Add to scene
    scene.add(visualizer);
    nodeVisualizers.set(node.id, visualizer);
  }

  // Create connections between nodes
  function createConnections() {
    // Clear existing connections
    nodeConnections.forEach(line => scene.remove(line));
    nodeConnections = [];
    
    // Create new connections
    nodes.forEach(node => {
      const sourceObject = nodeObjects.get(node.id);
      
      if (sourceObject) {
        node.connections.forEach(targetId => {
          const targetObject = nodeObjects.get(targetId);
          
          if (targetObject) {
            const points = [
              sourceObject.position.clone(),
              targetObject.position.clone()
            ];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
              color: 0x4444ff,
              opacity: 0.7,
              transparent: true
            });
            
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            nodeConnections.push(line);
          }
        });
      }
    });
  }

  // Update the audio visualization
  function updateVisualization() {
    // Get frequency data from audio service
    const frequencyData = audioService.getFrequencyData();
    if (!frequencyData) return;
    
    // Update 3D spectrogram if it exists
    if (spectrogramMesh && spectrogramMesh.visible) {
      // Shift existing data to make room for new data
      // This creates the moving history effect
      const startVal = frequencySamples + 1;
      const endVal = nVertices - startVal;
      
      // Copy existing data, shifting it to the left
      heights.copyWithin(0, startVal, nVertices + 1);
      
      // Add new frequency data at the end
      heights.set(frequencyData, endVal - startVal);
      
      // Update the displacement attribute
      if (spectrogramMesh.geometry.attributes.displacement) {
        spectrogramMesh.geometry.setAttribute('displacement', 
          new THREE.Uint8BufferAttribute(heights, 1));
      }
      
      // Update active node visualizer color based on audio intensity
      if (activeNodeId) {
        const visualizer = nodeVisualizers.get(activeNodeId);
        if (visualizer) {
          // Calculate average intensity
          const maxIntensity = Math.max(...Array.from(frequencyData));
          const normalizedIntensity = maxIntensity / 255;
          
          // Create a color gradient from blue to red based on intensity
          const color = new THREE.Color();
          color.setHSL(0.6 - normalizedIntensity * 0.6, 1.0, 0.5);
          
          // Update material color and emissive
          (visualizer.material as THREE.MeshPhongMaterial).color = color;
          (visualizer.material as THREE.MeshPhongMaterial).emissive = color;
          
          // Pulse the size based on intensity
          const scale = 0.5 + normalizedIntensity * 0.5;
          visualizer.scale.set(scale, scale, scale);
        }
      }
    }
  }

  // Handle mouse click
  function onMouseClick(event: MouseEvent) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections with nodes
    const intersects = raycaster.intersectObjects(
      Array.from(nodeObjects.values())
    );
    
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const nodeId = clickedObject.userData.nodeId;
      const node = getNodeById(nodeId);
      
      if (node) {
        // Move camera to the clicked node
        moveToNode(node);
        
        // Play audio if it's an audio node
        if (node.type === 'audio' && node.audioFile) {
          playNodeAudio(node);
        }
      }
    }
  }

  // Move camera to a node
  function moveToNode(node: Node) {
    const nodeObject = nodeObjects.get(node.id);
    if (!nodeObject) return;
    
    // Calculate target position (offset to see the spectrogram)
    const targetPosition = nodeObject.position.clone().add(
      new THREE.Vector3(0, 3, 6)
    );
    
    // Animate camera movement
    const startPosition = camera.position.clone();
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    function animateCamera() {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease function (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      camera.position.lerpVectors(
        startPosition,
        targetPosition,
        easeProgress
      );
      
      // Look at the node
      if (nodeObject) {
        camera.lookAt(nodeObject.position);
      }
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        // Update controls target
        if (nodeObject) {
          controls.target.copy(nodeObject.position);
        }
      }
    }
    
    // Start animation
    animateCamera();
  }

  // Play audio from a node
  function playNodeAudio(node: Node) {
    if (!node.audioFile) return;
    
    // Reset previous active node
    if (activeNodeId) {
      const prevVisualizer = nodeVisualizers.get(activeNodeId);
      if (prevVisualizer) {
        // Reset visualizer scale
        prevVisualizer.scale.set(1, 1, 1);
        
        // Reset color
        const prevNode = getNodeById(activeNodeId);
        if (prevNode) {
          (prevVisualizer.material as THREE.MeshPhongMaterial).color.set(prevNode.color || 0x00ff00);
          (prevVisualizer.material as THREE.MeshPhongMaterial).emissive.set(prevNode.color || 0x00ff00);
        }
      }
      
      // Hide the previous node's visualizer
      if (spectrogramMesh) {
        spectrogramMesh.visible = false;
      }
    }
    
    // Set active node
    activeNodeId = node.id;
    
    // Get node position
    const nodeObject = nodeObjects.get(node.id);
    if (!nodeObject) return;
    
    const nodePosition = nodeObject.position.clone();
    
    // Reset 3D spectrogram data
    if (spectrogramMesh) {
      // Clear the heights array
      heights.fill(0);
      
      // Update the displacement attribute
      if (spectrogramMesh.geometry.attributes.displacement) {
        spectrogramMesh.geometry.setAttribute('displacement', 
          new THREE.Uint8BufferAttribute(heights, 1));
      }
      
      // Position the spectrogram at the node
      spectrogramMesh.position.copy(nodePosition);
      
      // Make the spectrogram visible
      spectrogramMesh.visible = true;
    }
    
    // Update the grid position to match the node
    if (gridHelper) {
      gridHelper.position.copy(nodePosition);
    }
    
    // Play the audio
    audioService.playAudio(node.audioFile);
    
    // Move camera to view the 3D spectrogram
    if (spectrogramMesh) {
      // Calculate camera position to view the spectrogram
      const targetPosition = nodePosition.clone().add(
        new THREE.Vector3(0, 5, 15)
      );
      
      // Animate camera movement
      const startPosition = camera.position.clone();
      const startTime = Date.now();
      const duration = 1000; // 1 second
      
      function animateCamera() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function (ease-out cubic)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position
        camera.position.lerpVectors(
          startPosition,
          targetPosition,
          easeProgress
        );
        
        // Look at the node
        camera.lookAt(nodePosition);
        
        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          // Update controls target
          controls.target.copy(nodePosition);
        }
      }
      
      // Start animation
      animateCamera();
    }
    
    console.log("Playing audio:", node.audioFile);
    console.log("Active node:", activeNodeId);
  }

  // Animation loop
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
    if (controls) {
      controls.update();
    }
    
    // Update audio visualization
    updateVisualization();
    
    // Render scene
    renderer.render(scene, camera);
  }

  // Handle window resize
  function onWindowResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  }

  // Lifecycle hooks
  onMount(() => {
    init();
    animate();
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onWindowResize);
    }
    
    if (renderer?.domElement) {
      renderer.domElement.removeEventListener('click', onMouseClick);
    }
    
    // Stop any playing audio
    audioService.stopAudio();
  });
</script>

<div class="three-container" bind:this={container}></div>

<style>
  .three-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
