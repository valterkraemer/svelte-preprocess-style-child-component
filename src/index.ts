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

      type ComponentInstance = {
        typeSelector: string;
        classSelectors: string[];
        parts: Record<string, string[]>;
        insertFinalClassesAt: number;
        node: Node;
      };

      const componentInstances: ComponentInstance[] = [];

      walk(ast.html, {
        enter(node: Node, parent: Node) {
          if (node.type === "InlineComponent") {
            const componentInstance: ComponentInstance = {
              typeSelector: node.name,
              classSelectors: [],
              parts: {},
              insertFinalClassesAt: node.start + node.name.length + 1, // <Child
              node,
            };

            componentInstances.push(componentInstance);

            // Append to existing set of classes
            walk(node, {
              enter(childNode: Node) {
                if (
                  childNode.type === "Attribute" &&
                  childNode.name === "class"
                ) {
                  const value = childNode.value?.[0];

                  if (value) {
                    componentInstance.classSelectors = value.data.split(/\s+/);

                    s.remove(childNode.start, childNode.end);
                  }
                }
              },
            });
          }

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
                    // Check if surrounded by quotations not e.g. class={prop}
                    if (s.slice(value.start - 1, value.start) !== '"') {
                      s.appendLeft(value.start, '"');
                      s.appendRight(value.end, '"');
                    }

                    s.appendLeft(value.end, ` {${prop}}`);

                    classAdded = true;
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
        },
      });

      if (ast.css) {
        walk(ast.css, {
          enter(node: Node) {
            if (node.type === "Rule") {
              const rule = node;

              let selectors:
                | {
                    start: number;
                    end: number;
                    instances: ComponentInstance[];
                    part: string;
                  }[] = [];

              let className = "";

              walk(rule, {
                enter(node: Node) {
                  if (node.type === "Selector") {
                    this.skip();

                    const selector = node;

                    let children: Node[] = selector.children.slice();

                    let childChunks: Node[][] = [];
                    let childChunk: Node[] = [];

                    for (const child of children) {
                      switch (child.type) {
                        case "WhiteSpace":
                          if (childChunk.length) {
                            childChunks.push(childChunk);
                          }
                          childChunk = [];
                          break;
                        default:
                          childChunk.push(child);
                      }
                    }

                    if (childChunk.length) {
                      childChunks.push(childChunk);
                    }

                    // Only keep chunks with :part selector
                    childChunks = childChunks.filter((childChunk) => {
                      return childChunk.some(
                        (child) =>
                          child.type === "PseudoElementSelector" &&
                          child.name === "part"
                      );
                    });

                    // Only keep chunks that target a componentInstance
                    const result = childChunks
                      .map((childChunk) => {
                        let instances = componentInstances.slice();
                        const removeChildren: Node[] = [];
                        let part = "";

                        childChunk.forEach((child) => {
                          switch (child.type) {
                            case "TypeSelector":
                              instances = instances.filter((instance) => {
                                const match =
                                  instance.typeSelector === child.name;

                                if (match) {
                                  removeChildren.push(child);
                                }

                                return match;
                              });
                              break;
                            case "ClassSelector":
                              instances = instances.filter((instance) => {
                                const match = instance.classSelectors.some(
                                  (classSelector) => {
                                    return classSelector === child.name;
                                  }
                                );

                                if (match) {
                                  removeChildren.push(child);
                                }

                                return match;
                              });
                              break;
                            case "PseudoElementSelector":
                              // TODO: Can it have multiple PseudoElementSelectors?
                              removeChildren.push(child);
                              part = child.children?.[0].value;
                              break;
                          }
                        });

                        if (!part) {
                          throw new Error(
                            `part is missing value in ${filename}`
                          );
                        }

                        return {
                          start: childChunk[0].start,
                          end: childChunk[childChunk.length - 1].end,
                          removeChildren,
                          instances,
                          part,
                        };
                      })
                      .filter(({ instances }) => instances.length);

                    result.forEach(({ removeChildren }) => {
                      removeChildren.forEach((child) => {
                        s.remove(child.start, child.end);
                      });
                    });

                    selectors.push(...result);
                  }

                  if (node.type === "Block") {
                    const blockContent = s.slice(node.start, node.end);

                    className = `svelte-child-${hash(blockContent)}`;

                    this.skip();
                  }
                },
              });

              for (const selector of selectors) {
                s.appendLeft(selector.start, `:global(.${className}`);
                s.appendRight(selector.end, `)`);

                for (const instance of selector.instances) {
                  if (!instance.parts[selector.part]) {
                    instance.parts[selector.part] = [];
                  }

                  instance.parts[selector.part].push(className);
                }
              }
            }
          },
        });
      }

      for (const componentInstance of componentInstances) {
        const parts = componentInstance.parts;

        if (Object.keys(parts).length) {
          const result: Record<string, string> = {};
          for (const part in parts) {
            result[part] = [...new Set(parts[part])].join(" ");
          }

          s.appendLeft(
            componentInstance.insertFinalClassesAt,
            ` parts$$={${JSON.stringify(result)}}`
          );
        }
      }

      return {
        code: s.toString(),
        map: s.generateDecodedMap({ source: filename, hires: true }),
      };
    },
  };
};
