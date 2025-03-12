<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { selectionStore } from '$lib/stores/selectionStore.js';
  import { audioStore } from '$lib/stores/audioStore.js';
  
  export let node;
  export let scene;
  
  let mesh;
  let audioSource;
  let isSelected = false;
  let audioEngine;
  
  // Subscribe to selection store
  const unsubscribeSelection = selectionStore.subscribe(selection => {
    isSelected = selection === node.id;
    
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
    
    if (audioEngine) {
      createAudioSource();
    }
  });
  
  onDestroy(() => {
    if (mesh && scene) {
      scene.remove(mesh);
    }
    
    if (audioSource) {
      audioSource.oscillator.stop();
      audioSource.gain.disconnect();
      audioSource.panner.disconnect();
    }
    
    unsubscribeSelection();
    unsubscribeAudio();
  });
  
  function createNodeMesh() {
    // Create geometry based on node properties
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: getNodeColor(),
      metalness: 0.3,
      roughness: 0.7,
      emissive: isSelected ? 0x444444 : 0x000000
    });
    
    // Create mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x, node.y, node.z);
    mesh.userData.nodeId = node.id;
    
    // Add to scene
    scene.add(mesh);
  }
  
  function updateNodeAppearance() {
    if (!mesh) return;
    
    // Update position
    mesh.position.set(node.x, node.y, node.z);
    
    // Update material based on selection state
    mesh.material.emissive.set(isSelected ? 0x444444 : 0x000000);
    mesh.material.color.set(getNodeColor());
    
    // Update audio position if available
    if (audioSource && audioSource.panner) {
      audioSource.panner.setPosition(node.x, node.y, node.z);
    }
  }
  
  function getNodeColor() {
    // Color based on sound type
    const colors = {
      sine: 0x4287f5,
      square: 0xf54242,
      sawtooth: 0x42f54e,
      triangle: 0xf5d442
    };
    
    return colors[node.soundType] || 0xffffff;
  }
  
  function createAudioSource() {
    audioSource = audioEngine.createNodeSound(node);
    
    // Start oscillator
    audioSource.oscillator.start();
    
    // Set very low gain initially
    audioSource.gain.gain.value = 0.01;
  }
  
  // Update node when properties change
  $: if (mesh && node) {
    updateNodeAppearance();
  }
</script>
