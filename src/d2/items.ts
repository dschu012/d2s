import * as types from "./types";
import { BinaryReader } from "../binary/binaryreader";
import { BinaryWriter } from "../binary/binarywriter";
import { _readBits, _writeBits } from "../util";

enum ItemType {
  Armor = 0x01,
  Shield = 0x02, //treated the same as armor... only here to be able to parse nokkas jsons
  Weapon = 0x03,
  Other = 0x04,
}

enum Quality {
  Low = 0x01,
  Normal = 0x02,
  Superior = 0x03,
  Magic = 0x04,
  Set = 0x05,
  Rare = 0x06,
  Unique = 0x07,
  Crafted = 0x08,
}

// prettier-ignore
//huffman tree
const HUFFMAN = [[[[["w","u"],[["8",["y",["5",["j",[]]]]],"h"]],["s",[["2","n"],"x"]]],[[["c",["k","f"]],"b"],[["t","m"],["9","7"]]]],[" ",[[[["e","d"],"p"],["g",[[["z","q"],"3"],["v","6"]]]],[["r","l"],["a",[["1",["4","0"]],["i","o"]]]]]]];
// prettier-ignore
const HUFFMAN_LOOKUP = { "0": { "v": 223, "l": 8 }, "1": { "v": 31, "l": 7 }, "2": { "v": 12, "l": 6 }, "3": { "v": 91, "l": 7 }, "4": { "v": 95, "l": 8 }, "5": { "v": 104, "l": 8 }, "6": { "v": 123, "l": 7 }, "7": { "v": 30, "l": 5 }, "8": { "v": 8, "l": 6 }, "9": { "v": 14, "l": 5 }, " ": { "v": 1, "l": 2 }, "a": { "v": 15, "l": 5 }, "b": { "v": 10, "l": 4 }, "c": { "v": 2, "l": 5 }, "d": { "v": 35, "l": 6 }, "e": { "v": 3, "l": 6 }, "f": { "v": 50, "l": 6 }, "g": { "v": 11, "l": 5 }, "h": { "v": 24, "l": 5 }, "i": { "v": 63, "l": 7 }, "j": { "v": 232, "l": 9 }, "k": { "v": 18, "l": 6 }, "l": { "v": 23, "l": 5 }, "m": { "v": 22, "l": 5 }, "n": { "v": 44, "l": 6 }, "o": { "v": 127, "l": 7 }, "p": { "v": 19, "l": 5 }, "q": { "v": 155, "l": 8 }, "r": { "v": 7, "l": 5 }, "s": { "v": 4, "l": 4 }, "t": { "v": 6, "l": 5 }, "u": { "v": 16, "l": 5 }, "v": { "v": 59, "l": 7 }, "w": { "v": 0, "l": 5 }, "x": { "v": 28, "l": 5 }, "y": { "v": 40, "l": 7 }, "z": { "v": 27, "l": 8 } };

export async function readCharItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.items = await readItems(reader, char.header.version, constants, config);
}

export async function writeCharItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await writeItems(char.items, char.header.version, constants, config));
  return writer.toArray();
}

export async function readMercItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.merc_items = [] as types.IItem[];
  const header = reader.ReadString(2); //0x0000 [merc item list header = "jf"]
  if (header !== "jf") {
    throw new Error(`Mercenary header 'jf' not found at position ${reader.Position() - 2}`);
  }
  if (char.header.merc_id && parseInt(char.header.merc_id, 16) !== 0) {
    char.merc_items = await readItems(reader, char.header.version, constants, config);
  }
}

export async function writeMercItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("jf");
  if (char.header.merc_id && parseInt(char.header.merc_id, 16) !== 0) {
    char.merc_items = char.merc_items || [];
    writer.WriteArray(await writeItems(char.merc_items, char.header.version, constants, config));
  }
  return writer.toArray();
}

export async function readGolemItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  const header = reader.ReadString(2); //0x0000 [golem item list header = "kf"]
  if (header !== "kf") {
    throw new Error(`Golem header 'kf' not found at position ${reader.Position() - 2}`);
  }
  const has_golem = reader.ReadUInt8();
  if (has_golem === 1) {
    char.golem_item = await readItem(reader, char.header.version, constants, config);
  }
}

