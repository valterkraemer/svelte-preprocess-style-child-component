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

export const svelteProcessStyleChildComponent = (): PreprocessorGroup => {
  return {
    markup: ({ content, filename }) => {
      const s = new MagicString(content);

      const ast = parse(content);

      type Component = Record<string, string[]>;

      const components: Record<string, Component> = {};
      if (ast.instance) {
        walk(ast.instance, {
          enter(node: Node) {
            if (node.type === "ImportDefaultSpecifier") {
              components[node.local.name] = {};
            }
          },
        });
      }

      let exportBlock = "";
      let gettingExportBlock:
        | {
            targetNode?: Node;
          }
        | undefined = undefined;
      let gettingSelector:
        | {
            targetNode: Node;
            classes: string[];
          }
        | undefined = undefined;

      if (ast.css) {
        walk(ast.css, {
          enter(node: Node, parent: Node | undefined) {
            if (node.type === "PseudoClassSelector" && node.name === "export") {
              gettingExportBlock = {
                targetNode: parent,
              };
            }

            if (node.type === "Selector") {
              let component: Component | undefined = undefined;
              let propName = "default";

              walk(node, {
                enter(childNode: Node) {
                  if (
                    childNode.type === "TypeSelector" &&
                    components[childNode.name]
                  ) {
                    component = components[childNode.name];
                  }
                  if (childNode.type === "PseudoClassSelector") {
                    propName = childNode.name;
                  }
                },
              });

              if (component) {
                if (!component[propName]) {
                  (component as Component)[propName] = [];
                }

                gettingSelector = {
                  targetNode: node,
                  classes: component[propName],
                };

                this.skip();
              }
            }

            if (node.type === "Block") {
              if (gettingSelector) {
                const { classes, targetNode } = gettingSelector;
                gettingSelector = undefined;

                const content = s.slice(node.start, node.end);

                const className = `svelte-child-${hash(content)}`;
                if (!classes.includes(className)) {
                  classes.push(className);
                }

                s.update(
                  targetNode.start,
                  targetNode.end,
                  `:global(.${className})`
                );
              }

              if (gettingExportBlock) {
                exportBlock = content;
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
        return { code: content };
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
                    hasClassSelectors &&
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
