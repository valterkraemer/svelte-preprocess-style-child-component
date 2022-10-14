# svelte-preprocess-style-child-component

### Note: this is a POC, use with caution

Allows you to style elements inside a child component using similar syntax as [CSS Shadow Parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part).

`Child.svelte`

```html
<div part>
  <h1 part="heading">Child component!</h1>
</div>
```

`Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    padding: 8px;
  }

  Child::part(heading) {
    font-size: 2rem;
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
  .item::part {
    color: red;
  }
</style>
```

### Shorthand selector

`::part` is not needed when targeting component

These are the same:

```css
Child {
  color: red;
}

Child::part {
  color: red;
}
```

_NOTE_: You cannot skip the `::part` selector when using just a class selector.

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
<div part>
  <h1 part="heading">Child component!</h1>
</div>
```

⬇️

```html
<div class={$$props.parts$$?.default$$}>
  <h1 class={$$props.parts$$?.heading}>Child component!</h1>
</div>
```

### `Parent.svelte`

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child />

<style>
  Child {
    padding: 8px;
  }

  Child::part(heading) {
    font-size: 2rem;
  }
</style>
```

⬇️

```html
<script>
  import Child from "./Child.svelte";
</script>

<Child parts$$={{"default$$":"svelte-child-27gw8r","heading":"svelte-child-qzjtt3"}} />

<style>
  :global(.svelte-child-27gw8r) {
    padding: 8px;
  }

  :global(.svelte-child-qzjtt3) {
    font-size: 2rem;
  }
</style>
```

## Issues?

I'm sure there are! Please submit an issue!
