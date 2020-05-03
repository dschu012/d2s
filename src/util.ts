import { BinaryReader } from './binary/binaryreader'
import { BinaryWriter } from './binary/binarywriter'
import * as Long from 'long'

/**
 * A lot of the structures arent byte aligned. this aids reading arbitrary sized fields at
 * arbitrary positions within a byte. It "should" respect the endianness of the reader.
 */
export function _readBits(reader: BinaryReader, start: number, bitoffset: number, size: number): number {
  reader.Seek(start + Math.floor(bitoffset / 8));
  let num = Long.default.fromNumber(reader.ReadUInt(Math.ceil((size+(bitoffset % 8))/8)), true);
  let shift = num.shiftRightUnsigned(bitoffset & 0x7);
  let mask = Long.default.fromNumber(1, true).shiftLeft(size).subtract(1);
  num = shift.and(mask);
  return num.toNumber();
}

/**
 * A lot of the structures arent byte aligned. this aids writing arbitrary sized fields at
 * arbitrary positions within a byte. It "should" respect the endianness of the writer.
 */
export function _writeBits(writer: BinaryWriter, value: number | Uint8Array, start: number, bitoffset: number, size: number) {
  writer.Seek(start + Math.floor(bitoffset / 8));
  let bytes = Math.ceil((size+(bitoffset % 8))/8);
  //peek ahead. if we went backwards on this writer we dont wanna overwrite bits
  let current =  Long.default.fromNumber(writer.Peek(bytes), true);
  if(typeof value === "number") {
    //clear bits where we are writing
    let v = Long.default.fromNumber(value, true);
    let bitmask = Long.default.fromNumber(1, true).shiftLeft(size).subtract(1);
    let shifted = bitmask.shiftLeft(bitoffset % 8);
    current = current.and(shifted.not());
    //set them now
    current = current.xor(v.and(bitmask).shiftLeft(bitoffset % 8));
    writer.WriteUInt(current.toNumber(), bytes);
  } else if(value instanceof Uint8Array) {
    for(let i = 0; i < value.length; i++) {
       _writeBits(writer, value[i], start, bitoffset + (i * 8), 8);
    }
  }
}
