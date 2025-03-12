<script lang="ts">
  import NodeGraph from '$lib/components/NodeGraph.svelte';
</script>

<main>
  <NodeGraph />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #121212;
    font-family: Arial, sans-serif;
  }
  
  main {
    width: 100vw;
    height: 100vh;
    position: relative;
  }
</style>
