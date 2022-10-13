<script>
  import Child from "./Child.svelte";
</script>

<Child />
<div class="local">Div</div>

<style>
  Child {
    color: red;
  }

  Child[test] {
    transform: scale(1.5);
  }

  Child[test][disabled] {
    color: green;
  }

  Child[test][disabled],
  .local {
    transform: scale(2);
  }
</style>
