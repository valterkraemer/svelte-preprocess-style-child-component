<script>
  import Child from "./Child.svelte";
</script>

<p class="target">P</p>
<Child class="target" />

<style>
  .target:hover {
    color: blue;
  }

  Child:hover {
    color: red;
  }
</style>
