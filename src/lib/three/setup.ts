import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Creates a Three.js scene with camera, renderer, and controls
 * @param {HTMLElement} container - DOM element to attach the renderer to
 * @returns {Object} Object containing scene, camera, renderer, and controls
 */
export function createScene(container: HTMLElement): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
} {
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212);
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  camera.position.z = 15;
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ 
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
  
  // Add point light at camera position for better visibility
  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(0, 0, 15);
  camera.add(pointLight);
  scene.add(camera); // Add camera to scene to include its lights
  
  // Add controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.minDistance = 3;
  controls.maxDistance = 100;
  
  return { scene, camera, renderer, controls };
}

/**
 * Creates a raycaster for object selection
 * @param {THREE.Camera} camera - The camera to use for raycasting
 * @returns {THREE.Raycaster} The raycaster
 */
export function createRaycaster(camera: THREE.Camera): THREE.Raycaster {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.1;
  
  // Set a reasonable precision for meshes
  raycaster.params.Line = {
    threshold: 0.1
  };
  
  raycaster.params.Mesh = {
    threshold: 0
  };
  
  return raycaster;
}

/**
 * Performs raycasting to find intersected objects
 * @param {THREE.Raycaster} raycaster - The raycaster
 * @param {THREE.Camera} camera - The camera
 * @param {Array<THREE.Object3D>} objects - Array of objects to check for intersections
 * @param {THREE.Vector2} mouse - Object with normalized x and y coordinates
 * @returns {Array<THREE.Intersection>} Array of intersected objects
 */
export function performRaycast(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  objects: THREE.Object3D[],
  mouse: THREE.Vector2
): THREE.Intersection[] {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(objects, false);
}

/**
 * Creates a grid helper for visual reference
 * @param {number} size - Size of the grid
 * @param {number} divisions - Number of divisions
 * @returns {THREE.GridHelper} The grid helper
 */
export function createGridHelper(size = 20, divisions = 20): THREE.GridHelper {
  const gridHelper = new THREE.GridHelper(size, divisions, 0x555555, 0x333333);
  gridHelper.position.y = -5;
  return gridHelper;
}
