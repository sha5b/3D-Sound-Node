import { writable } from 'svelte/store';

/**
 * Store for tracking the currently selected node
 * The value is either the ID of the selected node or null if nothing is selected
 */
const createSelectionStore = () => {
  const { subscribe, set } = writable(null);
  
  return {
    subscribe,
    
    /**
     * Select a node
     * @param {string|null} nodeId - ID of the node to select, or null to clear selection
     */
    select: (nodeId) => {
      set(nodeId);
    },
    
    /**
     * Clear the current selection
     */
    clear: () => {
      set(null);
    },
    
    /**
     * Toggle selection of a node
     * @param {string} nodeId - ID of the node to toggle
     * @returns {boolean} Whether the node is now selected
     */
    toggle: (nodeId) => {
      let isNowSelected = false;
      
      // Update the store and capture the new state
      set(currentSelection => {
        if (currentSelection === nodeId) {
          // Node was selected, now deselected
          isNowSelected = false;
          return null;
        } else {
          // Node was not selected, now selected
          isNowSelected = true;
          return nodeId;
        }
      });
      
      return isNowSelected;
    }
  };
};

export const selectionStore = createSelectionStore();
