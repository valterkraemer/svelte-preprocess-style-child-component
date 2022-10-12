/*
    Getting key values from:
    
    :export {
      default: "h1";
      test: ".s";
    }
  */

export function parseCssExport(value: string) {
  if (!value) {
    return {};
  }

  const matches = value.matchAll(/['"]?([a-z0-9A-Z_]+)['"]?:\s*"([^"]+)"/g);

  const result: Record<string, string> = {};
  for (const match of matches) {
    result[match[1]] = match[2];
  }

  return result;
}

export function classifySelectors(selectors: Record<string, string>) {
  const result = {
    class: <Record<string, string>>{},
    element: <Record<string, string>>{},
  };

  Object.entries(selectors).forEach(([k, v]) => {
    if (v.startsWith(".")) {
      result.class[v.slice(1)] = k;
    } else {
      result.element[v] = k;
    }
  });

  return result;
}

// https://github.com/sveltejs/svelte/blob/master/src/compiler/compile/utils/hash.ts
export function hash(str: string) {
  str = str.replace(/\r/g, "");
  let hash = 5381;
  let i = str.length;

  while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(36);
}
