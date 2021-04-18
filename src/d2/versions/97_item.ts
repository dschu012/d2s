import * as types from '../types'
import { BinaryReader } from '../../binary/binaryreader'
import { BinaryWriter } from '../../binary/binarywriter'
import { _readBits, _writeBits } from '../../util';
import { _readMagicProperties, _writeMagicProperties } from './default_item';

//TODO
//No JM HEADER

//nokka constants
enum ItemType {
    Armor = 0x01,
    Shield = 0x02, //treated the same as armor... only here to be able to parse nokkas jsons
    Weapon = 0x03,
    Other = 0x04
  }

export function readItem(reader: BinaryReader, constants: types.IConstantData, config: types.IConfig, parent?: types.IItem): types.IItem {
  let start = reader.Position();
  let item = _readSimpleBits(reader, constants, config);
  return item;
}

export function writeItem(item: types.IItem, constants: types.IConstantData, config: types.IConfig): Uint8Array {
  return new Uint8Array(14);
}

function _readSimpleBits(reader: BinaryReader, constants: types.IConstantData, config: types.IConfig): types.IItem {
    let item = {} as types.IItem;
    let start = reader.Position();
    //1.15
    //[flags:32][version:3][mode:3]([invloc:4][x:4][y:4][page:3])([itemcode:32])([sockets:3])
    item.identified = _readBits(reader, start, 4, 1);
    item.socketed = _readBits(reader, start, 11, 1);
    item.new = _readBits(reader, start, 13, 1);
    item.is_ear = _readBits(reader, start, 16, 1);
    item.starter_item = _readBits(reader, start, 17, 1);
    item.simple_item = _readBits(reader, start, 21, 1);
    item.ethereal = _readBits(reader, start, 22, 1); 
    _readBits(reader, start, 23, 1);                        //always 1
    item.personalized = _readBits(reader, start, 24, 1);
    item.given_runeword = _readBits(reader, start, 26, 1);
    let offset = 32;
    item.version = _readBits(reader, start, offset, 3);offset+=3;                        //version
    item.location_id = _readBits(reader, start, offset, 3);offset+=3;
    item.equipped_id = _readBits(reader, start, offset, 4);offset+=4;
    item.position_x = _readBits(reader, start, offset, 4);offset+=4;
    item.position_y = _readBits(reader, start, offset, 4);offset+=4;
    item.alt_position_id = _readBits(reader, start, offset, 3);offset+=3;
    if(item.is_ear) {
      let clazz = _readBits(reader, start, offset, 3);offset+=3;
      let level = _readBits(reader, start, offset, 7);offset+=7;
      let arr = new Uint8Array(15);
      for(let i = 0; i < arr.length; i++) {
        arr[i] = _readBits(reader, start, offset, 7);offset += 7;
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
      item.nr_of_items_in_sockets = _readBits(reader, start, offset, 3);offset+=3;
      let z = 0;
      let arr = new Uint8Array(2);
      do {
        z += _readBits(reader, start, offset, 7);offset += 7;
      } while(_readBits(reader, start, offset, 1) == 1);
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
      //simple items are 14 bytes
      reader.Seek(start + Math.ceil(offset/8));
    }
    return item;
  }