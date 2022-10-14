<script>
  import Child from "./Child.svelte";
</script>

<Child />
<div class="local">Div</div>

<style>
  Child {
    color: red;
  }

  Child::export(test) {
    transform: scale(1.5);
  }

  Child::export(test)[disabled] {
    color: green;
  }

  Child::export(test)[disabled],
  .local {
    transform: scale(2);
  }
</style>
