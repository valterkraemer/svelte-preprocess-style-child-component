<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    color: red;
  }

  Child:test {
    color: blue;
  }
</style>
