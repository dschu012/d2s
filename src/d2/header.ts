import * as types from "./types";
import { BinaryReader } from "../binary/binaryreader";
import { BinaryWriter } from "../binary/binarywriter";

export async function readHeader(char: types.ID2S, reader: BinaryReader) {
  char.header = {} as types.IHeader;
  //0x0000
  char.header.identifier = reader.ReadUInt32().toString(16).padStart(8, "0");
  if (char.header.identifier != "aa55aa55") {
    throw new Error(`D2S identifier 'aa55aa55' not found at position ${reader.Position() - 4}`);
  }
  //0x0004
  char.header.version = reader.ReadUInt32();
}

export async function readHeaderData(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData) {
  const v = await _versionSpecificHeader(char.header.version);
  if (v == null) {
    throw new Error(`Cannot parse version: ${char.header.version}`);
  }
  v.readHeader(char, reader, constants);
}

export async function writeHeader(char: types.ID2S): Promise<Uint8Array> {
  const writer = new BinaryWriter();
  writer.SetLittleEndian().WriteUInt32(parseInt(char.header.identifier, 16)).WriteUInt32(char.header.version);

  return writer.toArray();
}

export async function writeHeaderData(char: types.ID2S, constants: types.IConstantData): Promise<Uint8Array> {
  const writer = new BinaryWriter();
  const v = await _versionSpecificHeader(char.header.version);
  if (v == null) {
    throw new Error(`Cannot parse version: ${char.header.version}`);
  }
  v.writeHeader(char, writer, constants);

  return writer.toArray();
}

export async function fixHeader(writer: BinaryWriter) {
  let checksum = 0;
  const eof = writer.Length();
  writer.Seek(0x0008).WriteUInt32(eof);
  writer.Seek(0x000c).WriteUInt32(0);
  for (let i = 0; i < eof; i++) {
    let byte = writer.Seek(i).Peek();
    if (checksum & 0x80000000) {
      byte += 1;
    }
    checksum = byte + checksum * 2;
    //hack make it a uint32
    checksum >>>= 0;
  }
  //checksum pos
  writer.Seek(0x000c).WriteUInt32(checksum);
}

/**
 * Save Version
 * 0x47, 0x0, 0x0, 0x0 = <1.06
 * 0x59, 0x0, 0x0, 0x0 = 1.08 = version
 * 0x5c, 0x0, 0x0, 0x0 = 1.09 = version
 * 0x60, 0x0, 0x0, 0x0 = 1.13c = version
 * */
async function _versionSpecificHeader(version: number) {
  switch (version) {
    case 0x60: {
      return await import(`./versions/default_header`);
    }
    default: {
      return await import(`./versions/default_header`);
    }
  }
}
