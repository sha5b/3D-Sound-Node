<script>
  export let addNode;
</script>

<div class="controls-panel">
  <button on:click={addNode} class="add-node-btn">
    Add Node
  </button>
</div>

<style>
  .controls-panel {
    background-color: rgba(30, 30, 30, 0.8);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .add-node-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-node-btn:hover {
    background-color: #3e8e41;
  }
</style>
