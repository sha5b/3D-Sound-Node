import { writable } from 'svelte/store';

interface SelectionState {
  selectedNodeId: string | null;
}

/**
 * Store for managing node selection state
 */
const createSelectionStore = () => {
  const initialState: SelectionState = {
    selectedNodeId: null
  };
  
  const { subscribe, set, update } = writable<SelectionState>(initialState);
  
  return {
    subscribe,
    
    /**
     * Select a node
     * @param {string} nodeId - ID of the node to select
     */
    select: (nodeId: string) => {
      update(state => ({ ...state, selectedNodeId: nodeId }));
    },
    
    /**
     * Deselect the currently selected node
     */
    deselect: () => {
      update(state => ({ ...state, selectedNodeId: null }));
    },
    
    /**
     * Toggle selection state of a node
     * @param {string} nodeId - ID of the node to toggle
     * @returns {boolean} Whether the node is now selected
     */
    toggle: (nodeId: string): boolean => {
      let isSelected = false;
      
      update(state => {
        if (state.selectedNodeId === nodeId) {
          // Deselect if already selected
          isSelected = false;
          return { ...state, selectedNodeId: null };
        } else {
          // Select if not already selected
          isSelected = true;
          return { ...state, selectedNodeId: nodeId };
        }
      });
      
      return isSelected;
    },
    
    /**
     * Clear the selection
     */
    clear: () => {
      update(state => ({ ...state, selectedNodeId: null }));
    },
    
    /**
     * Check if a node is selected
     * @param {string} nodeId - ID of the node to check
     * @returns {boolean} Whether the node is selected
     */
    isSelected: (nodeId: string): boolean => {
      let selected = false;
      
      subscribe(state => {
        selected = state.selectedNodeId === nodeId;
      })();
      
      return selected;
    }
  };
};

export const selectionStore = createSelectionStore();
