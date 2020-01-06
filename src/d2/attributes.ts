import * as types from './types';
import { _readBits, _writeBits } from '../util';
import { BinaryReader } from '../binary/binaryreader';
import { BinaryWriter } from '../binary/binarywriter';

//todo use constants.magical_properties and csvBits
export async function readAttributes(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData) {
  char.attributes = {} as types.IAttributes;
  let header = reader.ReadString(2);                                           //0x0000 [attributes header = 0x67, 0x66 "gf"]
  if(header != "gf") {
    throw new Error(`Item header 'gf' not found at position ${reader.Position() - 2}`);
  }
  let start = reader.Position();
  let bitoffset = 0;
  let id = _readBits(reader, start, bitoffset, 9);
  //read till 0x1ff end of attributes is found
  while(id != 0x1ff) {
    bitoffset += 9;
    let field = constants.magical_properties[id];
    if(field === undefined) {
      throw new Error(`Invalid attribute id: ${id}`)
    }
    let size = field.cB;
    char.attributes[Attributes[field.s]] = _readBits(reader, start, bitoffset, size);
    //current_hp - max_stamina need to be bit shifted
    if(id >= 6 && id <= 11) {
      char.attributes[Attributes[field.s]] >>>= 8;
    }
    bitoffset += size;
    id = _readBits(reader, start, bitoffset, 9);
  }
}

export async function writeAttributes(char: types.ID2S, constants: types.IConstantData): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("gf");                                                    //0x0000 [attributes header = 0x67, 0x66 "gf"]
  let start = writer.Position();
  let bitoffset = 0;
  for(let i = 0; i < 16; i++) {
    let property = constants.magical_properties[i];
    if(property === undefined) {
      throw new Error(`Invalid attribute: ${property}`)
    }
    let value = char.attributes[Attributes[property.s]];
    let size = property.cB;
    if(i >= 6 && i <= 11) {
      value <<= 8;
    }
    _writeBits(writer, i, start, bitoffset, 9);
    bitoffset += 9;
    _writeBits(writer, value, start, bitoffset, size);
    bitoffset += size;
  }
  _writeBits(writer, 0x1ff, start, bitoffset, 9);
  return writer.toArray();
}

//nokkas names
const Attributes = {
  "strength": "strength",
  "energy": "energy",
  "dexterity": "dexterity",
  "vitality": "vitality",
  "statpts": "unused_stats",
  "newskills": "unused_skill_points",
  "hitpoints": "current_hp",
  "maxhp": "max_hp",
  "mana": "current_mana",
  "maxmana": "max_mana",
  "stamina": "current_stamina",
  "maxstamina": "max_stamina",
  "level": "level",
  "experience": "experience",
  "gold": "gold",
  "goldbank": "stashed_gold",
}