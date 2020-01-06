import * as types from './types'
import { BinaryReader } from '../binary/binaryreader'
import { BinaryWriter } from '../binary/binarywriter'
import { _readBits, _writeBits } from '../util';

//nokka constants
enum ItemType {
  Armor = 0x01,
  Shield = 0x02, //treated the same as armor... only here to be able to parse nokkas jsons
  Weapon = 0x03,
  Other = 0x04
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

export async function readCharItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.items = readItems(reader, constants, config);
}

export async function writeCharItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(writeItems(char.items, constants, config));
  return writer.toArray();
}

export async function readMercItems(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  char.merc_items = [] as types.IItem[];
  let header = reader.ReadString(2);                                           //0x0000 [merc item list header = "jf"]
  if(header !== "jf") {
    throw new Error(`Mercenary header 'jf' not found at position ${reader.Position() - 2}`);
  }
  if(char.header.merc_id && parseInt(char.header.merc_id,16) !== 0) {
    char.merc_items = readItems(reader, constants, config);
  }
}

export async function writeMercItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("jf");
  if(char.header.merc_id && parseInt(char.header.merc_id,16) !== 0) {
    char.merc_items = char.merc_items || [];
    writer.WriteArray(writeItems(char.merc_items, constants, config));
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
    char.golem_item = readItem(reader, constants, config);
  }
}

export async function writeGolemItems(char: types.ID2S, constants: types.IConstantData, config: types.IConfig): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("kf");
  if(char.golem_item) {
    writer.WriteUInt8(1);
    writer.WriteArray(writeItem(char.golem_item, constants, config));
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
    char.corpse_items = char.corpse_items.concat(readItems(reader, constants, config));
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
    writer.WriteArray(writeItems(char.corpse_items, constants, config));
  }
  return writer.toArray();
} 

export function readItems(reader: BinaryReader, constants: types.IConstantData, config: types.IConfig) {
  let items = [] as types.IItem[];
  let header = reader.ReadString(2);                                           //0x0000 [item list header = 0x4a, 0x4d "JM"]
  if(header !== "JM") {
    throw new Error(`Item list header 'JM' not found at position ${reader.Position() - 2}`);
  }
  let count = reader.ReadUInt16();                                             //0x0002
  for(let i = 0; i < count; i++) {
    items.push(readItem(reader, constants, config));
  }
  return items;
}

export function writeItems(items: types.IItem[], constants: types.IConstantData, config: types.IConfig): Uint8Array {
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteString("JM");
  writer.WriteUInt16(items.length);
  for(let i = 0; i < items.length; i++) {
    writer.WriteArray(writeItem(items[i], constants, config));
  }
  return writer.toArray();
}

