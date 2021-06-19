import * as types from "./types";
import { readHeader, readHeaderData, writeHeader, writeHeaderData, fixHeader } from "./header";
import { readAttributes, writeAttributes } from "./attributes";
import { BitReader } from "../binary/bitreader";
import { BitWriter } from "../binary/bitwriter";
import { readSkills, writeSkills } from "./skills";
import * as items from "./items";
import { enhanceAttributes, enhanceItems } from "./attribute_enhancer";

const defaultConfig = {
  extendedStash: false,
  sortProperties: true,
} as types.IConfig;

function reader(buffer: Uint8Array) {
  return new BitReader(buffer);
}

async function read(buffer: Uint8Array, constants: types.IConstantData, userConfig?: types.IConfig): Promise<types.ID2S> {
  const char = {} as types.ID2S;
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);
  await readHeader(char, reader);
  //could load constants based on version here
  await readHeaderData(char, reader, constants);
  await readAttributes(char, reader, constants);
  await readSkills(char, reader, constants);
  await items.readCharItems(char, reader, constants, config);
  await items.readCorpseItems(char, reader, constants, config);
  if (char.header.status.expansion) {
    await items.readMercItems(char, reader, constants, config);
    await items.readGolemItems(char, reader, constants, config);
  }
  await enhanceAttributes(char, constants, config);
  return char;
}

async function readItem(
  buffer: Uint8Array,
  version: number,
  constants: types.IConstantData,
  userConfig?: types.IConfig
): Promise<types.IItem> {
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);
  const item = await items.readItem(reader, version, constants, config);
  await enhanceItems([item], constants);
  return item;
}

function writer(buffer: Uint8Array) {
  return new BitWriter();
}

async function write(data: types.ID2S, constants: types.IConstantData, userConfig?: types.IConfig): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  writer.WriteArray(await writeHeader(data));
  //could load constants based on version here
  writer.WriteArray(await writeHeaderData(data, constants));
  writer.WriteArray(await writeAttributes(data, constants));
  writer.WriteArray(await writeSkills(data, constants));
  writer.WriteArray(await items.writeCharItems(data, constants, config));
  writer.WriteArray(await items.writeCorpseItem(data, constants, config));
  if (data.header.status.expansion) {
    writer.WriteArray(await items.writeMercItems(data, constants, config));
    writer.WriteArray(await items.writeGolemItems(data, constants, config));
  }
  await fixHeader(writer);
  return writer.ToArray();
}

async function writeItem(
  item: types.IItem,
  version: number,
  constants: types.IConstantData,
  userConfig?: types.IConfig
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  writer.WriteArray(await items.writeItem(item, version, constants, config));
  return writer.ToArray();
}

export { reader, writer, read, write, readItem, writeItem };
