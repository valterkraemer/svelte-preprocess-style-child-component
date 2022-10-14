# svelte-preprocess-style-child-component

### Note: this is a POC, use with caution

Allows you to style elements inside a child component using similar syntax as [CSS Shadow Parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part).

`Child.svelte`

```html
<h1 part="heading">Child component!</h1>
```

`Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child::part(heading) {
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
import { styleChildComponent } from "svelte-preprocess-style-child-component";
...
{
  preprocess: [styleChildComponent(), preprocess()],
}
```

## Additional features

### Class selector

```html
<Card class="item" />
<OtherCard class="item" />

<style>
  .item::part(default) {
    color: red;
  }
</style>
```

### Shorthand selector

Component selector `Child` and `Child::part` are treated as an alias for `::part(default)`.

So these are the same:

```css
Child {
  color: red;
}

Child::part {
  color: red;
}

Child::part(default) {
  color: red;
}
```

_NOTE_: You cannot skip the `::part` selector with just a class selector.

```html
<Child class="item" />
<Child />

<style>
  .item {
    /* Does not work */
    color: red;
  }

  .item::part {
    /* Works! */
    color: red;
  }

  Child.item {
    /* Works! */
    color: red;
  }
</style>
```

## How it works

It transforms component selectors to global selectors, and passes down the class to the Child component, that then applies it to the correct elements.

### `Child.svelte`

```html
<h1 part="heading">Child component!</h1>
```

⬇️

```html
<h1 class="{$$props.classes$$?.heading}">Child component!</h1>
```

### `Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child::part(heading) {
    color: red;
  }
</style>
```

⬇️

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child classes$$={{heading:"svelte-child-1t1isc6"}} />

<style>
  :global(.svelte-child-1t1isc6) {
    color: red;
  }
</style>
```

## Issues?

I'm sure there are! Please submit an issue!
