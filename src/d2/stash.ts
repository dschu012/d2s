import * as types from "./types";
import { BitWriter } from "../binary/bitwriter";
import * as items from "./items";
import { enhanceItems } from "./attribute_enhancer";
import { BitReader } from "../binary/bitreader";

const defaultConfig = {
  extendedStash: false,
} as types.IConfig;

export async function read(
  buffer: Uint8Array,
  constants: types.IConstantData,
  version: number,
  userConfig?: types.IConfig
): Promise<types.IStash> {
  const stash = {} as types.IStash;
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);
  await readStashHeader(stash, reader);
  //could load constants based on version here
  await readStashPages(stash, reader, version, constants);
  return stash;
}

async function readStashHeader(stash: types.IStash, reader: BitReader) {
  const header = reader.ReadString(4);
  if (header !== "SSS\0") {
    throw new Error(`shared stash header 'SSS' not found at position ${reader.offset - 3 * 8}`);
  }

  const version = reader.ReadString(2);
  stash.version = version;

  if (version !== "01" && version !== "02") {
    throw new Error(`unkown shared stash version ${version} at position ${reader.offset - 2 * 8}`);
  }

  if (version == "02") {
    stash.sharedGold = reader.ReadUInt32();
  }

  stash.pageCount = reader.ReadUInt32();
}

async function readStashPages(stash: types.IStash, reader: BitReader, version: number, constants: types.IConstantData) {
  stash.pages = [];
  for (let i = 0; i < stash.pageCount; i++) {
    await readStashPage(stash, reader, version, constants);
  }
}

async function readStashPage(stash: types.IStash, reader: BitReader, version: number, constants: types.IConstantData) {
  const page: types.IStashPage = {
    items: [],
    name: "",
    type: 0,
  };
  const header = reader.ReadString(2);
  if (header !== "ST") {
    throw new Error(`can not read stash page header ST at position ${reader.offset - 2 * 8}`);
  }

  page.type = reader.ReadUInt32();

  page.name = reader.ReadNullTerminatedString();
  page.items = await items.readItems(reader, version, constants, defaultConfig);
  enhanceItems(page.items, constants, 1);
  stash.pages.push(page);
}

export async function write(
  data: types.IStash,
  constants: types.IConstantData,
  version: number,
  userConfig?: types.IConfig
): Promise<Uint8Array> {
  const config = Object.assign(defaultConfig, userConfig);
  const writer = new BitWriter();
  writer.WriteArray(await writeStashHeader(data));
  writer.WriteArray(await writeStashPages(data, version, constants, config));
  return writer.ToArray();
}

async function writeStashHeader(data: types.IStash): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString("SSS", 4);
  writer.WriteString(data.version, data.version.length);
  if (data.version == "02") {
    writer.WriteUInt32(data.sharedGold);
  }
  writer.WriteUInt32(data.pages.length);
  return writer.ToArray();
}

async function writeStashPages(
  data: types.IStash,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  const writer = new BitWriter();

  for (let i = 0; i < data.pages.length; i++) {
    writer.WriteArray(await writeStashPage(data.pages[i], version, constants, config));
  }

  return writer.ToArray();
}

async function writeStashPage(
  data: types.IStashPage,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  const writer = new BitWriter();

  writer.WriteString("ST", 2);
  writer.WriteUInt32(data.type);

  writer.WriteString(data.name, data.name.length + 1);
  writer.WriteArray(await items.writeItems(data.items, version, constants, config));

  return writer.ToArray();
}
