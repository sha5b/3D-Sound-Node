<script lang="ts">
  import ThreeScene from '$lib/components/ThreeScene.svelte';
</script>

<main>
  <ThreeScene />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    width: 100%;
    height: 100%;
    position: fixed;
    background-color: #000;
  }

  :global(html) {
    width: 100%;
    height: 100%;
  }

  main {
    width: 100%;
    height: 100vh;
    display: block;
  }
</style>
