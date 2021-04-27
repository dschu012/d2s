import * as types from "./types";
import { BinaryReader } from "../binary/binaryreader";
import { BinaryWriter } from "../binary/binarywriter";
import * as items from "./items";
import { enhanceItems } from "./attribute_enhancer";

const defaultConfig = {
  extendedStash: false,
} as types.IConfig;

export async function read(
  buffer: Uint8Array,
  constants: types.IConstantData,
  version: number,
  userConfig?: types.IConfig
): Promise<types.IStash> {
  let stash = {} as types.IStash;
  let reader = new BinaryReader(buffer).SetLittleEndian();
  let config = Object.assign(defaultConfig, userConfig);
  await readStashHeader(stash, reader);
  //could load constants based on version here
  await readStashPages(stash, reader, version, constants);
  return stash;
}

async function readStashHeader(stash: types.IStash, reader: BinaryReader) {
  let header = reader.ReadString(3);
  if (header !== "SSS") {
    throw new Error(
      `shared stash header 'SSS' not found at position ${reader.Position() - 3}`
    );
  }

  reader.Skip(1); //skip fixed \0 after SSS

  let version = reader.ReadString(2);
  stash.version = version;

  if (version !== "01" && version !== "02") {
    throw new Error(
      `unkown shared stash version ${version} at position ${
        reader.Position() - 2
      }`
    );
  }

  if (version == "02") {
    stash.sharedGold = reader.ReadUInt32();
  }

  stash.pageCount = reader.ReadUInt32();
}

async function readStashPages(
  stash: types.IStash,
  reader: BinaryReader,
  version: number,
  constants: types.IConstantData
) {
  stash.pages = [];
  for (let i = 0; i < stash.pageCount; i++) {
    await readStashPage(stash, reader, version, constants);
  }
}

async function readStashPage(
  stash: types.IStash,
  reader: BinaryReader,
  version: number,
  constants: types.IConstantData
) {
  const page: types.IStashPage = {
    items: [],
    name: "",
    type: 0,
  };
  let header = reader.ReadString(2);
  if (header !== "ST") {
    throw new Error(
      `can not read stash page header ST at position ${reader.Position() - 2}`
    );
  }

  page.type = reader.ReadInt(1);
  reader.Skip(1);
  reader.Skip(1);
  reader.Skip(1);

  page.name = reader.ReadString();
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
  let config = Object.assign(defaultConfig, userConfig);
  let writer = new BinaryWriter().SetLittleEndian();
  writer.WriteArray(await writeStashHeader(data));
  writer.WriteArray(await writeStashPages(data, version, constants, config));
  return writer.toArray();
}

async function writeStashHeader(data: types.IStash): Promise<Uint8Array> {
  let writer = new BinaryWriter();
  writer.WriteStringNullTerminated("SSS");
  writer.WriteString(data.version);
  if (data.version == "02") {
    writer.WriteInt32(data.sharedGold);
  }
  writer.WriteInt32(data.pages.length);
  return writer.toArray();
}

async function writeStashPages(
  data: types.IStash,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  let writer = new BinaryWriter();

  for (let i = 0; i < data.pages.length; i++) {
    writer.WriteArray(
      await writeStashPage(data.pages[i], version, constants, config)
    );
  }

  return writer.toArray();
}

async function writeStashPage(
  data: types.IStashPage,
  version: number,
  constants: types.IConstantData,
  config: types.IConfig
): Promise<Uint8Array> {
  let writer = new BinaryWriter().SetLittleEndian();

  writer.WriteString("ST");
  writer.WriteInt(data.type, 1);
  writer.WriteInt(0, 1);
  writer.WriteInt(0, 1);
  writer.WriteInt(0, 1);

  writer.WriteStringNullTerminated(data.name);
  writer.WriteArray(
    await items.writeItems(data.items, version, constants, config)
  );

  return writer.toArray();
}
