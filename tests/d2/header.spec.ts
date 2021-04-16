import { expect } from 'chai';
import { readSkills, writeSkills } from '../../src/d2/skills';
import { readHeader, writeHeader, fixHeader, writeHeaderData, readHeaderData } from '../../src/d2/header';
import { writeAttributes, readAttributes } from '../../src/d2/attributes';
import * as types from '../../src/d2/types';
import { BinaryReader } from '../../src/binary/binaryreader';
import { BinaryWriter } from '../../src/binary/binarywriter';
import * as fs from 'fs';
import * as path from 'path';
import { constants } from '../../src/data/versions/96_constant_data';

describe('header', () => {

  xit('should calulcate checksum', async () => {
    for(let c of constants.classes) {
      let writer = new BinaryWriter().SetLittleEndian();
      let inputstream = fs.readFileSync(path.join(__dirname, `../../examples/chars/97/${c.n}.d2s`));
      let reader = new BinaryReader(inputstream).SetLittleEndian();
      let d2s = {} as types.ID2S;
      await readHeader(d2s, reader);
      writer.WriteArray(await writeHeader(d2s));

      // make lvl 99 w/ quests/wp/diff
      await readHeaderData(d2s, reader, constants);
      d2s.header.progression = 15;
      d2s.header.level = 99;
      d2s.header.status.ladder = true;
      
      for(var i of ["quests_normal", "quests_nm", "quests_hell"]) {
        for(var j of ["act_i", "act_ii", "act_iii", "act_iv", "act_v"]) {
          d2s.header[i][j].introduced = true;
          d2s.header[i][j].completed = true;
        }
        d2s.header[i].act_iii.the_guardian.is_completed = true;
        d2s.header[i].act_iv.terrors_end.is_completed = true;
      }

      for(var i of ["normal", "nm", "hell"]) {
        d2s.header.waypoints[i].act_i.rogue_encampement = true;
        d2s.header.waypoints[i].act_iii.kurast_docks = true;
        d2s.header.waypoints[i].act_iv.the_pandemonium_fortress = true;
        d2s.header.waypoints[i].act_v.harrogath = true;
      }
      for(var i of ["normal", "nm", "hell"]) {
        for(var a of d2s.header.waypoints[i]) {
          for(var w of d2s.header.waypoints[i][a]) {
            d2s.header.waypoints[i][a][w] = true;
          }
        }
      }
      writer.WriteArray(await writeHeaderData(d2s, constants));

      await readAttributes(d2s, reader, constants);
      d2s.attributes.level = 99;
      d2s.attributes.unused_stats = 0x3ff;
      d2s.attributes.unused_skill_points = 0xff;
      d2s.attributes.gold = 990000;
      d2s.attributes.stashed_gold = 2500000;
      writer.WriteArray(await writeAttributes(d2s, constants));

      await readSkills(d2s, reader, constants);
      writer.WriteArray(await writeSkills(d2s, constants));

      writer.WriteArray(reader.ReadArray(inputstream.length - reader.Position())); 
      let end = writer.Position();
      writer.Seek(0x000c)
      await fixHeader(writer);
      
      console.log(`Reader: ${reader.Position()}, Writer ${end}`);
      //C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha
      for(let f of [
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.d2s`,
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.ctl`,
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.ma0`,
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.ma1`,
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.map`,
        `C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.key`
      ]) {
        if(fs.existsSync(f)) fs.unlinkSync(f);
      }
      fs.writeFileSync(`C:/Users/Danny/Saved Games/Diablo II Resurrected Tech Alpha/${d2s.header.name}.d2s`, writer.toArray());
    }
  });
  

  it('should calulcate checksum', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.d2s"));
    let writer = new BinaryWriter().SetLittleEndian();
    writer.WriteArray(inputstream);
    let pre = writer.Seek(0x000c).Peek(4);
    await fixHeader(writer);
    let post = writer.Seek(0x000c).Peek(4);
    expect(post).to.eq(pre);
  });

  it('should read', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.d2s"));
    let reader = new BinaryReader(inputstream).SetLittleEndian();
    let d2s = {} as types.ID2S;
    await readHeader(d2s, reader);
    await readHeaderData(d2s, reader, constants);
    expect(d2s.header.version).to.eq(96);
  });

  it('should write', async () => {
    let json = fs.readFileSync(path.join(__dirname, "../../examples/chars/96/simple.json"), "utf-8");
    let d2s = JSON.parse(json);
    let output = new BinaryWriter();
    output.WriteArray(await writeHeader(d2s));
    output.WriteArray(await writeHeaderData(d2s, constants));
    expect(output.Length()).to.eq(765);
  });

});