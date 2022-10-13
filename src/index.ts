import { parse, walk } from "svelte/compiler";
import MagicString from "magic-string";
import { classifySelectors, hash, parseCssExport } from "./utils.js";
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

      let exportBlock = "";
      let gettingExportBlock:
        | {
            targetNode?: Node;
          }
        | undefined = undefined;
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
          enter(node: Node, parent: Node | undefined) {
            if (node.type === "Selector") {
              let componentName = "";
              let propName = "default";

              let start = 0;
              let end = 0;

              let exit = false;
              walk(node, {
                enter(childNode: Node) {
                  if (exit) {
                    this.skip();
                    return;
                  }

                  if (childNode.type === "TypeSelector") {
                    const char = childNode.name[0];

                    if (char.toUpperCase() === char) {
                      componentName = childNode.name;
                      start = childNode.start;
                      end = childNode.end;
                    }
                  }

                  if (
                    childNode.type === "AttributeSelector" &&
                    !childNode.value // not a [checked=value]
                  ) {
                    propName = childNode.name.name;
                    end = childNode.end;

                    this.skip();
                    exit = true;
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

            if (node.type === "PseudoClassSelector" && node.name === "export") {
              gettingExportBlock = {
                targetNode: parent,
              };
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

              if (gettingExportBlock) {
                exportBlock = s.slice(node.start, node.end);
              }
            }
          },

          leave(node: Node) {
            if (node.type === "Rule" && gettingExportBlock) {
              gettingExportBlock = undefined;

              // Remove :export{...} rule
              s.remove(node.start, node.end);
            }
          },
        });
      }

      if (!s.hasChanged()) {
        return;
      }

      const exportContent = parseCssExport(exportBlock);
      const selectors = classifySelectors(exportContent);
      const hasClassSelectors = Object.keys(selectors.class).length !== 0;

      walk(ast.html, {
        enter(node: Node) {
          if (node.type === "Element") {
            if (selectors.element[node.name]) {
              const prop = `$$props.classes$$?.${selectors.element[node.name]}`;

              let classAdded = false;

              // Append to existing set of classes
              walk(node, {
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
              let attributesEnd = node.start + node.name.length;
              if (node.attributes.length) {
                attributesEnd = node.attributes[node.attributes.length - 1].end;
              }

              s.appendLeft(attributesEnd, ` class={${prop}}`);
            }
          }

          if (
            hasClassSelectors &&
            node.type === "Attribute" &&
            node.name === "class"
          ) {
            const value = node.value?.[0];
            const classes = value?.data.split(/\s+/) ?? [];

            for (const className of classes) {
              const found = selectors.class[className];
              if (found) {
                s.appendLeft(value.end, ` {$$props.classes$$?.${found}}`);
              }
            }
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
              ` classes$$={${JSON.stringify(result)}}`
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
