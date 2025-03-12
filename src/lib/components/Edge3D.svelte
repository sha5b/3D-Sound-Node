<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  
  export let link;
  export let scene;
  
  let line;
  
  onMount(() => {
    createEdge();
  });
  
  onDestroy(() => {
    if (line && scene) {
      scene.remove(line);
    }
  });
  
  function createEdge() {
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    
    // Set positions (will be updated in updateEdge)
    const positions = new Float32Array(6); // 2 points * 3 coordinates
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const material = new THREE.LineBasicMaterial({
      color: 0xaaaaaa,
      opacity: 0.7,
      transparent: true
    });
    
    // Create line
    line = new THREE.Line(geometry, material);
    
    // Add to scene
    scene.add(line);
    
    // Initial update
    updateEdge();
  }
  
  function updateEdge() {
    if (!line) return;
    
    // Get source and target positions
    const sourcePos = {
      x: link.source.x || 0,
      y: link.source.y || 0,
      z: link.source.z || 0
    };
    
    const targetPos = {
      x: link.target.x || 0,
      y: link.target.y || 0,
      z: link.target.z || 0
    };
    
    // Update line geometry
    const positions = line.geometry.attributes.position.array;
    
    // Source point
    positions[0] = sourcePos.x;
    positions[1] = sourcePos.y;
    positions[2] = sourcePos.z;
    
    // Target point
    positions[3] = targetPos.x;
    positions[4] = targetPos.y;
    positions[5] = targetPos.z;
    
    // Mark the attribute as needing an update
    line.geometry.attributes.position.needsUpdate = true;
  }
  
  // Update edge when link changes
  $: if (line && link) {
    updateEdge();
  }
</script>
