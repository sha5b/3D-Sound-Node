import { writable } from 'svelte/store';

/**
 * Store for managing the graph data (nodes and links)
 */
const createGraphStore = () => {
  // Initialize with a central node and dummy data
  const initialState = {
    nodes: [
      {
        id: 'central-node',
        x: 0,
        y: 0,
        z: 0,
        soundType: 'sine',
        frequency: 440,
        size: 1.2,
        color: 0x4287f5,
        name: 'Central Node'
      },
      {
        id: 'node-1',
        x: 5,
        y: 3,
        z: 2,
        soundType: 'square',
        frequency: 330,
        size: 0.8,
        color: 0xf54242,
        name: 'Audio Node 1'
      },
      {
        id: 'node-2',
        x: -4,
        y: 2,
        z: -3,
        soundType: 'sawtooth',
        frequency: 220,
        size: 0.7,
        color: 0x42f54e,
        name: 'Audio Node 2'
      },
      {
        id: 'node-3',
        x: 2,
        y: -5,
        z: 4,
        soundType: 'triangle',
        frequency: 550,
        size: 0.9,
        color: 0xf5d442,
        name: 'Audio Node 3'
      },
      {
        id: 'node-4',
        x: -3,
        y: -4,
        z: -2,
        soundType: 'sine',
        frequency: 660,
        size: 0.6,
        color: 0x42f5f5,
        name: 'Audio Node 4'
      }
    ],
    links: [
      { source: 'central-node', target: 'node-1' },
      { source: 'central-node', target: 'node-2' },
      { source: 'central-node', target: 'node-3' },
      { source: 'central-node', target: 'node-4' }
    ]
  };
  
  const { subscribe, set, update } = writable(initialState);
  
  return {
    subscribe,
    set,
    update,
    
    /**
     * Add a new node to the graph
     * @param {Object} node - Node to add
     */
    addNode: (node) => {
      update(graph => {
        return {
          nodes: [...graph.nodes, node],
          links: graph.links
        };
      });
    },
    
    /**
     * Remove a node from the graph
     * @param {string} nodeId - ID of the node to remove
     */
    removeNode: (nodeId) => {
      update(graph => {
        // Remove the node
        const filteredNodes = graph.nodes.filter(node => node.id !== nodeId);
        
        // Remove any links connected to this node
        const filteredLinks = graph.links.filter(
          link => link.source.id !== nodeId && link.target.id !== nodeId
        );
        
        return {
          nodes: filteredNodes,
          links: filteredLinks
        };
      });
    },
    
    /**
     * Add a link between two nodes
     * @param {string} sourceId - Source node ID
     * @param {string} targetId - Target node ID
     */
    addLink: (sourceId, targetId) => {
      update(graph => {
        // Check if link already exists
        const linkExists = graph.links.some(
          link => (link.source.id === sourceId && link.target.id === targetId) || 
                  (link.source.id === targetId && link.target.id === sourceId)
        );
        
        if (!linkExists && sourceId !== targetId) {
          return {
            nodes: graph.nodes,
            links: [...graph.links, { source: sourceId, target: targetId }]
          };
        }
        
        return graph;
      });
    },
    
    /**
     * Remove a link from the graph
     * @param {string} sourceId - Source node ID
     * @param {string} targetId - Target node ID
     */
    removeLink: (sourceId, targetId) => {
      update(graph => {
        const filteredLinks = graph.links.filter(
          link => !(
            (link.source.id === sourceId && link.target.id === targetId) || 
            (link.source.id === targetId && link.target.id === sourceId)
          )
        );
        
        return {
          nodes: graph.nodes,
          links: filteredLinks
        };
      });
    },
    
    /**
     * Clear the entire graph
     */
    clear: () => {
      set(initialState);
    }
  };
};

export const graphStore = createGraphStore();
