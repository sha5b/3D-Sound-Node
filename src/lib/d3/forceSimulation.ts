import * as d3 from 'd3';

// Define types for nodes and links
export interface Node {
  id: string;
  x: number;
  y: number;
  z: number;
  vz?: number;
  soundType?: string;
  frequency?: number;
  size?: number;
  color?: number;
  name?: string;
  index?: number;
  [key: string]: any;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  index?: number;
}

/**
 * Custom force for Z-axis in 3D space
 * @param {number} strength - Force strength
 * @returns {Function} Force function
 */
export function forceZ(strength = 0.1) {
  let nodes: Node[] = [];
  let strength_ = strength;
  let target_ = 0;
  
  function force(alpha: number) {
    for (let i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i];
      // Initialize velocity if not present
      if (node.vz === undefined) node.vz = 0;
      
      // Apply force toward target position
      node.vz = node.vz || 0;
      node.vz += alpha * strength_ * (target_ - node.z);
      
      // Apply velocity with damping
      node.z += node.vz * 0.9;
    }
  }
  
  force.initialize = function(_: Node[]) {
    nodes = _;
  };
  
  force.strength = function(_?: number) {
    return arguments.length ? (strength_ = _ || 0, force) : strength_;
  };
  
  force.target = function(_?: number) {
    return arguments.length ? (target_ = _ || 0, force) : target_;
  };
  
  return force;
}

/**
 * Custom 3D collision force to prevent node overlap
 * @param {number|Function} radius - Collision radius (can be a function)
 * @returns {Function} Force function
 */
export function forceCollide3D(radius: number | ((d: Node) => number)) {
  let nodes: Node[] = [];
  let radius_: (d: Node) => number = typeof radius === 'function' ? radius : () => radius as number;
  let strength_ = 0.7;
  
  function force(alpha: number) {
    const quad = d3.quadtree<Node>(
      nodes,
      d => d.x,
      d => d.y
    );
    
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      const r = radius_(node) + 2; // Add padding
      
      // Check for collisions in x-y plane
      const nx1 = node.x - r;
      const nx2 = node.x + r;
      const ny1 = node.y - r;
      const ny2 = node.y + r;
      
      quad.visit((quad, x1, y1, x2, y2) => {
        if (!quad.length) {
          const otherNode = quad.data;
          if (otherNode && otherNode !== node) {
            // Calculate 3D distance
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const dz = node.z - otherNode.z;
            const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            const r = radius_(node) + radius_(otherNode);
            
            if (l < r) {
              // Collision detected, push nodes apart
              const f = (l - r) / l * alpha * strength_;
              
              // Apply force proportionally to distance
              const fx = dx * f;
              const fy = dy * f;
              const fz = dz * f;
              
              node.x -= fx;
              node.y -= fy;
              node.z -= fz;
              
              otherNode.x += fx;
              otherNode.y += fy;
              otherNode.z += fz;
            }
          }
        }
        
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }
  
  force.initialize = function(_: Node[]) {
    nodes = _;
  };
  
  force.strength = function(_?: number) {
    return arguments.length ? (strength_ = _ || 0.7, force) : strength_;
  };
  
  return force;
}

/**
 * Creates a 3D force simulation
 * @param {Array<Node>} nodes - Array of nodes
 * @param {Array<Link>} links - Array of links
 * @returns {d3.Simulation<Node, Link>} The force simulation
 */
export function create3DForceSimulation(nodes: Node[], links: Link[]) {
  // Create simulation
  const simulation = d3.forceSimulation<Node, Link>(nodes)
    // Link force with fixed distance - reduced distances to keep nodes closer
    .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(d => {
      // Make central node links stable
      if ((d.source as Node).id === 'central-node' || (d.target as Node).id === 'central-node') {
        return 4; // Reduced from 6
      }
      return 3; // Reduced from 4
    }).strength(0.7)) // Increased strength for more stability
    
    // Reduced charge force to prevent nodes from flying away
    .force('charge', d3.forceManyBody<Node>().strength(-15).distanceMax(20)) // Reduced strength and distance
    
    // Center force to keep everything centered - increased strength
    .force('center', d3.forceCenter<Node>().strength(0.2)) // Increased from 0.1
    
    // Add radial force to keep nodes around central node - reduced radius
    .force('radial', d3.forceRadial<Node>(function(d) {
      return d.id === 'central-node' ? 0 : 5; // Reduced radius from 8 to 5
    }).strength(0.2).x(0).y(0)) // Reduced strength from 0.3 to 0.2
    
    // Very weak positioning forces - kept the same
    .force('x', d3.forceX<Node>().strength(0.01))
    .force('y', d3.forceY<Node>().strength(0.01))
    .force('z', forceZ(0.01))
    
    // Collision detection - increased size multiplier to prevent overlap
    .force('collide', forceCollide3D(d => d.size ? d.size * 1.5 : 0.8))
    
    // Simulation parameters for stability
    .alphaTarget(0)
    .alphaDecay(0.15)    // Increased from 0.1 for faster stabilization
    .velocityDecay(0.9); // Increased from 0.8 for less movement
  
  // Override tick to handle z-coordinate
  const originalTick = simulation.tick;
  simulation.tick = function() {
    originalTick.call(this);
    
    // Update z positions
    const zForce = simulation.force('z');
    if (zForce) {
      zForce(simulation.alpha());
    }
    
    // Apply collision force
    const collideForce = simulation.force('collide');
    if (collideForce) {
      collideForce(simulation.alpha());
    }
    
    return this;
  };
  
  return simulation;
}

/**
 * Utility function to add a new node to the simulation
 * @param {d3.Simulation<Node, Link>} simulation - The force simulation
 * @param {Node} node - The node to add
 */
export function addNodeToSimulation(simulation: d3.Simulation<Node, Link>, node: Node) {
  if (!simulation) return;
  
  const nodes = simulation.nodes();
  nodes.push(node);
  simulation.nodes(nodes);
  simulation.alpha(0.5).restart();
}

/**
 * Utility function to add a new link to the simulation
 * @param {d3.Simulation<Node, Link>} simulation - The force simulation
 * @param {Link} link - The link to add
 */
export function addLinkToSimulation(simulation: d3.Simulation<Node, Link>, link: Link) {
  if (!simulation) return;
  
  const linkForce = simulation.force('link') as d3.ForceLink<Node, Link>;
  if (linkForce) {
    const links = linkForce.links();
    links.push(link);
    linkForce.links(links);
    simulation.alpha(0.5).restart();
  }
}
