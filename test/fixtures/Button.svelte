<script>
  import clsx from "clsx";
  import button from "$styles/button.module.css";

  export let variant = "default";
</script>

<button
  part="default"
  class="{clsx(button.btn, {
    [button.default]: variant === "default",
    [button.transparent]: variant === "transparent",
    [button.green]: variant === "green",
  })}"
>
  <slot />
</button>
