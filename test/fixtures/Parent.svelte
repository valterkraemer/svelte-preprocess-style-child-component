<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    color: red;
  }

  Child::export(test) {
    color: blue;
  }

  Child:hover {
    color: green;
  }
</style>
