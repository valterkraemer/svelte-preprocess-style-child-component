# svelte-preprocess-style-child-component

### Note: this is more of a POC than something you actually should use.

Allows you to style elements inside a child component.

`Child.svelte`

```html
<h1>Child component!</h1>

<style>
  :export {
    default: "h1";
  }
</style>
```

`Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    color: red;
  }
</style>
```

## Getting started

```shell
npm i -D svelte-preprocess-style-child-component
```

Add preprocessor in `svelte.config.js`. Should be something like:

```js
import { svelteProcessStyleChildComponent } from "svelte-preprocess-style-child-component";
...
{
  preprocess: [svelteProcessStyleChildComponent(), preprocess()],
}
```

## Additional features

### Target class

```html
<h1 class="heading">Top heading</h1>
<h2 class="heading">Second heading</h1>

<style>
  :export {
    default: ".heading";
  }
</style>
```

### Multiple exports

`Child.svelte`

```html
<h1>Child component!</h1>
<p>My paragraph</p>

<style>
  :export {
    default: "h1";
    p: "p";
  }
</style>
```

`Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    color: red;
  }

  /* Should come up with a better way of selecting exports, now you cannot do e.g. `:hover` styles */
  Child:paragraph {
    color: blue;
  }
</style>
```

## How it works

It transforms component selectors to global selectors, and passes down the class to the Child component, that then applies it to the correct elements.

### `Child.svelte`

```html
<h1>Child component!</h1>

<style>
  :export {
    default: "h1";
  }
</style>
```

⬇️

```html
<h1 class="{$$props.classes$$?.default}">Child component!</h1>
```

### `Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    color: red;
  }
</style>
```

⬇️

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child classes$$={{default:"svelte-child-1t1isc6"}} />

<style>
  :global(.svelte-child-1t1isc6) {
    color: red;
  }
</style>
```

## Issues

I'm sure there a bunch of cases where this won't work as expected, here are some I've stubled upon. They could probably be fixed, but this is more of a POC.

```html
<style>
  :export {
    default: h1; /* does not work */
    default: "h1";  /* works */
  }
</style>
```

```html
<!-- does not work -->
<h1 class={dynamicClass}>Child component!</h1>

<!-- works -->
<h1 class="{dynamicClass}">Child component!</h1>

<style>
  :export {
    default: "h1";
  }
</style>
```