export async function writeGolemItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("kf");
  if (char.golem_item) {
    writer.WriteUInt8(1);
    writer.WriteArray(await writeItem(char.golem_item, char.header.version, constants, config));
  } else {
    writer.WriteUInt8(0);
  }
  return writer.toArray();
}

export async function readCorpseItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.corpse_items = [] as types.IItem[];
  const header = reader.ReadString(2); //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if (header !== "JM") {
    throw new Error(`Corpse header 'JM' not found at position ${reader.Position() - 2}`);
  }
  char.is_dead = reader.ReadUInt16(); //0x0002 [corpse count]
  for (let i = 0; i < char.is_dead; i++) {
    reader.Skip(12); //0x0004 [unk4, x_pos, y_pos]
    char.corpse_items = char.corpse_items.concat(await readItems(reader, char.header.version, constants, config));
  }
}

export async function writeCorpseItem(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("JM");
  writer.WriteUInt16(char.is_dead);
  //json struct doesnt support multiple corpses without modifying it
  if (char.is_dead) {
    writer.Skip(12);
    char.corpse_items = char.corpse_items || [];
    writer.WriteArray(await writeItems(char.corpse_items, char.header.version, constants, config));
  }
  return writer.toArray();
}

export async function readItems(reader: BinaryReader, version: number, constants: types.IConstantData, config: types.IConfig) {
  const items = [] as types.IItem[];
  const header = reader.ReadString(2); //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if (header !== "JM") {
    throw new Error(`Item list header 'JM' not found at position ${reader.Position() - 2}`);
  }
  const count = reader.ReadUInt16(); //0x0002
  for (let i = 0; i < count; i++) {
    items.push(await readItem(reader, version, constants, config));
  }
  return items;
}

export async function writeItems(
  items: types.IItem[],
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("JM");
  writer.WriteUInt16(items.length);
  for (let i = 0; i < items.length; i++) {
    writer.WriteArray(await writeItem(items[i], version, constants, config));
  }
  return writer.toArray();
}

