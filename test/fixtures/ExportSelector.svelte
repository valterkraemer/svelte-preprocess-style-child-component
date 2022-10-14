<script>
  import Child from "./Child.svelte";
</script>

<Child />
<div class="local">Div</div>

<style>
  Child::part(default) {
    color: red;
  }

  Child::part(test) {
    transform: scale(1.5);
  }

  Child::part(test)[disabled] {
    color: green;
  }

  Child::part(test)[disabled],
  .local {
    transform: scale(2);
  }
</style>
