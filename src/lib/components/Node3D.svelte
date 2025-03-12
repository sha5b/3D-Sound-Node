<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { selectionStore } from '$lib/stores/selectionStore';
  import { audioStore } from '$lib/stores/audioStore';
  import type { Node } from '$lib/d3/forceSimulation';
  
  export let node: Node;
  export let scene: THREE.Scene;
  
  let mesh: THREE.Mesh;
  let glowMesh: THREE.Mesh;
  let isSelected = false;
  let audioEngine: any;
  
  // Subscribe to selection store
  const unsubscribeSelection = selectionStore.subscribe(selection => {
    isSelected = selection.selectedNodeId === node.id;
    
    if (mesh) {
      updateNodeAppearance();
    }
  });
  
  // Subscribe to audio store
  const unsubscribeAudio = audioStore.subscribe(engine => {
    audioEngine = engine;
  });
  
  onMount(() => {
    createNodeMesh();
  });
  
  onDestroy(() => {
    if (mesh && scene) {
      scene.remove(mesh);
    }
    
    unsubscribeSelection();
    unsubscribeAudio();
  });
  
  function createNodeMesh() {
    const size = node.size || 0.5;
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    
    // Create a transparent material with fresnel effect
    const material = new THREE.MeshPhysicalMaterial({
      color: node.color || getNodeColor(),
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.95, // Make it transparent
      thickness: 0.5,     // Refraction thickness
      envMapIntensity: 1.0,
      clearcoat: 1.0,     // Add clearcoat layer
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: isSelected ? 0.9 : 0.7
    });
    
    // Create mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    mesh.userData['nodeId'] = node.id;
    mesh.userData['nodeName'] = node.name || node.id;
    
    // Add a glow effect
    const glowGeometry = new THREE.SphereGeometry(size * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.color || getNodeColor(),
      transparent: true,
      opacity: isSelected ? 0.3 : 0.15,
      side: THREE.BackSide
    });
    
    glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);
    
    // Add to scene
    scene.add(mesh);
  }
  
  function updateNodeAppearance() {
    if (!mesh) return;
    
    // Update position
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    
    // Update material based on selection state
    if (mesh.material instanceof THREE.MeshPhysicalMaterial) {
      mesh.material.opacity = isSelected ? 0.9 : 0.7;
    }
    
    if (glowMesh && glowMesh.material instanceof THREE.MeshBasicMaterial) {
      glowMesh.material.opacity = isSelected ? 0.3 : 0.15;
    }
    
    // Play sound when selected
    if (isSelected && audioEngine) {
      audioEngine.playNode(node.id, 1.0, node.soundType as string);
    }
  }
  
  function getNodeColor() {
    // Color based on sound type
    const colors: Record<string, number> = {
      sine: 0x4287f5,
      square: 0xf54242,
      sawtooth: 0x42f54e,
      triangle: 0xf5d442
    };
    
    const soundType = node.soundType as string || 'sine';
    return colors[soundType] || 0xffffff;
  }
  
  // Update node when properties change
  $: if (mesh && node) {
    // Update position from node data
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    updateNodeAppearance();
  }
</script>
