import { expect } from 'chai';
import { read, write, readItem } from '../../src/d2/d2s';
import * as fs from 'fs';
import * as path from 'path';
import * as types from '../../src/d2/types';
import * as request from 'request';
import { constants } from '../../src/data/versions/96_constant_data'



/**
 * End to end tests.
 */
describe('d2s', () => {
  it('should read new character', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.d2s"));
    let save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Simple");
    expect(save.attributes.strength).to.eq(30);
  });

  it('should write new character', async () => {
    let json = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.json"), "utf-8");
    let d2s = JSON.parse(json) as types.ID2S;
    let output = await write(d2s, constants);
    expect(output.length).to.eq(980);
    //fs.writeFileSync(path.join(__dirname,`../../../Program Files (x86)/Diablo II/Save/${d2s.header.name}.d2s`), output);
  });

  it('should read "complex" character', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/complex.d2s"));
    let save = await read(inputstream, constants);
    //console.log(JSON.stringify(save, null, 2));
    expect(save.header.name).to.eq("Complex");
    expect(save.items.length).to.eq(61);
  });

  it('should write "complex" character', async () => {
    let json = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/complex.json"), "utf-8");
    let d2s = JSON.parse(json) as types.ID2S;
    let output = await write(d2s, constants);
    expect(output.length).to.eq(3244);
    //d2s.header.version = 0x61;
    //fs.writeFileSync(`${process.env['USERPROFILE']}/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.d2s`, output);
  });

  it('should read item',  async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/items/tal-rasha-lidless-eye.d2i"));
    //console.log(toBinary(inputstream.toString('hex')));
    let item = await readItem(inputstream, 0x60, constants);
    //let outputstream = await writeItem(item, constants);
    //console.log(toBinary(new Buffer(outputstream).toString('hex')));
    expect(item.set_name).to.eq("Tal Rasha's Lidless Eye");
    //console.log(JSON.stringify(item, null, 2));
  });

  function toBinary(s : String) : any {
    let tokens = s.match(/.{1,2}/g);
    if(tokens != null) {
      tokens = tokens.map(v => { 
        let i = parseInt(v, 16);
        return (i >>> 0).toString(2).padStart(8, '0');
      });
      return tokens.join("");
    }
    return null;
  }

  function letter(i: number): String {
    let s = "";
    do {
      s += String.fromCharCode((i % 26) + 0x61);
      i -= (26 + (i % 26));
    } while(i >= 0);
    return s.split("").reverse().join("");
  }

  xit('should write all characters from directory', async() => {
    let files = fs.readdirSync(path.join(__dirname,`../../../d2/113c/d2s/json`));
    let classes = [0,0,0,0,0,0,0];
    for(let file of files) {
      let d2s = JSON.parse(fs.readFileSync(path.join(__dirname,`../../../d2/113c/d2s/json/${file}`), "utf-8"));
      let i = constants.classes.findIndex(f => f.n === d2s.header.class);
      let clazz = constants.classes[i];
      d2s.header.name = `${clazz.c}-${letter(classes[i]++)}`;
      let output = await write(d2s, constants);
      fs.writeFileSync(path.join(__dirname,`../../../d2/113c/d2s/save/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);

  xit('should read all characters from directory', async() => {
    let files = fs.readdirSync(path.join(__dirname,`../../../d2/113c/d2s/save`));
    for(let file of files) {
      let buffer = fs.readFileSync(path.join(__dirname,`../../../d2/113c/d2s/save/${file}`));
      console.log(file);
      let d2s = await read(buffer, constants);
      //fs.writeFileSync(path.join(__dirname,`../../../data/json/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);

  xit('should download and save', async () => {
    
    function download(url: string) {
      return new Promise((resolve) => {
        request.get(url, async (response, error, body) => {
          resolve(body);
        });
      });
    }
    let chars = [] as any[];
    for(let c of chars) {
      console.log(c);
      let char = c.toLowerCase();
      let body = (await download(`https://armory.slashdiablo.net/retrieving/v1/character?name=${char}`));
      //let body = fs.readFileSync(path.join(__dirname, `../../examples/chars/96/${char}.json`), "utf-8")
      let d2s = JSON.parse(body as string).character.d2s;
      fs.writeFileSync(path.join(__dirname,`../../../data/json/${d2s.header.name}.json`), JSON.stringify(d2s, null, 2));
      //let output = await write(d2s, constants);
      //fs.writeFileSync(path.join(__dirname,`../../../data/save/${d2s.header.name}.d2s`), output);
    }
  }).timeout(Infinity);

});