<script>
  import Child from "./Child.svelte";
</script>

<Child class="item" />

<style>
  Child {
    color: red;
  }

  .item::part {
    color: blue;
  }
</style>
