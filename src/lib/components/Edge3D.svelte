<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import type { Node, Link } from '$lib/d3/forceSimulation';
  import { graphStore } from '$lib/stores/graphStore';
  
  export let link: Link;
  export let scene: THREE.Scene;
  
  let line: THREE.Line;
  let nodes: Node[] = [];
  
  // Subscribe to graph store to get updated node positions
  const unsubscribeGraph = graphStore.subscribe(graph => {
    nodes = graph.nodes;
    if (line) {
      updateEdge();
    }
  });
  
  onMount(() => {
    createEdge();
  });
  
  onDestroy(() => {
    if (line && scene) {
      scene.remove(line);
    }
    unsubscribeGraph();
  });
  
  function createEdge() {
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    
    // Set positions (will be updated in updateEdge)
    const positions = new Float32Array(6); // 2 points * 3 coordinates
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material with improved appearance
    const material = new THREE.LineBasicMaterial({
      color: 0xaaaaaa,
      opacity: 0.7,
      transparent: true,
      linewidth: 1
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
    
    // Find source and target nodes
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    // Get positions (with fallbacks)
    const sourcePos = {
      x: sourceNode?.x || 0,
      y: sourceNode?.y || 0,
      z: sourceNode?.z || 0
    };
    
    const targetPos = {
      x: targetNode?.x || 0,
      y: targetNode?.y || 0,
      z: targetNode?.z || 0
    };
    
    // Update line geometry
    const positionAttribute = line.geometry.attributes['position'];
    if (positionAttribute) {
      const positions = positionAttribute.array;
      
      // Source point
      positions[0] = sourcePos.x;
      positions[1] = sourcePos.y;
      positions[2] = sourcePos.z;
      
      // Target point
      positions[3] = targetPos.x;
      positions[4] = targetPos.y;
      positions[5] = targetPos.z;
      
      // Mark the attribute as needing an update
      positionAttribute.needsUpdate = true;
    }
  }
  
  // Update edge when link changes
  $: if (line && link) {
    updateEdge();
  }
</script>
