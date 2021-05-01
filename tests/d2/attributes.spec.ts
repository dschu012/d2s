import { expect } from "chai";
import { readAttributes, writeAttributes } from "../../src/d2/attributes";
import * as types from "../../src/d2/types";
import { BinaryReader } from "../../src/binary/binaryreader";
import { BinaryWriter } from "../../src/binary/binarywriter";
import { constants } from "../../src/data/versions/96_constant_data";

describe("attributes", () => {
  it("should read", async () => {
    const d2s = {} as types.ID2S;
    // prettier-ignore
    const buffer = new Uint8Array([103,102,0,60,8,160,128,0,10,6,100,96,0,224,6,28,0,184,1,8,0,20,64,2,0,5,160,0,128,11,44,0,224,2,12,2,255,1]);
    const reader = new BinaryReader(buffer).SetLittleEndian();
    await readAttributes(d2s, reader, constants);
    expect(d2s.attributes.strength).to.eq(30);
  });

  it("should write", async () => {
    const d2s = {} as types.ID2S;
    d2s.attributes = {
      strength: 30,
      energy: 10,
      dexterity: 20,
      vitality: 25,
      current_hp: 55,
      max_hp: 55,
      current_mana: 10,
      max_mana: 10,
      current_stamina: 92,
      max_stamina: 92,
      level: 1,
    } as types.IAttributes;
    const bytes = await writeAttributes(d2s, constants);
    // prettier-ignore
    expect(bytes).to.eql(new Uint8Array([103,102,0,60,8,160,128,0,10,6,100,96,0,224,6,28,0,184,1,8,0,20,64,2,0,5,160,0,128,11,44,0,224,2,12,2,255,1]));
  });
});
