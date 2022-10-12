import { snapshot } from "uvu/assert";
import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";

export async function fileSnapshot(name, content) {
  const fileName = name.replace(/[^a-zA-Z0-9]/g, "-");

  const path = resolve(`test/snapshots/${fileName}.snap`);

  let fileContent;

  try {
    fileContent = await readFile(path, "utf-8");
    snapshot(content, fileContent);
    return;
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // file didn't exist

  try {
    await writeFile(path, content, "utf-8");
    console.info(`Created snapshot: "${path}"`);
    return;
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  // folder didn't exist

  const dir = dirname(path);

  await mkdir(dir);
  console.info(`Created directory: "${dir}"`);
  await writeFile(path, content, "utf-8");
  console.info(`Created snapshot: "${path}"`);
}
