import { parse, walk } from "svelte/compiler";
import MagicString from "magic-string";
import { hash } from "./utils.js";
import type { PreprocessorGroup } from "svelte/types/compiler/preprocess/types.js";

interface Node {
  start: number;
  end: number;
  type: string;
  [propName: string]: any;
}

export const styleChildComponent = (): PreprocessorGroup => {
  return {
    markup: ({ content, filename }) => {
      const s = new MagicString(content);

      const scriptlessContent = content.replace(
        /<!--[^]*?-->|<script(\s[^]*?)?(?:>([^]*?)<\/script>|\/>)/gi,
        (match) => {
          return " ".repeat(match.length);
        }
      );

      const ast = parse(scriptlessContent);

      type Component = Record<string, string[]>;

      const components: Record<string, Component> = {};

      let gettingSelector:
        | {
            selectorEnd: number;
            start: number;
            end: number;
            classes: string[];
          }
        | undefined = undefined;

      if (ast.css) {
        walk(ast.css, {
          enter(node: Node) {
            if (node.type === "Selector") {
              let componentName = "";
              let propName = "default";

              let start = 0;
              let end = 0;

              walk(node, {
                enter(childNode: Node) {
                  if (childNode.type === "TypeSelector") {
                    const char = childNode.name[0];

                    if (char.toUpperCase() === char) {
                      componentName = childNode.name;
                      start = childNode.start;
                      end = childNode.end;
                    }
                  }

                  if (
                    childNode.type === "PseudoElementSelector" &&
                    childNode.name === "part" &&
                    childNode.children?.[0].value
                  ) {
                    propName = childNode.children?.[0].value;
                    end = childNode.end;

                    this.skip();
                  }
                },
              });

              if (componentName) {
                if (!components[componentName]) {
                  components[componentName] = {};
                }

                const component = components[componentName];

                if (!component[propName]) {
                  component[propName] = [];
                }

                gettingSelector = {
                  selectorEnd: node.end,
                  start,
                  end,
                  classes: component[propName],
                };

                this.skip();
              }
            }

            if (node.type === "Block") {
              if (gettingSelector) {
                const { classes, start, end, selectorEnd } = gettingSelector;
                gettingSelector = undefined;

                const blockContent = s.slice(node.start, node.end);

                const className = `svelte-child-${hash(blockContent)}`;
                if (!classes.includes(className)) {
                  classes.push(className);
                }

                s.update(start, end, `:global(.${className}`);
                s.appendRight(selectorEnd, `)`);
              }
            }
          },
        });
      }

      walk(ast.html, {
        enter(node: Node, parent: Node) {
          if (node.type === "Attribute" && node.name === "part") {
            const value = node.value?.[0].data;

            if (!value) {
              throw new Error(`part is missing value in ${filename}`);
            }

            const prop = `$$props.parts$$?.${value}`;

            let classAdded = false;

            // remove part="x"
            s.remove(node.start, node.end);

            // Append to existing set of classes
            walk(parent, {
              enter(childNode: Node) {
                if (
                  childNode.type === "Attribute" &&
                  childNode.name === "class"
                ) {
                  const value = childNode.value?.[0];

                  if (value) {
                    classAdded = true;
                    s.appendLeft(value.end, ` {${prop}}`);
                  }
                }
              },
            });

            if (classAdded) {
              return;
            }

            // Create class attribute and add class
            let attributesEnd = parent.start + parent.name.length;
            if (parent.attributes.length) {
              attributesEnd =
                parent.attributes[parent.attributes.length - 1].end;
            }

            s.appendLeft(attributesEnd, ` class={${prop}}`);
          }

          if (
            node.type === "InlineComponent" &&
            components[node.name] &&
            Object.keys(components[node.name]).length
          ) {
            let attributesEnd = node.start + node.name.length + 1;
            if (node.attributes.length) {
              attributesEnd = node.attributes[node.attributes.length - 1].end;
            }

            const result: Record<string, string> = {};
            for (const key in components[node.name]) {
              result[key] = components[node.name][key].join(" ");
            }

            s.appendLeft(
              attributesEnd,
              ` parts$$={${JSON.stringify(result)}}`
            );
          }
        },
      });

      return {
        code: s.toString(),
        map: s.generateDecodedMap({ source: filename, hires: true }),
      };
    },
  };
};
