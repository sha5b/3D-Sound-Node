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
    // Remove main mesh
    if (mesh && scene) {
      scene.remove(mesh);
    }
    
    // Remove glow mesh (now added directly to scene)
    if (glowMesh && scene) {
      scene.remove(glowMesh);
    }
    
    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    unsubscribeSelection();
    unsubscribeAudio();
  });
  
  // Audio analysis data
  let audioData = {
    amplitude: 0.02,
    frequency: 1,
    waveform: new Float32Array(32).fill(0)
  };
  
  // Time for animation
  let time = 0;
  let animationId: number;
  let originalGeometry: THREE.SphereGeometry | null = null;
  let originalPositions: Float32Array | null = null;
  
  // Update audio data from audio engine
  function updateAudioData() {
    if (audioEngine && isSelected) {
      // Get real-time audio analysis data from audio engine
      const analysisData = audioEngine.getAudioAnalysisData(node.id);
      
      // Update local audio data
      audioData = {
        // Scale amplitude for visual effect (subtle)
        amplitude: analysisData.amplitude * 2,
        // Scale frequency for visual effect
        frequency: analysisData.frequency / 100,
        // Use waveform data directly
        waveform: analysisData.waveform
      };
    }
  }
  
  function createNodeMesh() {
    const size = node.size || 0.5;
    
    // Create a sphere for the main mesh (invisible but clickable)
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    
    // Create an invisible material that's still clickable
    const material = new THREE.MeshBasicMaterial({
      color: node.color || getNodeColor(),
      transparent: true,
      opacity: 0.0, // Completely invisible
      depthWrite: true, // Still writes to depth buffer for raycasting
      depthTest: true
    });
    
    // Create mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    mesh.userData['nodeId'] = node.id;
    mesh.userData['nodeName'] = node.name || node.id;
    
    // Create a dynamic wave-like geometry for the glow effect
    const glowGeometry = new THREE.SphereGeometry(size * 1.2, 32, 32);
    
    // Store original geometry for resetting
    originalGeometry = glowGeometry.clone();
    
    // Store original positions
    if (glowGeometry.attributes && glowGeometry.attributes['position']) {
      const posAttr = glowGeometry.attributes['position'];
      originalPositions = new Float32Array(posAttr.array.length);
      originalPositions.set(posAttr.array);
    }
    
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.color || getNodeColor(),
      transparent: true,
      opacity: isSelected ? 0.3 : 0.15,
      side: THREE.DoubleSide,
      wireframe: false,
      depthWrite: false, // Don't write to depth buffer so it doesn't interfere with raycasting
      depthTest: false   // Don't test against depth buffer
    });
    
    glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Important: Add the glow mesh to the scene directly, not as a child of the main mesh
    // This ensures it doesn't interfere with raycasting on the main mesh
    scene.add(glowMesh);
    
    // Keep the glow mesh in sync with the main mesh position
    glowMesh.position.copy(mesh.position);
    
    // Only start animation if selected
    if (isSelected) {
      startAnimation();
    }
    
    // Add to scene
    scene.add(mesh);
  }
  
  // Animate the glow mesh based on audio data - only when selected
  function startAnimation() {
    // Reset animation if already running
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Reset time
    time = 0;
    
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Only animate if selected
      if (!isSelected) {
        resetGlowMesh();
        cancelAnimationFrame(animationId);
        return;
      }
      
      if (glowMesh && glowMesh.geometry instanceof THREE.BufferGeometry) {
        // Update time - slower for subtlety
        time += 0.005;
        
        // Get real-time audio analysis data
        updateAudioData();
        
        // Get the vertices from the geometry
        const posAttr = glowMesh.geometry.attributes['position'];
        if (!posAttr) return;
        
        const positions = posAttr.array;
        
        // Apply wave-like deformation to each vertex
        for (let i = 0; i < posAttr.count; i++) {
          const idx = i * 3;
          // Use type assertions to handle possibly undefined values
          const x = positions[idx] as number;
          const y = positions[idx + 1] as number;
          const z = positions[idx + 2] as number;
          
          // Calculate distance from center
          const distance = Math.sqrt(x * x + y * y + z * z);
          
          // Normalize the position to get direction
          const nx = x / distance;
          const ny = y / distance;
          const nz = z / distance;
          
          // Get original position with default values
          let origX = x;
          let origY = y;
          let origZ = z;
          
          if (originalPositions) {
            origX = originalPositions[idx] || x;
            origY = originalPositions[idx + 1] || y;
            origZ = originalPositions[idx + 2] || z;
          }
          
          // Calculate wave amplitude - much more subtle
          const waveAmplitude = 0.05 + audioData.amplitude * 0.1;
          
          // Calculate wave frequency - more subtle
          const waveFrequency = 2 + audioData.frequency * 0.005;
          
          // Create a subtle 3D desert dune-like pattern
          // Keep the sphere shape but add subtle variations
          
          // Base phase that varies with position and time
          const basePhase = time * 2 + nx * 3 + ny * 2 + nz * 3;
          
          // Use waveform data from audio analysis to modulate the waves
          // This creates a direct connection between audio and visual
          const waveformIndex = Math.floor((i / posAttr.count) * audioData.waveform.length);
          const waveformValue = audioData.waveform[waveformIndex] || 0;
          
          // Primary wave
          const wave1 = Math.sin(waveFrequency * basePhase);
          
          // Secondary wave at different frequency - creates ripples
          const wave2 = 0.5 * Math.sin(waveFrequency * 2.5 * basePhase + Math.PI / 4);
          
          // Tertiary wave at higher frequency - adds fine detail
          const wave3 = 0.25 * Math.sin(waveFrequency * 5 * basePhase + Math.PI / 2);
          
          // Combine waves with different weights for a complex pattern
          const combinedWave = wave1 + wave2 + wave3 + waveformValue * 0.2;
          
          // Add some noise based on position to create more natural look
          // This simulates the random variations in real dunes
          const noise = 0.05 * (Math.sin(nx * 10) * Math.cos(ny * 8) * Math.sin(nz * 12));
          
          // Calculate final displacement with noise
          const displacement = waveAmplitude * (combinedWave + noise);
          
          // Apply displacement in the normal direction
          // This preserves the spherical shape while adding interesting detail
          positions[idx] = origX + nx * displacement;
          positions[idx + 1] = origY + ny * displacement;
          positions[idx + 2] = origZ + nz * displacement;
        }
        
        // Mark the attribute as needing an update
        posAttr.needsUpdate = true;
      }
    };
    
    animate();
  }
  
  // Reset glow mesh to original shape
  function resetGlowMesh() {
    if (glowMesh && glowMesh.geometry instanceof THREE.BufferGeometry && originalPositions) {
      const posAttr = glowMesh.geometry.attributes['position'];
      if (posAttr && posAttr.array.length === originalPositions.length) {
        posAttr.array.set(originalPositions);
        posAttr.needsUpdate = true;
      }
    }
  }
  
  // No longer needed as we handle this directly in other functions
  
  function updateNodeAppearance() {
    if (!mesh) return;
    
    // Update position of main mesh
    mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
    
    // Update position of glow mesh to match main mesh
    if (glowMesh) {
      glowMesh.position.copy(mesh.position);
    }
    
    // Update material based on selection state
    if (mesh.material instanceof THREE.MeshBasicMaterial) {
      // Keep main mesh invisible
      mesh.material.opacity = 0.0;
    }
    
    if (glowMesh && glowMesh.material instanceof THREE.MeshBasicMaterial) {
      glowMesh.material.opacity = isSelected ? 0.3 : 0.15;
    }
    
    // Start or stop animation based on selection state
    if (isSelected) {
      // Play sound in a loop when selected
      if (audioEngine) {
        // Play the sound in a loop (true as the last parameter)
        audioEngine.playNode(node.id, 1.0, node.soundType as string, true);
        
        // Update audio data based on node properties
        // This would ideally come from audio analysis, but we'll simulate it
        audioData.amplitude = 0.02 + (node.frequency || 440) / 10000;
        audioData.frequency = (node.frequency || 440) / 100;
      }
      
      // Start animation
      startAnimation();
    } else {
      // Reset glow mesh when deselected
      resetGlowMesh();
      
      // Stop animation
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
      
      // Stop sound when deselected
      if (audioEngine) {
        audioEngine.stopNodeSound(node.id);
      }
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