export function readItem(reader: BinaryReader, constants: types.IConstantData, config: types.IConfig, parent?: types.IItem): types.IItem {
  let start = reader.Position();
  let item = _readSimpleBits(reader, constants, config);
  if(!item.simple_item) {
    item.id = _readBits(reader, start, 111, 32);
    item.level = _readBits(reader, start, 143, 7);
    item.quality = _readBits(reader, start, 150, 4);
    item.multiple_pictures = _readBits(reader, start, 154, 1);
    let offset = 155;
    if(item.multiple_pictures) {
      item.picture_id = _readBits(reader, start, offset, 3);
      offset += 3;
    }
    item.class_specific = _readBits(reader, start, offset, 1);
    offset+=1;
    if(item.class_specific) {
      //skip this data
      offset+=11;

    }
    switch(item.quality) {
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
        if(item.magic_prefix) item.magic_prefix_name = constants.magic_prefixes[item.magic_prefix] ? constants.magic_prefixes[item.magic_prefix].n : null;
        offset += 11;
        item.magic_suffix = _readBits(reader, start, offset, 11);
        if(item.magic_suffix) item.magic_suffix_name = constants.magic_suffixes[item.magic_suffix] ? constants.magic_suffixes[item.magic_suffix].n : null;
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
        let rare_name_id = _readBits(reader, start, offset, 8);
        offset += 8;
        if(rare_name_id) item.rare_name = constants.rare_names[rare_name_id] ? constants.rare_names[rare_name_id].n : null;
        let rare_name_id2 = _readBits(reader, start, offset, 8);
        offset += 8;
        if(rare_name_id2) item.rare_name2 = constants.rare_names[rare_name_id2] ? constants.rare_names[rare_name_id2].n : null;
        item.magical_name_ids = [];
        for(let i = 0 ; i < 6; i++) {
          let prefix = _readBits(reader, start, offset, 1);
          offset++;
          if(prefix === 1) {
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
    if(item.given_runeword) {
      item.runeword_id = _readBits(reader, start, offset, 12);
      offset += 12;
      item.runeword_name = constants.runewords[item.runeword_id]!.n!;
      offset += 4; //always 5
    }

    if(item.personalized) {
      var arr = new Uint8Array(15);
      for(let i = 0; i < arr.length; i++) {
        arr[i] = _readBits(reader, start, offset, 7);
        offset += 7;
        if(arr[i] === 0x00) {
          break;
        }
      }
      item.personalized_name = new BinaryReader(arr).SetLittleEndian()
        .ReadString(15).trim().replace(/\0/g, '');
    }

    //tomes
    if(item.type === "tbk" || item.type == "ibk") {
      offset += 5;
    }

    item.timestamp = _readBits(reader, start, offset, 1);
    offset += 1;

    if(item.type_id === ItemType.Armor) {
      item.defense_rating = _readBits(reader, start, offset, 11) - 10;
      offset += 11;
    }
    if(item.type_id === ItemType.Armor || item.type_id === ItemType.Weapon) {
      item.max_durability = _readBits(reader, start, offset, 8);
      offset += 8;
      if(item.max_durability > 0) {
        item.current_durability = _readBits(reader, start, offset, 8);
        offset += 8;
        //some random extra bit according to nokka go code...
        offset += 1;
      }
    }

    if(constants.stackables[item.type]) {
      item.quantity = _readBits(reader, start, offset, 9);
      offset += 9;
    }

    if(item.socketed === 1) {
      item.total_nr_of_sockets = _readBits(reader, start, offset, 4);
      offset += 4;
    }

    /**
     * 5 bits. any of the 5 bits can be set. if a bit is set that means
     * means +1 to the set_list_count
     */
    let plist_flag = 0;
    if(item.quality === Quality.Set) {
      plist_flag = _readBits(reader, start, offset, 5);
      item.set_list_count = 0;
      offset += 5;
    }

    //magical properties
    let result = _readMagicProperties(reader, start, offset, constants);
    offset = result.offset;
    if(result.magic_attributes && result.magic_attributes.length > 0) {
      item.magic_attributes = result.magic_attributes;
    }

    while(plist_flag > 0) {
      if(plist_flag & 1) {
        item.set_list_count += 1;
        let result = _readMagicProperties(reader, start, offset, constants);
        offset = result.offset;
        if(item.set_attributes) {
          item.set_attributes.push(result.magic_attributes);
        } else {
          item.set_attributes = [result.magic_attributes]
        }
      }
      plist_flag >>>= 1;
    }

    if(item.given_runeword === 1) {
      let result = _readMagicProperties(reader, start, offset, constants);
      offset = result.offset;
      if(result.magic_attributes && result.magic_attributes.length > 0) {
        item.runeword_attributes = result.magic_attributes;
      }
    }
    //align it at the right byte not sure if this is 100% necassary...
    reader.Seek(start + Math.ceil(offset / 8));
  }

  if(item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
    item.socketed_items = [];
    for(let i = 0; i < item.nr_of_items_in_sockets; i++) {
      item.socketed_items.push(readItem(reader, constants, config, item));
    }
  }
  //console.log(JSON.stringify(item));
  return item;
}


export function writeItem(item: types.IItem, constants: types.IConstantData, config: types.IConfig): Uint8Array {
  //simple are 14 bytes. if we need more writer will expands itself.
  let writer = new BinaryWriter(14).SetLittleEndian();
  var start = writer.Position();
  _writeSimpleBits(writer, item, constants, config);
  if(!item.simple_item) {
    _writeBits(writer, item.id, start, 111, 32);
    _writeBits(writer, item.level, start, 143, 7);
    _writeBits(writer, item.quality, start, 150, 4);
    _writeBits(writer, item.multiple_pictures, start, 154, 1);
    let offset = 155;
    if(item.multiple_pictures) {
      _writeBits(writer, item.picture_id, start, offset, 3);
      offset += 3;
    }
    _writeBits(writer, item.class_specific, start, offset, 1);
    offset += 1;
    if(item.class_specific) {
      offset += 11; //????
    }
    switch(item.quality) {
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
        item.magical_name_ids = [];
        for(let i = 0 ; i < 6; i++) {
          let magical_name_id = item.magical_name_ids[i];
          if(magical_name_id) {
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

    if(item.given_runeword) {
      _writeBits(writer, item.runeword_id, start, offset, 12);
      offset += 12;
      _writeBits(writer, 5, start, offset, 4); //always 5?
      offset += 4;
    }

    if(item.personalized) {
      let name = item.personalized_name.substring(0, 15);
      for(let i = 0; i < name.length; i++) {
        _writeBits(writer, name.charCodeAt(i) & 0x7f, start, offset, 7);
        offset += 7;
      }
      _writeBits(writer, 0x00, start, offset, 7);
      offset += 7;
    }

    if(item.type === "tbk" || item.type === "ibk") {
      if(item.type === "ibk") {
        _writeBits(writer, 1, start, offset, 5);
      }
      offset += 5;
    }

    _writeBits(writer, item.timestamp, start, offset, 1);
    offset += 1;

    if(item.type_id === ItemType.Armor || item.type_id === ItemType.Shield) {
      _writeBits(writer, item.defense_rating + 10, start, offset, 11);
      offset += 11;
    }

    if(item.type_id === ItemType.Armor || item.type_id === ItemType.Shield || item.type_id === ItemType.Weapon) {
      _writeBits(writer, item.max_durability || 0, start, offset, 8);
      offset += 8;
      if(item.max_durability > 0) {
        _writeBits(writer, item.current_durability, start, offset, 8);
        offset += 8;
        //some random extra bit according to nokka go code...
        offset += 1;
      }
    }

    if(constants.stackables[item.type]) {
      _writeBits(writer, item.quantity, start, offset, 9);
      offset += 9;
    }

    if(item.socketed === 1) {
      _writeBits(writer, item.total_nr_of_sockets, start, offset, 4);
      offset += 4;
    }

    if(item.quality === Quality.Set) {
      let set_attribute_count = item.set_attributes != null ? item.set_attributes.length : 0;
      let plist_flag = (1 << set_attribute_count) - 1; 
      _writeBits(writer, plist_flag, start, offset, 5);
      offset += 5;
    }

    offset = _writeMagicProperties(writer, item.magic_attributes, start, offset, constants);
    if(item.set_attributes && item.set_attributes.length > 0) {
      for(let i = 0; i < item.set_attributes.length; i++) {
        offset = _writeMagicProperties(writer, item.set_attributes[i], start, offset, constants);
      }
    }

    if(item.given_runeword === 1) {
      offset = _writeMagicProperties(writer, item.runeword_attributes, start, offset, constants);
    }
    let end = start + Math.ceil(offset / 8);
    writer.SetLength(end).Seek(end);
  }
  if(item.nr_of_items_in_sockets > 0 && item.simple_item === 0) {
    for(let i = 0; i < item.nr_of_items_in_sockets; i++) {
      writer.WriteArray(writeItem(item.socketed_items[i], constants, config));
    }
  }
  return writer.toArray();
}

function _lookupRareId(name: string, constants: types.IConstantData): number {
  //some inconsistencies with txt data and nokka. so have to hack it with startsWith
  return constants.rare_names.findIndex(k =>
      k && (k.n.toLowerCase().startsWith(name.toLowerCase())
        || name.toLowerCase().startsWith(k.n.toLowerCase())));
}

function _readSimpleBits(reader: BinaryReader, constants: types.IConstantData, config: types.IConfig): types.IItem {
  let item = {} as types.IItem;
  let start = reader.Position();
  let header = reader.ReadString(2);                                           //0x0000 [item header = 0x4a, 0x4d "JM"]
  if(header !== "JM") {
    throw new Error(`Item header 'JM' not found at position ${reader.Position() - 2}`);
  }
  item.identified = _readBits(reader, start, 20, 1);
  item.socketed = _readBits(reader, start, 27, 1);
  item.new = _readBits(reader, start, 29, 1);
  item.is_ear = _readBits(reader, start, 32, 1);
  item.starter_item = _readBits(reader, start, 33, 1);
  item.simple_item = _readBits(reader, start, 37, 1);
  item.ethereal = _readBits(reader, start, 38, 1); 
  item.personalized = _readBits(reader, start, 40, 1);
  item.given_runeword = _readBits(reader, start, 42, 1);
  item.location_id = _readBits(reader, start, 58, 3);
  item.equipped_id = _readBits(reader, start, 61, 4);
  item.position_x = _readBits(reader, start, 65, 4);
  item.position_y = _readBits(reader, start, 69, config.extendedStash ? 4 : 3);
  item.alt_position_id = _readBits(reader, start, 73, 3);
  if(item.is_ear) {
    let clazz = _readBits(reader, start, 76, 3);
    let level = _readBits(reader, start, 79, 7);
    let offset = 86;
    var arr = new Uint8Array(15);
    for(let i = 0; i < arr.length; i++) {
      arr[i] = _readBits(reader, start, offset, 7);
      offset += 7;
      if(arr[i] === 0x00) {
        break;
      }
    }
    let name = new BinaryReader(arr).SetLittleEndian()
      .ReadString(15).trim().replace(/\0/g, '');
    item.ear_attributes = {
      class: clazz,
      level: level,
      name: name
    } as types.IEarAttributes;
  } else {
    var arr = new Uint8Array(4);
    for(let i = 0; i < arr.length; i++) {
      arr[i] = _readBits(reader, start, 76 + (i * 8), 8);
    }
    item.type = new BinaryReader(arr).SetLittleEndian()
      .ReadString(4).trim().replace(/\0/g, '');
    if(constants.armor_items[item.type]) {
      item.type_id = ItemType.Armor;
      let details = constants.armor_items[item.type];
      item.type_name = details!.n;
    } else if(constants.weapon_items[item.type]) {
      item.type_id = ItemType.Weapon;
      let details = constants.weapon_items[item.type];
      item.type_name = details!.n;
    } else if(constants.other_items[item.type]) {
      item.type_id = ItemType.Other;
      item.type_name = constants.other_items[item.type]!.n;
    }

    item.nr_of_items_in_sockets = _readBits(reader, start, 108, 3);
    //simple items are 14 bytes
    reader.Seek(start + 14);
  }
  return item;
}

function _writeSimpleBits(writer: BinaryWriter, item: types.IItem, constants: types.IConstantData, config: types.IConfig) {
  var start = writer.Position();
  writer.WriteString("JM");
  _writeBits(writer, item.identified, start, 20, 1);
  _writeBits(writer, item.socketed, start, 27, 1);
  _writeBits(writer, item.new, start, 29, 1);
  _writeBits(writer, item.is_ear, start, 32, 1);
  _writeBits(writer, item.starter_item, start, 33, 1);
  _writeBits(writer, item.simple_item, start, 37, 1);
  _writeBits(writer, item.ethereal, start, 38, 1);
  _writeBits(writer, item.personalized, start, 40, 1);
  _writeBits(writer, item.given_runeword, start, 42, 1);
  _writeBits(writer, item.location_id, start, 58, 3);
  _writeBits(writer, item.equipped_id, start, 61, 4);
  _writeBits(writer, item.position_x, start, 65, 4);
  _writeBits(writer, item.position_y, start, 69, config.extendedStash ? 4 : 3);
  _writeBits(writer, item.alt_position_id, start, 73, 3);
  if(item.is_ear) {
    _writeBits(writer, item.ear_attributes.class, start, 76, 3);
    _writeBits(writer, item.ear_attributes.level, start, 79, 7);
    let offset = 86;
    let name = item.ear_attributes.name.substring(0, 15);
    for(let i = 0; i < name.length; i++) {
      _writeBits(writer, name.charCodeAt(i) & 0x7f, start, offset, 7);
      offset += 7;
    }
    _writeBits(writer, 0x00, start, offset, 7);
  } else {
    let type = new BinaryWriter(4).SetLittleEndian()
      .WriteString(item.type.padEnd(4, " "))
      .toArray();
    _writeBits(writer, type, start, 76, 4);
    _writeBits(writer, item.nr_of_items_in_sockets, start, 108, 3);
    writer.SetLength(start + 14);
  }
}

function _readMagicProperties(reader: BinaryReader, start: number, offset: number, constants: types.IConstantData) {
  let id = _readBits(reader, start, offset, 9);
  offset += 9;
  let magic_attributes = [];
  while(id != 0x1ff) {
    let values = [];
    let num_of_properties = constants.magical_properties[id].np || 1;
    for(let i = 0; i < num_of_properties; i++) {
      let prop = constants.magical_properties[id+i];
      if(prop == null) {
        throw new Error(`Cannot find Magical Property for id: ${id} at position ${start + offset}`);
      }
      if(prop.sP) {
        let param = _readBits(reader, start, offset, prop.sP);
        offset += prop.sP;
        switch(prop.dF) {
          case 14: //+skill to skilltab
            values.push(param & 0x7);
            param = (param >> 3) & 0x1fff;
            break;
          default:
            break;
        }
        //encode
        switch(prop.e) {
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
      if(!prop.sB) {
        throw new Error(`Save Bits is undefined for stat: ${id}:${prop.s} at position ${start + offset}`);
      }
      let v = _readBits(reader, start, offset, prop.sB);
      offset += prop.sB;
      if(prop.sA) {
        v -= prop.sA;
      }
      switch(prop.e) {
        case 3:
          values.push((v >> 8) & 0xff);  //charges
          values.push(v & 0xff);  //charges
          break;
        default:
          values.push(v);
          break;
      }
    }
    magic_attributes.push({
      id: id,
      values: values,
      name: constants.magical_properties[id].s
    } as types.IMagicProperty)
    id = _readBits(reader, start, offset, 9);
    offset += 9;
  }
  return { offset: offset, magic_attributes: magic_attributes };
}

function _writeMagicProperties(writer: BinaryWriter, properties: types.IMagicProperty[],  start: number, offset: number, constants: types.IConstantData): number {
  if(properties) {
    for(let i = 0; i < properties.length; i++) {
      let property = properties[i];
      _writeBits(writer, property.id, start, offset, 9);
      offset += 9;
      let num_of_properties = constants.magical_properties[property!.id].np || 1;
      for(let j = 0; j < num_of_properties; j++) {
        let prop = constants.magical_properties[property!.id + j];
        if(prop == null) {
          throw new Error(`Cannot find Magical Property for id: ${property.id}`);
        }
        if(prop.sP) {
          let param = property.values.shift()!;
          switch(prop.dF) {
            case 14: //+skill to skilltab
                param |= (property.values.shift()! & 0x1fff) << 3;
              break;
            default:
              break;
          }
          //encode
          switch(prop.e) {
            case 1:
              //throw new Error(`Unimplemented encoding: ${prop.encode}`);
              break;
            case 2: //chance to cast
            case 3: //charges
              param |= (property.values.shift()! & 0x3ff) << 6;
              break;
            default:
              break;
          }
          _writeBits(writer, param, start, offset, prop.sP);
          offset += prop.sP;
        }
        let v = property.values.shift()!;
        if(prop.sA) {
          v +=  prop.sA;
        }
        switch(prop.e) {
          case 3:
            v |= (property.values.shift()! & 0xff) << 8;
            break;
          default:
            break;
        }
        if(!prop.sB) {
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