export async function readItem(
  reader: BinaryReader,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig,
  parent?: types.IItem
): Promise<types.IItem> {
  let rare_name_id = undefined;
  let rare_name_id2 = undefined;
  if (version <= 0x60) {
    const header = reader.ReadString(2); //0x0000 [item header = 0x4a, 0x4d "JM"]
    if (header !== "JM") {
      throw new Error(`Item header 'JM' not found at position ${reader.Position() - 2}`);
    }
  }
  const start = reader.Position();
  const item = {} as types.IItem;
  let offset = _readSimpleBits(item, reader, version, constants, config);
  if (!item.simple_item) {
    item.id = _readBits(reader, start, offset, 32);
    offset += 32;
    item.level = _readBits(reader, start, offset, 7);
    offset += 7;
    item.quality = _readBits(reader, start, offset, 4);
    offset += 4;
    item.multiple_pictures = _readBits(reader, start, offset, 1);
    offset += 1;
    if (item.multiple_pictures) {
      item.picture_id = _readBits(reader, start, offset, 3);
      offset += 3;
    }
    item.class_specific = _readBits(reader, start, offset, 1);
    offset += 1;
    if (item.class_specific) {
      //skip this data
      offset += 11;
    }
    switch (item.quality) {
      case Quality.Low:
        item.low_quality_id = _readBits(reader, start, offset, 3);
        offset += 3;
        break;
      case Quality.Normal:
        break;
      case Quality.Superior:
        offset += 3;
        break;
      case Quality.Magic:
        item.magic_prefix = _readBits(reader, start, offset, 11);
        if (item.magic_prefix)
          item.magic_prefix_name = constants.magic_prefixes[item.magic_prefix] ? constants.magic_prefixes[item.magic_prefix].n : null;
        offset += 11;
        item.magic_suffix = _readBits(reader, start, offset, 11);
        if (item.magic_suffix)
          item.magic_suffix_name = constants.magic_suffixes[item.magic_suffix] ? constants.magic_suffixes[item.magic_suffix].n : null;
        offset += 11;
        break;
      case Quality.Set:
        item.set_id = _readBits(reader, start, offset, 12);
        item.set_name = constants.set_items[item.set_id] ? constants.set_items[item.set_id].n : null;
        offset += 12;
        break;
      case Quality.Unique:
        item.unique_id = _readBits(reader, start, offset, 12);
        item.unique_name = constants.unq_items[item.unique_id] ? constants.unq_items[item.unique_id].n : null;
        offset += 12;
        break;
      case Quality.Rare:
      case Quality.Crafted:
        // eslint-disable-line no-eval
        rare_name_id = _readBits(reader, start, offset, 8);
        offset += 8;
        if (rare_name_id) item.rare_name = constants.rare_names[rare_name_id] ? constants.rare_names[rare_name_id].n : null;
        // eslint-disable-line no-eval
        rare_name_id2 = _readBits(reader, start, offset, 8);
        offset += 8;
        if (rare_name_id2) item.rare_name2 = constants.rare_names[rare_name_id2] ? constants.rare_names[rare_name_id2].n : null;
        item.magical_name_ids = [];
        for (let i = 0; i < 6; i++) {
          const prefix = _readBits(reader, start, offset, 1);
          offset++;
          if (prefix === 1) {
            item.magical_name_ids[i] = _readBits(reader, start, offset, 11);
            offset += 11;
          } else {
            item.magical_name_ids[i] = null;
          }
        }
        break;
      default:
        break;
    }
    if (item.given_runeword) {
      item.runeword_id = _readBits(reader, start, offset, 12);
      //fix delerium on d2gs??? why is this a thing?
      if (item.runeword_id == 2718) {
        item.runeword_id = 48;
      }
      offset += 12;
      item.runeword_name = constants.runewords[item.runeword_id]!.n!;
      offset += 4; //always 5
    }

    if (item.personalized) {
      const arr = new Uint8Array(15);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = _readBits(reader, start, offset, 7);
        offset += 7;
        if (arr[i] === 0x00) {
          break;
        }
      }
      item.personalized_name = new BinaryReader(arr).SetLittleEndian().ReadString(15).trim().replace(/\0/g, "");
    }

    //tomes
    if (item.type === "tbk" || item.type == "ibk") {
      offset += 5;
    }

    item.timestamp = _readBits(reader, start, offset, 1);
    offset += 1;

    if (item.type_id === ItemType.Armor) {
      item.defense_rating = _readBits(reader, start, offset, 11) - 10;
      offset += 11;
    }
    if (item.type_id === ItemType.Armor || item.type_id === ItemType.Weapon) {
      item.max_durability = _readBits(reader, start, offset, 8);
      offset += 8;
      if (item.max_durability > 0) {
        item.current_durability = _readBits(reader, start, offset, 8);
        offset += 8;
        //some random extra bit according to nokka go code...
        offset += 1;
      }
    }

    if (constants.stackables[item.type]) {
      item.quantity = _readBits(reader, start, offset, 9);
      offset += 9;
    }

    if (item.socketed === 1) {
      item.total_nr_of_sockets = _readBits(reader, start, offset, 4);
      offset += 4;
    }

    /**
     * 5 bits. any of the 5 bits can be set. if a bit is set that means
     * means +1 to the set_list_count
     */
    let plist_flag = 0;
    if (item.quality === Quality.Set) {
      plist_flag = _readBits(reader, start, offset, 5);
      item.set_list_count = 0;
      offset += 5;
    }

    //magical properties
    const result = _readMagicProperties(reader, start, offset, constants);
    offset = result.offset;
    if (result.magic_attributes && result.magic_attributes.length > 0) {
      item.magic_attributes = result.magic_attributes;
    }

    while (plist_flag > 0) {
      if (plist_flag & 1) {
        item.set_list_count += 1;
        const result = _readMagicProperties(reader, start, offset, constants);
        offset = result.offset;
        if (item.set_attributes) {
          item.set_attributes.push(result.magic_attributes);
        } else {
          item.set_attributes = [result.magic_attributes];
        }
      }
      plist_flag >>>= 1;
    }

    if (item.given_runeword === 1) {
      const result = _readMagicProperties(reader, start, offset, constants);
      offset = result.offset;
      if (result.magic_attributes && result.magic_attributes.length > 0) {
        item.runeword_attributes = result.magic_attributes;
      }
    }
  }

  reader.Seek(start + Math.ceil(offset / 8));

  if (item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
    item.socketed_items = [];
    for (let i = 0; i < item.nr_of_items_in_sockets; i++) {
      item.socketed_items.push(await readItem(reader, version, constants, config, item));
    }
  }
  //console.log(JSON.stringify(item));
  return item;
}

