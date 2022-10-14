<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    padding: 8px;
  }

  Child::part(heading) {
    font-size: 2rem;
  }
</style>
