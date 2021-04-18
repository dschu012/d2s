import { expect } from 'chai';
import { readItems, readItem, writeItem } from '../../src/d2/items';
import * as types from '../../src/d2/types';
import { BinaryReader } from '../../src/binary/binaryreader';
import { _writeBits } from '../../src/util';
import { constants } from '../../src/data/versions/96_constant_data';
import { BinaryWriter } from '../../src/binary/binarywriter';
import { writer } from '../../src/d2/d2s';
import { _writeMagicProperties } from '../../src/d2/versions/default_item';

describe('items', () => {

  let config = {
    extendedStash: false
  } as types.IConfig;


  /*
HP1
Uint8Array(10) [16, 0, 160, 0, 5, 228, 4, 207, 79, 0]

HP2
Uint8Array(9) [16, 0, 160, 0, 5, 228, 4, 79, 38]

HP3
Uint8Array(10) [16, 0, 160, 0, 5, 228, 4, 207, 109, 0]

HP4
Uint8Array(10) [16, 0, 160, 0, 5, 228, 4, 207, 175, 0]

HP5
Uint8Array(10) [16, 0, 160, 0, 5, 228, 4, 79, 180, 0]
  */

  xit('should read "simple" item 1.15', async() => {
    //hp1 from game
    //let buffer = new Uint8Array([16,32,130,0,13,17,0,63,30,22,187,92,65,2,2,14,14,255,1]);
    let buffer, reader, item;
    
    //HP1 (inv, col=9, row=3)
    buffer = new Uint8Array([16, 0, 160, 0, 5, 228, 4, 207, 79, 0]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);

    //HP2 (inv, col=9, row=3)
    buffer = new Uint8Array([16, 0, 160, 0, 5, 228, 4, 79, 38]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);

    //HP3 (inv, col=9, row=3)
    buffer = new Uint8Array([16, 0, 160, 0, 5, 228, 4, 207, 109, 0]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);

    //HP4 (inv, col=9, row=3)
    buffer = new Uint8Array([16, 0, 160, 0, 5, 228, 4, 207, 175, 0]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);

    //HP5 (inv, col=9, row=3)
    buffer = new Uint8Array([16, 0, 160, 0, 5, 228, 4, 79, 180, 0]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);
    
  });

  xit('should write custom charm', async() => {
    let buffer, reader, item;
    buffer = new Uint8Array([16, 0, 128, 0, 5, 228, 68, 216, 79, 120, 250, 137, 117, 89, 210, 96, 199, 72, 0, 248, 12, 240, 17, 240, 25, 240, 57, 17, 155, 34, 118, 69, 108, 139, 216, 63, 207, 178, 80, 198, 195, 216, 8, 192, 80, 255, 31]);
    reader = new BinaryReader(buffer).SetLittleEndian();
    item = await readItem(reader, 0x61, constants, config);
    
    let writer = new BinaryWriter().SetLittleEndian();
    writer.WriteArray(buffer);
    let z = {
      magic_attributes: [
        { id: 151, values: [123, 31] }, //conviction
        { id: 96, values: [107] }, //movement speed
        { id: 99, values: [107] }, //fhr
        { id: 105, values: [107] }, //fcr
        { id: 0, values: [95] },
        { id: 1, values: [95] },
        { id: 2, values: [95] },
        { id: 3, values: [95] }, //all stats
        { id: 39, values: [205] },
        { id: 40, values: [20] },
        { id: 41, values: [205] },
        { id: 42, values: [20] },
        { id: 43, values: [205] },
        { id: 44, values: [20] },
        { id: 45, values: [205] },
        { id: 46, values: [20] }, //all resist
        { id: 34, values: [63] }, //pdr
        { id: 35, values: [63] }, //mdr
        { id: 36, values: [255] }, //pdr
        { id: 37, values: [255] }, //mdr
        { id: 142, values: [127] },
        { id: 143, values: [127] },
        { id: 144, values: [127] },
        { id: 145, values: [127] },
        { id: 146, values: [127] },
        { id: 147, values: [127] },
        { id: 148, values: [127] },
        { id: 149, values: [127] }, //damage reduction
        { id: 329, values: [127] },
        { id: 330, values: [127] },
        { id: 331, values: [127] },
        { id: 332, values: [127] },
        { id: 333, values: [127] },
        { id: 334, values: [127] },
        { id: 335, values: [127] },
        { id: 336, values: [127] },
        { id: 216, values: [63] }, //life
        { id: 217, values: [63] }, //mana
        { id: 127, values: [7] }, //all skill
        { id: 89, values: [7] },  //light radius
        { id: 80, values: [127] }, //mf
        { id: 240, values: [63] }, //mf
        { id: 97, values: [54, 31] }, //tele

      ]
    } as types.IItem;
    let offset = 146; //where statlist starts on the charm
    writer.Seek(0);
    offset = _writeMagicProperties(writer, z.magic_attributes, 0, offset, constants);
    let end = Math.ceil(offset / 8);
    writer.SetLength(end).Seek(end);
    process.stdout.write(`Charm bytes: ${writer.toArray()}`);
  });


  it('should read "simple" item', async() => {
    //hp1 from game
    let buffer = new Uint8Array([74,77,16,32,34,0,0,8,0,128,6,23,3,2]);
    let reader = new BinaryReader(buffer).SetLittleEndian();
    let item = await readItem(reader, 0x60, constants, config);
    expect(item.type).to.eq("hp1");
    expect(item.simple_item).to.eq(1);
  });

  it('should write "simple" item', async() => {
    let item = {
      identified: 1,
      socketed: 0,
      new: 1,
      is_ear: 0,
      starter_item: 1,
      simple_item: 1,
      ethereal: 0,
      personalized: 0,
      given_runeword: 0,
      location_id: 2,
      equipped_id: 0,
      position_x: 0,
      position_y: 0,
      alt_position_id: 0,
      type: "hp1",
      type_id: 4,
      nr_of_items_in_sockets: 0,
      version: 0
    } as types.IItem;
    let bytes = await writeItem(item, 0x60, constants, config);
    expect(bytes).to.eql(new Uint8Array([74,77,16,32,162,0,0,8,0,128,6,23,3,2]));
  });

  it('should read item list', async () => {
    //barb starter items; 4 pots, tp, id, hand axe, shield
    let buffer = new Uint8Array([74,77,8,0,74,77,16,32,162,0,101,8,0,128,6,23,3,2,74,77,16,32,162,0,101,8,2,128,6,23,3,2,74,77,16,32,162,0,101,8,4,128,6,23,3,2,74,77,16,32,162,0,101,8,6,128,6,23,3,2,74,77,16,32,162,0,101,0,114,66,55,55,6,2,74,77,16,32,162,0,101,0,82,146,54,55,6,2,74,77,16,32,130,0,101,132,8,128,22,134,7,2,73,10,205,163,128,128,131,195,127,74,77,16,32,130,0,101,164,10,32,86,55,6,2,13,71,163,205,128,224,1,12,12,254,3]);
    let reader = new BinaryReader(buffer).SetLittleEndian();
    let items = await readItems(reader, 0x60, constants, config);
    expect(items.length).to.eq(8);
  });

});