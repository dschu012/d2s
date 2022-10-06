import * as types from "./types";
import { BitWriter } from "../binary/bitwriter";
import * as items from "./items";
import { enhanceItems } from "./attribute_enhancer";
import { BitReader } from "../binary/bitreader";
import { config } from "chai";

const defaultConfig = {
  extendedStash: false,
} as types.IConfig;

export async function read(
  buffer: Uint8Array,
  constants?: types.IConstantData,
  version?: number | null,
  userConfig?: types.IConfig
): Promise<types.IStash> {
  const stash = {} as types.IStash;
  const reader = new BitReader(buffer);
  const config = Object.assign(defaultConfig, userConfig);
  const firstHeader = reader.ReadUInt32();
  reader.SeekByte(0);
  if (firstHeader == 0xaa55aa55) {
    stash.pages = [];
    let pageCount = 0;
    while (reader.offset < reader.bits.length) {
      pageCount++;
      await readStashHeader(stash, reader);
      const saveVersion = version || parseInt(stash.version);
      if (!constants) {
        constants = items.getConstantData(saveVersion);
      }
      await readStashPart(stash, reader, saveVersion, constants);
    }
    stash.pageCount = pageCount;
  } else {
    await readStashHeader(stash, reader);
    const saveVersion = version || parseInt(stash.version);
    if (!constants) {
      constants = items.getConstantData(saveVersion);
    }
    await readStashPages(stash, reader, saveVersion, constants);
  }
  return stash;
}

async function readStashHeader(stash: types.IStash, reader: BitReader) {
  const header = reader.ReadUInt32();
  switch (header) {
    // Resurrected
    case 0xaa55aa55:
      stash.type = types.EStashType.shared;
      stash.hardcore = reader.ReadUInt32() == 0;
      stash.version = reader.ReadUInt32().toString();
      stash.sharedGold = reader.ReadUInt32();
      reader.ReadUInt32(); // size of the sector
      reader.SkipBytes(44); // empty
      break;
    // LoD
    case 0x535353: // SSS
    case 0x4d545343: // CSTM
      stash.version = reader.ReadString(2);
      if (stash.version !== "01" && stash.version !== "02") {
        throw new Error(`unkown stash version ${stash.version} at position ${reader.offset - 2 * 8}`);
      }

      stash.type = header === 0x535353 ? types.EStashType.shared : types.EStashType.private;

      if (stash.type === types.EStashType.shared && stash.version == "02") {
        stash.sharedGold = reader.ReadUInt32();
      }

      if (stash.type === types.EStashType.private) {
        reader.ReadUInt32();
        stash.sharedGold = 0;
      }

      stash.pageCount = reader.ReadUInt32();
      break;
    default:
      debugger;
      throw new Error(
        `shared stash header 'SSS' / 0xAA55AA55 / private stash header 'CSTM' not found at position ${reader.offset - 3 * 8}`
      );
  }
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

async function readStashPart(stash: types.IStash, reader: BitReader, version: number, constants: types.IConstantData) {
  const page: types.IStashPage = {
    items: [],
    name: "",
    type: 0,
  };
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
  if (!constants) {
    constants = items.getConstantData(version);
  }
  if (version > 0x61) {
    for (const page of data.pages) {
      writer.WriteArray(await writeStashSection(data, page, constants, config));
    }
  } else {
    writer.WriteArray(await writeStashHeader(data));
    writer.WriteArray(await writeStashPages(data, version, constants, config));
  }
  return writer.ToArray();
}

async function writeStashHeader(data: types.IStash): Promise<Uint8Array> {
  const writer = new BitWriter();
  if (data.type === types.EStashType.private) {
    writer.WriteString("CSTM", 4);
  } else {
    writer.WriteString("SSS", 4);
  }

  writer.WriteString(data.version, data.version.length);

  if (data.type === types.EStashType.private) {
    writer.WriteString("", 4);
  } else {
    if (data.version == "02") {
      writer.WriteUInt32(data.sharedGold);
    }
  }
  writer.WriteUInt32(data.pages.length);
  return writer.ToArray();
}

async function writeStashSection(
  data: types.IStash,
  page: types.IStashPage,
  constants: types.IConstantData,
  userConfig: types.IConfig
): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteUInt32(0xaa55aa55);
  writer.WriteUInt32(data.hardcore ? 0 : 1);
  writer.WriteUInt32(0x62);
  writer.WriteUInt32(data.sharedGold);
  writer.WriteUInt32(0); // size of the sector, to be fixed later
  writer.WriteBytes(new Uint8Array(44).fill(0)); // empty
  writer.WriteArray(await items.writeItems(page.items, 0x62, constants, userConfig));
  const size = writer.offset;
  writer.SeekByte(16);
  writer.WriteUInt32(Math.ceil(size / 8));
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
