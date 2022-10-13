import { test } from "uvu";
import { resolve } from "path";
import { preprocess } from "svelte/compiler";

import { svelteProcessStyleChildComponent } from "../dist/index.mjs";
import { fileSnapshot } from "./test-utils.js";
import { readFile } from "fs/promises";

function testFixture(fileName) {
  test(fileName, async () => {
    const path = resolve(`test/fixtures/${fileName}`);
    const fileContent = await readFile(path, "utf-8");

    const result = await preprocess(fileContent, [
      svelteProcessStyleChildComponent(),
    ]);

    await fileSnapshot(fileName, result.code);
  });
}

testFixture("Child.svelte");
testFixture("Parent.svelte");
testFixture("Burger.svelte");
testFixture("Button.svelte");

test.run();
