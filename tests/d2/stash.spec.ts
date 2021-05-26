import { expect } from "chai";
import { read, write } from "../../src/d2/stash";
import { constants } from "../../src/data/versions/96_constant_data";
import * as path from "path";
import * as fs from "fs";

describe("stash", () => {
  it("should read plugy shared stash file", async () => {
    const buffer = fs.readFileSync(path.join(__dirname, `../../examples/stash/_LOD_SharedStashSave.sss`));
    const jsonData = await read(buffer, constants, 0x60);

    expect(jsonData.pageCount, "pageCount").to.eq(145);
    expect(jsonData.sharedGold, "sharedGold").to.eq(5912844);
    expect(jsonData.version, "version").to.eq("02");
  });

  xit("should provide read and write consistency for plugy shared stash file", async () => {
    const buffer = fs.readFileSync(path.join(__dirname, `../../examples/stash/_LOD_SharedStashSave.sss`));
    const jsonData = await read(buffer, constants, 0x60);
    const newBuffer = await write(jsonData, constants, 0x60);
    const newJson = await read(newBuffer, constants, 0x60);

    expect(buffer.length, "file size").to.eq(newBuffer.length);
    expect(newJson, "json").to.deep.eq(jsonData);
  });
});