export async function writeItem(
  item: types.IItem,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  const writer = new BinaryWriter().SetLittleEndian();
  if (version <= 0x60) {
    writer.WriteString("JM");
  }
  const start = writer.Position();
  let offset = _writeSimpleBits(writer, version, item, constants, config);
  if (!item.simple_item) {

      _writeBits(writer, item.id, start, offset, 32); offset+=32;
      _writeBits(writer, item.level, start, offset, 7); offset+=7;
      _writeBits(writer, item.quality, start, offset, 4); offset+=4;
      _writeBits(writer, item.multiple_pictures, start, offset, 1); offset+=1;
      if (item.multiple_pictures) {
          _writeBits(writer, item.picture_id, start, offset, 3);
          offset += 3;
      }
      _writeBits(writer, item.class_specific, start, offset, 1);
      offset += 1;
      if (item.class_specific) {
          offset += 11; //????
      }
      switch (item.quality) {
          case Quality.Low:
              _writeBits(writer, item.low_quality_id, start, offset, 3);
              offset += 3;
              break;
          case Quality.Normal:
              break;
          case Quality.Superior:
              offset += 3;
              break;
          case Quality.Magic:
              _writeBits(writer, item.magic_prefix, start, offset, 11);
              offset += 11;
              _writeBits(writer, item.magic_suffix, start, offset, 11);
              offset += 11;
              break;
          case Quality.Set:
              _writeBits(writer, item.set_id, start, offset, 12);
              offset += 12;
              break;
          case Quality.Unique:
              _writeBits(writer, item.unique_id, start, offset, 12);
              offset += 12;
              break;
          case Quality.Rare:
          case Quality.Crafted:
              _writeBits(writer, _lookupRareId(item.rare_name, constants), start, offset, 8);
              offset += 8;
              _writeBits(writer, _lookupRareId(item.rare_name2, constants), start, offset, 8);
              offset += 8;
              
              for (let i = 0; i < 6; i++) {
                  let magical_name_id = item.magical_name_ids[i];
                  if (magical_name_id) {
                      _writeBits(writer, 1, start, offset, 1);
                      offset++;
                      _writeBits(writer, magical_name_id, start, offset, 11);
                      offset += 11;
                  } else {
                      _writeBits(writer, 0, start, offset, 1);
                      offset++;
                  }
              }
              break;
          default:
              break;
      }

      if (item.given_runeword) {
          //fix delerium on d2gs??? why is this a thing?
          let runeword_id = item.runeword_id;
          if(runeword_id == 2718) {
            runeword_id = 48;
          }
        }
        break;
      default:
        break;
    }

    if (item.given_runeword) {
      //fix delerium on d2gs??? why is this a thing?
      let runeword_id = item.runeword_id;
      if (runeword_id == 2718) {
        runeword_id = 48;
      }
      _writeBits(writer, runeword_id, start, offset, 12);
      offset += 12;
      _writeBits(writer, 5, start, offset, 4); //always 5?
      offset += 4;
    }

    if (item.personalized) {
      const name = item.personalized_name.substring(0, 15);
      for (let i = 0; i < name.length; i++) {
        _writeBits(writer, name.charCodeAt(i) & 0x7f, start, offset, 7);
        offset += 7;
      }
      _writeBits(writer, 0x00, start, offset, 7);
      offset += 7;
    }

    if (item.type === "tbk" || item.type === "ibk") {
      if (item.type === "ibk") {
        _writeBits(writer, 1, start, offset, 5);
      }
      offset += 5;
    }

    _writeBits(writer, item.timestamp, start, offset, 1);
    offset += 1;

    if (item.type_id === ItemType.Armor || item.type_id === ItemType.Shield) {
      _writeBits(writer, item.defense_rating + 10, start, offset, 11);
      offset += 11;
    }

    if (item.type_id === ItemType.Armor || item.type_id === ItemType.Shield || item.type_id === ItemType.Weapon) {
      _writeBits(writer, item.max_durability || 0, start, offset, 8);
      offset += 8;
      if (item.max_durability > 0) {
        _writeBits(writer, item.current_durability, start, offset, 8);
        offset += 8;
        //some random extra bit according to nokka go code...
        offset += 1;
      }
    }

    if (constants.stackables[item.type]) {
      _writeBits(writer, item.quantity, start, offset, 9);
      offset += 9;
    }

    if (item.socketed === 1) {
      _writeBits(writer, item.total_nr_of_sockets, start, offset, 4);
      offset += 4;
    }

    if (item.quality === Quality.Set) {
      const set_attribute_count = item.set_attributes != null ? item.set_attributes.length : 0;
      const plist_flag = (1 << set_attribute_count) - 1;
      _writeBits(writer, plist_flag, start, offset, 5);
      offset += 5;
    }

    offset = _writeMagicProperties(writer, item.magic_attributes, start, offset, constants);
    if (item.set_attributes && item.set_attributes.length > 0) {
      for (let i = 0; i < item.set_attributes.length; i++) {
        offset = _writeMagicProperties(writer, item.set_attributes[i], start, offset, constants);
      }
    }

    if (item.given_runeword === 1) {
      offset = _writeMagicProperties(writer, item.runeword_attributes, start, offset, constants);
    }
  }

  writer.Seek(start + Math.ceil(offset / 8));

  if (item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
    for (let i = 0; i < item.nr_of_items_in_sockets; i++) {
      writer.WriteArray(await writeItem(item.socketed_items[i], version, constants, config));
    }
  }
  return writer.toArray();
}

