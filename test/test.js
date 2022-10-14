import { test } from "uvu";
import { resolve } from "path";
import { preprocess } from "svelte/compiler";

import { styleChildComponent } from "../dist/index.mjs";
import { fileSnapshot } from "./test-utils.js";
import { readFile } from "fs/promises";

function testFixture(fileName) {
  test(fileName, async () => {
    const path = resolve(`test/fixtures/${fileName}`);
    const fileContent = await readFile(path, "utf-8");

    const result = await preprocess(fileContent, [styleChildComponent()]);

    // console.log(result.code);
    await fileSnapshot(fileName, result.code);
  });
}

testFixture("Burger.svelte");
testFixture("Button.svelte");
testFixture("Child.svelte");
testFixture("Class.svelte");
testFixture("Decendant.svelte");
testFixture("ExportSelector.svelte");
testFixture("Parent.svelte");
testFixture("TargetUsingClass.svelte");

test.run();
