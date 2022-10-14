<script>
  import Child from "./Child.svelte";
  import Child2 from "./Child2.svelte";
</script>

<a>
  <Child class="item" />
  <Child2 class="item" />
</a>

<p class="item">P</p>

<style>
  .item,
  a .item::part(default) {
    color: red;
  }
</style>