function _readSimpleBits(
  item: types.IItem,
  reader: BinaryReader,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): number {
  const start = reader.Position();
  //1.10-1.14d
  //[flags:32][version:10][mode:3]([invloc:4][x:4][y:4][page:3])([itemcode:32])([sockets:3])
  //1.15
  //[flags:32][version:3][mode:3]([invloc:4][x:4][y:4][page:3])([itemcode:variable])([sockets:3])
  item.identified = _readBits(reader, start, 4, 1);
  item.socketed = _readBits(reader, start, 11, 1);
  item.new = _readBits(reader, start, 13, 1);
  item.is_ear = _readBits(reader, start, 16, 1);
  item.starter_item = _readBits(reader, start, 17, 1);
  item.simple_item = _readBits(reader, start, 21, 1);
  item.ethereal = _readBits(reader, start, 22, 1);
  _readBits(reader, start, 23, 1); //always 1
  item.personalized = _readBits(reader, start, 24, 1);
  item.given_runeword = _readBits(reader, start, 26, 1);
  let offset = 32;
  if (version <= 0x60) {
    item.version = _readBits(reader, start, offset, 10).toString(10);
    offset += 10; //version
  } else if (version >= 0x61) {
    item.version = _readBits(reader, start, offset, 3).toString(2);
    offset += 3; //version
  }
  item.location_id = _readBits(reader, start, offset, 3);
  offset += 3;
  item.equipped_id = _readBits(reader, start, offset, 4);
  offset += 4;
  item.position_x = _readBits(reader, start, offset, 4);
  offset += 4;
  item.position_y = _readBits(reader, start, offset, 4);
  offset += 4;
  item.alt_position_id = _readBits(reader, start, offset, 3);
  offset += 3;
  if (item.is_ear) {
    const clazz = _readBits(reader, start, offset, 3);
    offset += 3;
    const level = _readBits(reader, start, offset, 7);
    offset += 7;
    const arr = new Uint8Array(15);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = _readBits(reader, start, offset, 7);
      offset += 7;
      if (arr[i] === 0x00) {
        break;
      }
    }
    const name = new BinaryReader(arr).SetLittleEndian().ReadString(15).trim().replace(/\0/g, "");
    item.ear_attributes = {
      class: clazz,
      level: level,
      name: name,
    } as types.IEarAttributes;
  } else {
    if (version <= 0x60) {
      const arr = new Uint8Array(4);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = _readBits(reader, start, offset, 8);
        offset += 8;
      }
      item.type = new BinaryReader(arr).SetLittleEndian().ReadString(4);
    } else if (version >= 0x61) {
      item.type = "";
      //props to d07riv
      //https://github.com/d07RiV/d07riv.github.io/blob/master/d2r.html#L11-L20
      for (let i = 0; i < 4; i++) {
        let node = HUFFMAN as any;
        do {
          node = node[_readBits(reader, start, offset, 1)];
          offset += 1;
        } while (Array.isArray(node));
        item.type += node;
      }
    }
    item.type = item.type.trim().replace(/\0/g, "");
    if (constants.armor_items[item.type]) {
      item.type_id = ItemType.Armor;
      const details = constants.armor_items[item.type];
      item.type_name = details!.n;
    } else if (constants.weapon_items[item.type]) {
      item.type_id = ItemType.Weapon;
      const details = constants.weapon_items[item.type];
      item.type_name = details!.n;
    } else if (constants.other_items[item.type]) {
      item.type_id = ItemType.Other;
      item.type_name = constants.other_items[item.type]!.n;
    }
    const l = item.simple_item ? 1 : 3;
    item.nr_of_items_in_sockets = _readBits(reader, start, offset, l);
    offset += l;
  }
  return offset;
}

