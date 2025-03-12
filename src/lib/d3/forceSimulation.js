import * as d3 from 'd3';

/**
 * Custom force for Z-axis in 3D space
 * @param {number} strength - Force strength
 * @returns {Function} Force function
 */
export function forceZ(strength = 0.1) {
  let nodes;
  let strength_ = strength;
  let target_ = 0;
  
  function force(alpha) {
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
  
  force.initialize = function(_) {
    nodes = _;
  };
  
  force.strength = function(_) {
    return arguments.length ? (strength_ = +_, force) : strength_;
  };
  
  force.target = function(_) {
    return arguments.length ? (target_ = +_, force) : target_;
  };
  
  return force;
}

/**
 * Custom 3D collision force to prevent node overlap
 * @param {number} radius - Collision radius (can be a function)
 * @returns {Function} Force function
 */
export function forceCollide3D(radius) {
  let nodes;
  let radius_ = typeof radius === 'function' ? radius : () => radius;
  let strength_ = 0.7;
  
  function force(alpha) {
    const quad = d3.quadtree(
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
  
  force.initialize = function(_) {
    nodes = _;
  };
  
  force.strength = function(_) {
    return arguments.length ? (strength_ = +_, force) : strength_;
  };
  
  return force;
}

/**
 * Creates a 3D force simulation
 * @param {Array} nodes - Array of nodes
 * @param {Array} links - Array of links
 * @returns {d3.Simulation} The force simulation
 */
export function create3DForceSimulation(nodes, links) {
  // Create simulation
  const simulation = d3.forceSimulation(nodes)
    // Link force with fixed distance
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
      // Make central node links stable
      if (d.source.id === 'central-node' || d.target.id === 'central-node') {
        return 6;
      }
      return 4;
    }).strength(0.5)) // Stronger links for stability
    
    // Reduced charge force to prevent nodes from flying away
    .force('charge', d3.forceManyBody().strength(-20).distanceMax(30))
    
    // Center force to keep everything centered
    .force('center', d3.forceCenter().strength(0.1))
    
    // Add radial force to keep nodes around central node
    .force('radial', d3.forceRadial(function(d) {
      return d.id === 'central-node' ? 0 : 8; // Central node at center, others at radius 8
    }).strength(0.3).x(0).y(0))
    
    // Very weak positioning forces
    .force('x', d3.forceX().strength(0.01))
    .force('y', d3.forceY().strength(0.01))
    .force('z', forceZ(0.01))
    
    // Collision detection
    .force('collide', forceCollide3D(d => d.size * 1.2 || 0.6))
    
    // Simulation parameters for stability
    .alphaTarget(0)
    .alphaDecay(0.1)    // Faster decay to reach equilibrium
    .velocityDecay(0.8); // Higher decay to reduce oscillation
  
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
 * @param {d3.Simulation} simulation - The force simulation
 * @param {Object} node - The node to add
 */
export function addNodeToSimulation(simulation, node) {
  if (!simulation) return;
  
  const nodes = simulation.nodes();
  nodes.push(node);
  simulation.nodes(nodes);
  simulation.alpha(0.5).restart();
}

/**
 * Utility function to add a new link to the simulation
 * @param {d3.Simulation} simulation - The force simulation
 * @param {Object} link - The link to add
 */
export function addLinkToSimulation(simulation, link) {
  if (!simulation) return;
  
  const links = simulation.force('link').links();
  links.push(link);
  simulation.force('link').links(links);
  simulation.alpha(0.5).restart();
}
