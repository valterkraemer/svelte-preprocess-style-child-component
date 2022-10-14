<script>
  import Child from "./Child.svelte";
  import Child2 from "./Child2.svelte";
</script>

<Child class="item" />
<a>
  <Child />
  <Child2 class="item" />
</a>

<p class="item">P</p>

<style>
  Child {
    color: red;
  }

  Child.item {
    color: blue;
  }

  .item {
    padding: 2px;
  }

  a .item::part(default) {
    margin: 0;
  }
</style>
