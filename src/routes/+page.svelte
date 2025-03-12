<script>
  import { onMount } from 'svelte';
  import NodeGraph from '$lib/components/NodeGraph.svelte';
</script>

<main>
  <NodeGraph />
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #121212;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
