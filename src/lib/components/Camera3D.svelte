<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  
  export let scene: THREE.Scene;
  export let container: HTMLElement;
  
  const dispatch = createEventDispatcher();
  
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  
  onMount(() => {
    initCamera();
    return () => {
      // Cleanup
      window.removeEventListener('resize', handleResize);
    };
  });
  
  function initCamera() {
    // Create camera
    camera = new THREE.PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    camera.position.z = 15;
    
    // Add point light at camera position for better visibility
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 0, 15);
    camera.add(pointLight);
    scene.add(camera); // Add camera to scene to include its lights
    
    // Add controls
    controls = new OrbitControls(camera, container);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 100;
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Dispatch camera and controls to parent
    dispatch('ready', { camera, controls });
  }
  
  // Improved function to focus on a node
  export function focusOnNode(nodePosition: THREE.Vector3) {
    if (!camera || !controls) return;
    
    // Get current camera position and target
    const startPos = new THREE.Vector3().copy(camera.position);
    const startTarget = new THREE.Vector3().copy(controls.target);
    
    // Calculate a better target position that's directly in front of the node
    // This is the key fix for the camera positioning issue
    const direction = new THREE.Vector3(0, 0, 1).normalize();
    const distance = 8; // Fixed distance from node
    const targetPos = new THREE.Vector3().copy(nodePosition).add(
      direction.multiplyScalar(distance)
    );
    
    // Animate camera movement
    const duration = 1200; // ms
    const startTime = Date.now();
    
    function animateCamera() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      // Interpolate position
      camera.position.lerpVectors(startPos, targetPos, ease);
      
      // Interpolate target (this is key for smooth camera movement)
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, nodePosition, ease);
      controls.target.copy(currentTarget);
      
      // Look at the current target
      camera.lookAt(currentTarget);
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        // Ensure controls target is exactly at node position
        controls.target.copy(nodePosition);
      }
    }
    
    animateCamera();
  }
  
  // Handle window resize
  function handleResize() {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
</script>
