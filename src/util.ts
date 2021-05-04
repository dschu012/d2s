import { BinaryReader } from "./binary/binaryreader";
import { BinaryWriter } from "./binary/binarywriter";
import * as Long from "long";

const D2S_DEBUG = process.env["D2S_DEBUG"] !== undefined;

/**
 * A lot of the structures arent byte aligned. this aids reading arbitrary sized fields at
 * arbitrary positions within a byte. It "should" respect the endianness of the reader.
 */
//TODO: (ga) remove debugInfo paramter
export function _readBits(reader: BinaryReader, start: number, bitoffset: number, size: number, debugInfo?: string): number {
  // TODO: (ga) remove debug information
  if (D2S_DEBUG) {
    const s = start + Math.floor(bitoffset / 8);
    const e = Math.ceil(size / 8);
    reader.Seek(s);
    const tr = reader.ReadArray(e);
    process.stdout.write(`r ${s}-${s + e}[${e}b] (bit ${bitoffset}-${bitoffset + size})[${size}bits]: ${Buffer.from(tr).toString("hex")} `);
  }
  // END TODO
  reader.Seek(start + Math.floor(bitoffset / 8));
  let num = Long.default.fromNumber(reader.ReadUInt(Math.ceil((size + (bitoffset % 8)) / 8)), true);
  const shift = num.shiftRightUnsigned(bitoffset & 0x7);
  const mask = Long.default.fromNumber(1, true).shiftLeft(size).subtract(1);
  num = shift.and(mask);
  // TODO: (ga) remove debug information
  D2S_DEBUG && process.stdout.write(`= ${num.toNumber()} ${debugInfo ? "(" + debugInfo + ")" : ""}\n`);
  return num.toNumber();
}

/**
 * A lot of the structures arent byte aligned. this aids writing arbitrary sized fields at
 * arbitrary positions within a byte. It "should" respect the endianness of the writer.
 */
//TODO (ga) remove debug info
export function _writeBits(
  writer: BinaryWriter,
  value: number | Uint8Array,
  start: number,
  bitoffset: number,
  size: number,
  debugInfo?: string
) {
  writer.Seek(start + Math.floor(bitoffset / 8));
  const bytes = Math.ceil((size + (bitoffset % 8)) / 8);
  //peek ahead. if we went backwards on this writer we dont wanna overwrite bits
  let current = Long.default.fromNumber(writer.Peek(bytes), true);
  if (typeof value === "number") {
    //clear bits where we are writing
    const v = Long.default.fromNumber(value, true);
    const bitmask = Long.default.fromNumber(1, true).shiftLeft(size).subtract(1);
    const shifted = bitmask.shiftLeft(bitoffset % 8);
    current = current.and(shifted.not());
    //set them now
    current = current.xor(v.and(bitmask).shiftLeft(bitoffset % 8));
    //TODO: (ga) remove debug information
    if (D2S_DEBUG) {
      const s = start + Math.floor(bitoffset / 8);
      const e = Math.ceil(size / 8);
      D2S_DEBUG &&
        process.stdout.write(
          `w ${s}-${s + e}[${e}b] (bit ${bitoffset}-${bitoffset + size})[${size}bits]: ${current} = ${current.toString(16)} ${
            debugInfo ? "(" + debugInfo + ")" : ""
          }\n`
        );
    }
    // END TODO
    writer.WriteUInt(current.toNumber(), bytes);
  } else if (value instanceof Uint8Array) {
    for (let i = 0; i < value.length; i++) {
      _writeBits(writer, value[i], start, bitoffset + i * 8, 8);
    }
  }
}
