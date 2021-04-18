import * as types from './types'
import { BinaryReader } from '../binary/binaryreader'
import { BinaryWriter } from '../binary/binarywriter'
import { _readBits, _writeBits } from '../util';


export async function readCharItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.items = await readItems(reader, char.header.version, constants, config);
}

export async function writeCharItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await writeItems(char.items, char.header.version, constants, config));
  return writer.toArray();
}

export async function readMercItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.merc_items = [] as types.IItem[];
  let header = reader.ReadString(2);                                           //0x0000 [merc item list header = "jf"]
  if(header !== "jf") {
    throw new Error(`Mercenary header 'jf' not found at position ${reader.Position() - 2}`);
  }
  if(char.header.merc_id && parseInt(char.header.merc_id,16) !== 0) {
    char.merc_items = await readItems(reader, char.header.version, constants, config);
  }
}

export async function writeMercItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("jf");
  if(char.header.merc_id && parseInt(char.header.merc_id,16) !== 0) {
    char.merc_items = char.merc_items || [];
    writer.WriteArray(await writeItems(char.merc_items, char.header.version, constants, config));
  }
  return writer.toArray();
}

export async function readGolemItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  let header = reader.ReadString(2);                                           //0x0000 [golem item list header = "kf"]
  if(header !== "kf") {
    throw new Error(`Golem header 'kf' not found at position ${reader.Position() - 2}`);
  }
  let has_golem = reader.ReadUInt8();
  if(has_golem === 1) {
    char.golem_item = await readItem(reader, char.header.version, constants, config);
  }
}

export async function writeGolemItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("kf");
  if(char.golem_item) {
    writer.WriteUInt8(1);
    writer.WriteArray(await writeItem(char.golem_item, char.header.version, constants, config));
  } else {
    writer.WriteUInt8(0);
  }
  return writer.toArray();
}

export async function readCorpseItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.corpse_items = [] as types.IItem[];
  let header = reader.ReadString(2);                                           //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if(header !== "JM") {
    throw new Error(`Corpse header 'JM' not found at position ${reader.Position() - 2}`);
  }
  char.is_dead = reader.ReadUInt16();                                          //0x0002 [corpse count]
  for(let i = 0; i < char.is_dead; i++) {
    reader.Skip(12);                                                           //0x0004 [unk4, x_pos, y_pos]
    char.corpse_items = char.corpse_items.concat(await readItems(reader, char.header.version, constants, config));
  }
}

export async function writeCorpseItem(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("JM");
  writer.WriteUInt16(char.is_dead);
  //json struct doesnt support multiple corpses without modifying it
  if(char.is_dead) {
    writer.Skip(12);
    char.corpse_items = char.corpse_items || [];
    writer.WriteArray(await writeItems(char.corpse_items, char.header.version, constants, config));
  }
  return writer.toArray();
} 

export async function readItems(reader: BinaryReader, version: number, constants: types.IConstantData, config: types.IConfig) {
  let items = [] as types.IItem[];
  let header = reader.ReadString(2);                                           //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if(header !== "JM") {
    throw new Error(`Item list header 'JM' not found at position ${reader.Position() - 2}`);
  }
  let count = reader.ReadUInt16();                                             //0x0002
  for(let i = 0; i < count; i++) {
    items.push(await readItem(reader, version, constants, config));
  }
  return items;
}

export async function writeItems(items: types.IItem[], version: number, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("JM");
  writer.WriteUInt16(items.length);
  for(let i = 0; i < items.length; i++) {
    writer.WriteArray(await writeItem(items[i], version, constants, config));
  }
  return writer.toArray();
}

export async function readItem(reader: BinaryReader, version: number, constants: types.IConstantData, config: types.IConfig, parent?: types.IItem): Promise<types.IItem> {
  return (await _versionSpecificItem(version)).readItem(reader, constants, config, parent);
}

export async function writeItem(item: types.IItem, version: number, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  return (await _versionSpecificItem(version)).writeItem(item, constants, config);
}

/**
 * Save Version
 * 0x47, 0x0, 0x0, 0x0 = <1.06
 * 0x59, 0x0, 0x0, 0x0 = 1.08 = version
 * 0x5c, 0x0, 0x0, 0x0 = 1.09 = version
 * 0x60, 0x0, 0x0, 0x0 = 1.13c = version
 * */
 function _versionSpecificItem(version: number) {
  switch(version) {
    case 0x60: {
      return import(`./versions/default_item`);
    }
    case 0x61: {
      return import(`./versions/97_item`);
    }
    default: {
      return import(`./versions/default_item`);
    }
  }
}
