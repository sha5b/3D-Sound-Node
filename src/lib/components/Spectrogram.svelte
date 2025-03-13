<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  
  // Props
  export let scene: THREE.Scene;
  export let position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  export let visible: boolean = false;
  export let frequencyData: Uint8Array | null = null;
  
  // Spectrogram parameters
  const frequencySamples = 256;
  const timeSamples = 400;
  const nVertices = (frequencySamples + 1) * (timeSamples + 1);
  let heights = new Uint8Array(nVertices);
  
  // Dimensions
  let xSegments = timeSamples;
  let ySegments = frequencySamples;
  let xSize = 10;
  let ySize = 5;
  let xHalfSize = xSize / 2;
  let yHalfSize = ySize / 2;
  
  // Spectrogram mesh
  let spectrogramMesh: THREE.Mesh | null = null;
  
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
    
    // Initially hide the spectrogram
    spectrogramMesh.visible = visible;
    
    // Set position
    spectrogramMesh.position.copy(position);
    
    // Add to scene
    scene.add(spectrogramMesh);
  }
  
  // Update the spectrogram with new frequency data
  export function update() {
    if (!spectrogramMesh || !frequencyData) return;
    
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
  }
  
  // Reset the spectrogram data
  export function reset() {
    if (!spectrogramMesh) return;
    
    // Clear the heights array
    heights.fill(0);
    
    // Update the displacement attribute
    if (spectrogramMesh.geometry.attributes.displacement) {
      spectrogramMesh.geometry.setAttribute('displacement', 
        new THREE.Uint8BufferAttribute(heights, 1));
    }
  }
  
  // Set the position of the spectrogram
  export function setPosition(newPosition: THREE.Vector3) {
    if (!spectrogramMesh) return;
    spectrogramMesh.position.copy(newPosition);
    // Keep the y offset
    spectrogramMesh.position.y = newPosition.y - 2;
  }
  
  // Set the visibility of the spectrogram
  export function setVisible(isVisible: boolean) {
    if (!spectrogramMesh) return;
    spectrogramMesh.visible = isVisible;
  }
  
  // Lifecycle hooks
  onMount(() => {
    createSpectrogram();
  });
  
  onDestroy(() => {
    if (spectrogramMesh && scene) {
      scene.remove(spectrogramMesh);
    }
  });
  
  // Watch for changes to props
  $: if (spectrogramMesh) {
    spectrogramMesh.visible = visible;
    setPosition(position);
  }
  
  $: if (spectrogramMesh && frequencyData) {
    update();
  }
</script>
