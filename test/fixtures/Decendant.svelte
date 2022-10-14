<script>
  import Child from "./Child.svelte";
</script>

<div class="host">
  <Child />
</div>

<style>
  .host:hover Child::part(default) {
		transform: scale(1.1);
	}
</style>
