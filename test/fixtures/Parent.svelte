<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child::part(default) {
    color: red;
  }

  Child::part(test) {
    color: blue;
  }

  Child::part(default):hover {
    color: green;
  }
</style>