function _lookupRareId(name: string, constants: types.IConstantData): number {
  //some inconsistencies with txt data and nokka. so have to hack it with startsWith
  return constants.rare_names.findIndex(
    (k) => k && (k.n.toLowerCase().startsWith(name.toLowerCase()) || name.toLowerCase().startsWith(k.n.toLowerCase()))
  );
}

function _writeSimpleBits(
  writer: BinaryWriter,
  version: number,
  item: types.IItem,
  constants: types.IConstantData,
  config: types.IConfig
): number {
  const start = writer.Position();
  _writeBits(writer, item.identified, start, 4, 1);
  _writeBits(writer, item.socketed, start, 11, 1);
  _writeBits(writer, item.new, start, 13, 1);
  _writeBits(writer, item.is_ear, start, 16, 1);
  _writeBits(writer, item.starter_item, start, 17, 1);
  _writeBits(writer, item.simple_item, start, 21, 1);
  _writeBits(writer, item.ethereal, start, 22, 1);
  _writeBits(writer, 1, start, 23, 1); //always 1
  _writeBits(writer, item.personalized, start, 24, 1);
  _writeBits(writer, item.given_runeword, start, 26, 1);
  let offset = 32;
  const itemVersion = item.version != null ? item.version : "101";
  if (version <= 0x60) {
    _writeBits(writer, parseInt(itemVersion, 10), start, offset, 10);
    offset += 10; // 0 = pre-1.08; 1 = 1.08/1.09 normal; 2 = 1.10 normal; 100 = 1.08/1.09 expansion; 101 = 1.10 expansion
  } else if (version >= 0x61) {
    _writeBits(writer, parseInt(itemVersion, 2), start, offset, 3);
    offset += 3; // 0 = pre-1.08; 1 = 1.08/1.09 normal; 2 = 1.10 normal; 100 = 1.08/1.09 expansion; 101 = 1.10 expansion
  }
  _writeBits(writer, item.location_id, start, offset, 3);
  offset += 3;
  _writeBits(writer, item.equipped_id, start, offset, 4);
  offset += 4;
  _writeBits(writer, item.position_x, start, offset, 4);
  offset += 4;
  _writeBits(writer, item.position_y, start, offset, 4);
  offset += 4;
  _writeBits(writer, item.alt_position_id, start, offset, 3);
  offset += 3;
  if (item.is_ear) {
    _writeBits(writer, item.ear_attributes.class, start, offset, 3);
    offset += 3;
    _writeBits(writer, item.ear_attributes.level, start, offset, 7);
    offset += 7;
    const name = item.ear_attributes.name.substring(0, 15);
    for (let i = 0; i < name.length; i++) {
      _writeBits(writer, name.charCodeAt(i) & 0x7f, start, offset, 7);
      offset += 7;
    }
    _writeBits(writer, 0x00, start, offset, 7);
    offset += 7;
  } else {
    const t = item.type.padEnd(4, " ");
    if (version <= 0x60) {
      const type = new BinaryWriter(4).SetLittleEndian().WriteString(t).toArray();
      _writeBits(writer, type, start, offset, 32);
      offset += 32;
    } else {
      for (const c of t) {
        const n = HUFFMAN_LOOKUP[c];
        _writeBits(writer, n.v, start, offset, n.l);
        offset += n.l;
      }
    }
    const l = item.simple_item ? 1 : 3;
    _writeBits(writer, item.nr_of_items_in_sockets, start, offset, l);
    offset += l;
  }
  return offset;
}

