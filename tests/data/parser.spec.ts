import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { readConstantData } from "../../src/data/parser";

describe("parser", () => {
  xit("read txt files", async () => {
    //let base = '../../../resurgence'
    const base = "../../../d2/115-2.5/data";
    let v = base.indexOf('2.5') >= 0 ? 99 : 96;
    const files = {};
    let dir = path.join(__dirname, `${base}/global/excel/`);
    fs.readdirSync(dir).forEach((file) => {
      if (file.endsWith(".txt")) {
        files[file] = fs.readFileSync(path.join(dir, file), "utf8");
      }
    });
    if(v >= 99) {
      dir = path.join(__dirname, `${base}/local/lng/strings`);
      fs.readdirSync(dir).forEach((file) => {
        if (file.endsWith(".json")) {
          files[file] = fs.readFileSync(path.join(dir, file), "utf8");
        }
      });
    } else {
      dir = path.join(__dirname, `${base}/local/LNG/ENG/`);
      fs.readdirSync(dir).forEach((file) => {
        if (file.endsWith(".txt")) {
          files[file] = fs.readFileSync(path.join(dir, file), "utf8");
        }
      });
    }
    const constantData = readConstantData(files);
    expect(constantData).to.not.be.null;
    
    //fs.writeFileSync(path.join(__dirname, `${base}/constant_data.js`), `window.constants = \n${JSON.stringify(constantData)}`);
    fs.writeFileSync(
      path.join(__dirname, `../../src/data/versions/${v}_constant_data.ts`),
      `export let constants = \n${JSON.stringify(constantData)}`
    );
  });
});
