import { expect } from "chai";
import { read, write, readItem, writeItem } from "../../src/d2/d2s";
import { setConstantData } from "../../src/d2/constants";
import * as fs from "fs";
import * as path from "path";
import * as types from "../../src/d2/types";
import * as request from "request";
import { constants } from "../../src/data/versions/96_constant_data";
import * as version99 from "../../src/data/versions/99_constant_data";

/**
 * End to end tests.
 */
describe("d2s", () => {
  it("should read version 98 complex character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/98/Agelatus.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Agelatus");
    expect(save.attributes.strength).to.eq(81);
    expect(save.items.length).to.eq(54);
  });

  it("should read version 98 complex character 2", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/98/WatahaWpierdala.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("WatahaWpierdala");
    expect(save.attributes.strength).to.eq(75);
    expect(save.items.length).to.eq(39);
  });

  it("should read version 98 complex character 3", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/98/PaladinTwoNormal.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("PaladinTwo");
    expect(save.attributes.strength).to.eq(159);
    expect(save.items.length).to.eq(73);
  });

  it("should write version 98 complex character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/98/Agelatus.d2s"));
    const save = await read(inputstream, constants);

    const output = await write(save, constants);
    expect(output.length).to.eq(2684);

    // re-reading from saved data, amd comparing
    const readAgain = await read(output, constants);

    // ignore checksum
    readAgain.header.checksum = save.header.checksum;

    expect(save).to.deep.eq(readAgain);
  });

  it("should read version 98 new character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/98/InitialSave.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("InitialSave");
    expect(save.attributes.strength).to.eq(30);
  });

  it("should read version 99 character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/99/Wilhelm.d2s"));
    const save = await read(inputstream, version99.constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Wilhelm");
  });

  it.only("should read version 99 character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/99/Assassin.d2s"));
    const save = await read(inputstream, version99.constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Assassin");
  });

  it("should read version 99 character, autodetect constants", async () => {
    setConstantData(96, constants);
    setConstantData(99, version99.constants);
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/99/Wilhelm.d2s"));
    const save = await read(inputstream);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Wilhelm");
  });

  it("should read new character", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Simple");
    expect(save.attributes.strength).to.eq(30);
  });

  it("should write new character", async () => {
    const json = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.json"), "utf-8");
    const d2s = JSON.parse(json) as types.ID2S;
    const output = await write(d2s, constants);
    expect(output.length).to.eq(980);
    //fs.writeFileSync(path.join(__dirname,`../../../Program Files (x86)/Diablo II/Save/${d2s.header.name}.d2s`), output);
  });

  it('should read "complex" character', async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/complex.d2s"));
    const save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Complex");
    expect(save.items.length).to.eq(61);
  });

  it('should write "complex" character', async () => {
    const json = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/complex.json"), "utf-8");
    const d2s = JSON.parse(json) as types.ID2S;
    const output = await write(d2s, constants);
    expect(output.length).to.eq(3244);
    //d2s.header.version = 0x61;
    //fs.writeFileSync(`${process.env['USERPROFILE']}/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.d2s`, output);
  });

  it("should read item", async () => {
    const inputstream = fs.readFileSync(path.join(__dirname, "../../examples/items/tal-rasha-lidless-eye.d2i"));
    //console.log(toBinary(inputstream.toString('hex')));
    const item = await readItem(inputstream, 0x60, constants);
    //let outputstream = await writeItem(item, constants);
    //console.log(toBinary(new Buffer(outputstream).toString('hex')));
    expect(item.set_name).to.eq("Tal Rasha's Lidless Eye");
    //console.log(JSON.stringify(item, null, 2));
  });

  function toBinary(s: string): any {
    let tokens = s.match(/.{1,2}/g);
    if (tokens != null) {
      tokens = tokens.map((v) => {
        const i = parseInt(v, 16);
        return (i >>> 0).toString(2).padStart(8, "0");
      });
      return tokens.join("");
    }
    return null;
  }

  function letter(i: number): string {
    let s = "";
    do {
      s += String.fromCharCode((i % 26) + 0x61);
      i -= 26 + (i % 26);
    } while (i >= 0);
    return s.split("").reverse().join("");
  }

  xit("should write all characters from directory", async () => {
    const files = fs.readdirSync(path.join(__dirname, `../../../d2/113c/d2s/json`));
    const classes = [0, 0, 0, 0, 0, 0, 0];
    for (const file of files) {
      const d2s = JSON.parse(fs.readFileSync(path.join(__dirname, `../../../d2/113c/d2s/json/${file}`), "utf-8"));
      const i = constants.classes.findIndex((f) => f.n === d2s.header.class);
      const clazz = constants.classes[i];
      d2s.header.name = `${clazz.c}-${letter(classes[i]++)}`;
      const output = await write(d2s, constants);
      fs.writeFileSync(path.join(__dirname, `../../../d2/113c/d2s/save/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);

  xit("should read all characters from directory", async () => {
    const files = fs.readdirSync(path.join(__dirname, `../../../d2/113c/d2s/save`));
    for (const file of files) {
      const buffer = fs.readFileSync(path.join(__dirname, `../../../d2/113c/d2s/save/${file}`));
      console.log(file);
      const d2s = await read(buffer, constants);
      //fs.writeFileSync(path.join(__dirname,`../../../data/json/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);

  xit("should download and save", async () => {
    function download(url: string) {
      return new Promise((resolve) => {
        request.get(url, async (response, error, body) => {
          resolve(body);
        });
      });
    }
    const chars = [] as any[];
    for (const c of chars) {
      console.log(c);
      const char = c.toLowerCase();
      const body = await download(`https://armory.slashdiablo.net/retrieving/v1/character?name=${char}`);
      //let body = fs.readFileSync(path.join(__dirname, `../../examples/chars/96/${char}.json`), "utf-8")
      const d2s = JSON.parse(body as string).character.d2s;
      fs.writeFileSync(path.join(__dirname, `../../../data/json/${d2s.header.name}.json`), JSON.stringify(d2s, null, 2));
      //let output = await write(d2s, constants);
      //fs.writeFileSync(path.join(__dirname,`../../../data/save/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);
});