export function _readMagicProperties(reader: BinaryReader, start: number, offset: number, constants: types.IConstantData) {
  let id = _readBits(reader, start, offset, 9);
  offset += 9;
  const magic_attributes = [];
  while (id != 0x1ff) {
      let values = [];
      let num_of_properties = constants.magical_properties[id].np || 1;
      for (let i = 0; i < num_of_properties; i++) {
          let prop = constants.magical_properties[id + i];
          if (prop == null) {
              throw new Error(`Cannot find Magical Property for id: ${id} at position ${start + offset}`);
          }
          if (prop.sP) {
              let param = _readBits(reader, start, offset, prop.sP);
              offset += prop.sP;
              switch (prop.dF) {
                  case 14: //+skill to skilltab
                      values.push(param & 0x7);
                      param = (param >> 3) & 0x1fff;
                      break;
                  default:
                      break;
              }
              //encode
              switch (prop.e) {
                  case 1:
                      //throw new Error(`Unimplemented encoding: ${prop.encode}`);
                      break;
                  case 2: //chance to cast
                  case 3: //charges
                      values.push(param & 0x3f);          //skill level
                      param = (param >> 6) & 0x3ff;  //skll id
                      break;
                  default:
                      break;
              }
              values.push(param);
          }
          if (!prop.sB) {
              throw new Error(`Save Bits is undefined for stat: ${id}:${prop.s} at position ${start + offset}`);
          }
          let v = _readBits(reader, start, offset, prop.sB);
          offset += prop.sB;
          if (prop.sA) {
              v -= prop.sA;
          }
          switch (prop.e) {
              case 3:
                  values.push(v & 0xff);  // current charges
                  values.push((v >> 8) & 0xff);  //max charges
                  break;
              default:
                  values.push(v);
                  break;
          }
      }
    }
    magic_attributes.push({
      id: id,
      values: values,
      name: constants.magical_properties[id].s,
    } as types.IMagicProperty);
    id = _readBits(reader, start, offset, 9);
    offset += 9;
  }
  return { offset: offset, magic_attributes: magic_attributes };
}

export function _writeMagicProperties(
  writer: BinaryWriter,
  properties: types.IMagicProperty[],
  start: number,
  offset: number,
  constants: types.IConstantData
): number {
  if (properties) {
      for (let i = 0; i < properties.length; i++) {
        let property = properties[i];
        let valueIdx = 0;
          _writeBits(writer, property.id, start, offset, 9);
          offset += 9;
          let num_of_properties = constants.magical_properties[property!.id].np || 1;
          for (let j = 0; j < num_of_properties; j++) {
              let prop = constants.magical_properties[property!.id + j];
              if (prop == null) {
                  throw new Error(`Cannot find Magical Property for id: ${property.id}`);
              }
              if (prop.sP) {
                  let param = property.values[valueIdx++]!;
                  switch (prop.dF) {
                      case 14: //+skill to skilltab
                          param |= (property.values[valueIdx++]! & 0x1fff) << 3;
                          break;
                      default:
                          break;
                  }
                  //encode
                  switch (prop.e) {
                      case 1:
                          //throw new Error(`Unimplemented encoding: ${prop.encode}`);
                          break;
                      case 2: //chance to cast
                      case 3: //charges
                          param |= (property.values[valueIdx++]! & 0x3ff) << 6;
                          break;
                      default:
                          break;
                  }
                  _writeBits(writer, param, start, offset, prop.sP);
                  offset += prop.sP;
              }
              let v = property.values[valueIdx++]!;
              if (prop.sA) {
                  v += prop.sA;
              }
              switch (prop.e) {
                  case 3:
                      v |= (property.values[valueIdx++]! & 0xff) << 8;
                      break;
                  default:
                      break;
              }
              if (!prop.sB) {
                  throw new Error(`Save Bits is undefined for stat: ${property.id}:${prop.s}`);
              }
              _writeBits(writer, v, start, offset, prop.sB);
              offset += prop.sB;

      }
    }
  }
  _writeBits(writer, 0x1ff, start, offset, 9);
  offset += 9;
  return offset;
}
