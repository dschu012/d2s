import * as types from './types'
import { readHeader, readHeaderData, writeHeader, writeHeaderData, fixHeader } from './header'
import { readAttributes, writeAttributes } from './attributes'
import { BinaryReader } from '../binary/binaryreader';
import { BinaryWriter } from '../binary/binarywriter';
import { readSkills, writeSkills } from './skills';
import { readCharItems, readCorpseItems, readMercItems, readGolemItems,
  writeCharItems, writeCorpseItem, writeMercItems, writeGolemItems } from './items';
import { enhanceAttributes } from './attribute_enhancer';

const defaultConfig = {
  extendedStash: false
} as types.IConfig;

async function read(buffer: Uint8Array, constants: types.IConstantData, userConfig?: types.IConfig): Promise<types.ID2S> {
  let char = {} as types.ID2S;
  let reader = new BinaryReader(buffer).SetLittleEndian();
  let config =  Object.assign(defaultConfig, userConfig);
  await readHeader(char, reader);
  //could load constants based on version here
  await readHeaderData(char, reader, constants);
  await readAttributes(char, reader, constants);
  await readSkills(char, reader, constants);
  await readCharItems(char, reader, constants, config);
  await readCorpseItems(char, reader, constants, config);
  if(char.header.status.expansion) {
    await readMercItems(char, reader, constants, config);
    await readGolemItems(char, reader, constants, config);
  }
  await enhanceAttributes(char, constants);
  return char;
}

async function write(data: types.ID2S, constants: types.IConstantData, userConfig?: types.IConfig): Promise<Uint8Array> {
  let config =  Object.assign(defaultConfig, userConfig);
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await writeHeader(data));
  //could load constants based on version here
  writer.WriteArray(await writeHeaderData(data, constants));
  writer.WriteArray(await writeAttributes(data, constants));
  writer.WriteArray(await writeSkills(data, constants));
  writer.WriteArray(await writeCharItems(data, constants, config));
  writer.WriteArray(await writeCorpseItem(data, constants, config));
  if(data.header.status.expansion) {
    writer.WriteArray(await writeMercItems(data, constants, config));
    writer.WriteArray(await writeGolemItems(data, constants, config));
  }
  await fixHeader(writer);
  return writer.toArray();
}

export { read, write };