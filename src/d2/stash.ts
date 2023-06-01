import * as types from "./types";
import { BitWriter } from "../binary/bitwriter";
import * as items from "./items";
import { enhanceItems } from "./attribute_enhancer";
import { BitReader } from "../binary/bitreader";
import { getConstantData } from "./constants";

const defaultConfig = {
  extendedStash: false,
} as types.IConfig;

export async function read(
  buffer: Uint8Array,
  constants?: types.IConstantData,
  version?: number | null
): Promise<types.IStash> {
  const stash = { pages: [] as types.IStashPage[] } as types.IStash;
  const reader = new BitReader(buffer);
  stash.type = readStashHeader(reader);
  reader.SeekByte(0);
  // Resurrected
  if (stash.type === types.EStashType.D2R) {
    let pageCount = 0;
    while (reader.offset < reader.bits.length) {
      pageCount++;
      await readStashMeta(stash, reader);
      const saveVersion = version || parseInt(stash.version);
      if (!constants) {
        constants = getConstantData(saveVersion);
      }
      await readStashPart(stash, reader, saveVersion, constants);
    }
    stash.pageCount = pageCount;
  }
  // PlugY/Atma/Goule
  else {
    await readStashMeta(stash, reader);
    const saveVersion = version || parseInt(stash.version);
    if (!constants) {
      constants = getConstantData(saveVersion);
    }
    // PluggY
    if (stash.type === types.EStashType.SSS || stash.type === types.EStashType.CSTM) {
      await readStashPages(stash, reader, saveVersion, constants);
    }
    // Atma/GoMule
    else if (stash.type === types.EStashType.D2X) {
      const stashItems = [] as types.IItem[];
      reader.SeekByte(11);
      for (let i = 0; i < stash.itemCount; i++) {
        stashItems.push(await items.readItem(reader, saveVersion, constants, {}));
      }
      stash.pages.push({ items: stashItems } as types.IStashPage);
    }
  }
  return stash;
}

function readStashHeader(reader: BitReader): types.EStashType {
  reader.SeekBit(0);
  const header32 = reader.ReadUInt32();
  // Resurrected
  if (header32 === 0xaa55aa55) {
    return types.EStashType.D2R;
  }
  // SSS (PlugY)
  else if (header32 === 0x535353) {
    return types.EStashType.SSS;
  }
  // CSTM (PlugY)
  else if (header32 === 0x4d545343) {
    return types.EStashType.CSTM;
  }
  // Check 24 bit header
  reader.SeekBit(0);
  const header24 = reader.ReadUInt32(24);
  // D2X (Atma/GoMule)
  if (header24 === 0x583244) {
    return types.EStashType.D2X;
  }
  const header24Hex = header24?.toString(16);
  const header32Hex = header32?.toString(16);
  throw new Error(`unknown stash header at position 0: 24bit = 0x${header24Hex}, 32bit = 0x${header32Hex}`);
}

async function readStashMeta(stash: types.IStash, reader: BitReader) {
  // Skip header, already parsed into stash type
  reader.SkipBytes(4);
  // Resurrected
  if (stash.type === types.EStashType.D2R) {
    stash.shared = true;
    stash.hardcore = reader.ReadUInt32() == 0;
    stash.version = reader.ReadUInt32().toString();
    stash.sharedGold = reader.ReadUInt32();
    reader.ReadUInt32(); // size of the sector
    reader.SkipBytes(44); // empty
  }
  // SSS or CSTM (PlugY)
  else if (stash.type === types.EStashType.SSS || stash.type === types.EStashType.CSTM) {
    if (stash.type === types.EStashType.SSS) {
      stash.type = types.EStashType.SSS;
      stash.shared = true;
    }
    else if (stash.type === types.EStashType.CSTM) {
      stash.type = types.EStashType.CSTM;
      stash.shared = false;
    }
    stash.version = reader.ReadString(2);
    if (stash.version !== "01" && stash.version !== "02") {
      throw new Error(`unknown stash version ${stash.version} at position ${reader.offset - 16}`);
    }
    if (stash.shared && stash.version == "02") {
      stash.sharedGold = reader.ReadUInt32();
    }
    if (!stash.shared) {
      reader.ReadUInt32();
      stash.sharedGold = 0;
    }
    stash.pageCount = reader.ReadUInt32();
  }
  // D2X (Atma/GoMule)
  else if (stash.type === types.EStashType.D2X) {
    stash.type = types.EStashType.D2X;
    stash.shared = true;
    reader.SeekByte(3);
    stash.itemCount = reader.ReadUInt16();
    stash.version = reader.ReadUInt16().toString();
    if (stash.version !== "99") {
      throw new Error(`unknown stash version ${stash.version} at position ${reader.offset - 16}`);
    }
  }
  else {
    throw new Error(`unknown stash type: ${stash.type}`);
  }
}

async function readStashPages(stash: types.IStash, reader: BitReader, version: number, constants: types.IConstantData) {
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
    constants = getConstantData(version);
  }
  // Resurrected
  if (data.type === types.EStashType.D2R) {
    for (const page of data.pages) {
      writer.WriteArray(await writeStashSection(data, page, constants, config));
    }
  }
  // SSS or CSTM (PlugY)
  else if (data.type === types.EStashType.SSS || data.type === types.EStashType.CSTM) {
    writer.WriteArray(await writeStashHeader(data));
    writer.WriteArray(await writeStashPages(data, version, constants, config));
  }
  // D2X (Atma/GoMule)
  else if (data.type === types.EStashType.D2X) {
    throw new Error('No write support for D2X (Atma/GoMule)');
  }
  return writer.ToArray();
}

async function writeStashHeader(data: types.IStash): Promise<Uint8Array> {
  const writer = new BitWriter();
  if (data.shared) {
    writer.WriteString("SSS", 4);
  } else {
    writer.WriteString("CSTM", 4);
  }

  writer.WriteString(data.version, data.version.length);

  if (data.shared) {
    if (data.version == "02") {
      writer.WriteUInt32(data.sharedGold);
    }
  } else {
    writer.WriteString("", 4);
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
