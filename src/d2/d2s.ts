import * as types from './types'
import { readHeader, readHeaderData, writeHeader, writeHeaderData, fixHeader } from './header'
import { readAttributes, writeAttributes } from './attributes'
import { BinaryReader } from '../binary/binaryreader';
import { BinaryWriter } from '../binary/binarywriter';
import { readSkills, writeSkills } from './skills';
import * as items from './items';
import { enhanceAttributes, enhanceItem } from './attribute_enhancer';

const defaultConfig = {
  extendedStash: false
} as types.IConfig;

function reader(buffer: Uint8Array) {
  return new BinaryReader(buffer).SetLittleEndian();
}

async function read(buffer: Uint8Array, constants: types.IConstantData, userConfig?: types.IConfig): Promise<types.ID2S> {
  let char = {} as types.ID2S;
  let reader = new BinaryReader(buffer).SetLittleEndian();
  let config =  Object.assign(defaultConfig, userConfig);
  await readHeader(char, reader);
  //could load constants based on version here
  await readHeaderData(char, reader, constants);
  await readAttributes(char, reader, constants);
  await readSkills(char, reader, constants);
  await items.readCharItems(char, reader, constants, config);
  await items.readCorpseItems(char, reader, constants, config);
  if(char.header.status.expansion) {
    await items.readMercItems(char, reader, constants, config);
    await items.readGolemItems(char, reader, constants, config);
  }
  await enhanceAttributes(char, constants);
  return char;
}

async function readItem(buffer: Uint8Array, constants: types.IConstantData, userConfig?: types.IConfig): Promise<types.IItem> {
  let reader = new BinaryReader(buffer).SetLittleEndian();
  let config =  Object.assign(defaultConfig, userConfig);
  let item =  items.readItem(reader, constants, config);
  await enhanceItem(item, constants);
  return item;
}

function writer(buffer: Uint8Array) {
  return new BinaryWriter().SetLittleEndian();
}

async function write(data: types.ID2S, constants: types.IConstantData, userConfig?: types.IConfig): Promise<Uint8Array> {
  let config =  Object.assign(defaultConfig, userConfig);
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await writeHeader(data));
  //could load constants based on version here
  writer.WriteArray(await writeHeaderData(data, constants));
  writer.WriteArray(await writeAttributes(data, constants));
  writer.WriteArray(await writeSkills(data, constants));
  writer.WriteArray(await items.writeCharItems(data, constants, config));
  writer.WriteArray(await items.writeCorpseItem(data, constants, config));
  if(data.header.status.expansion) {
    writer.WriteArray(await items.writeMercItems(data, constants, config));
    writer.WriteArray(await items.writeGolemItems(data, constants, config));
  }
  await fixHeader(writer);
  return writer.toArray();
}

async function writeItem(item: types.IItem, constants: types.IConstantData, userConfig?: types.IConfig): Promise<Uint8Array> {
  let config =  Object.assign(defaultConfig, userConfig);
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await items.writeItem(item, constants, config));
  return writer.toArray();
}


export { reader, writer, read, write, readItem, writeItem };