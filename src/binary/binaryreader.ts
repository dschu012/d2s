import { Buffer } from "buffer/";
import { Endianness } from "./constants";

export class BinaryReader {

  private littleEndian: boolean = true;
  private buffer: Buffer;
  private noAssert: boolean = false;
  private offset: number = 0;

  constructor(arrBuffer: ArrayBuffer) {
    this.buffer = Buffer.from(arrBuffer);
  }


  private _ReadArray(bytes: number): Uint8Array {
    let arr = this.buffer.slice(this.offset, this.offset + bytes);
    this.offset += bytes;
    return new Uint8Array(arr);
  }

  private _ReadString(bytes: number): string {
    var str = this.buffer.toString("utf8", this.offset, this.offset + bytes);
    this.offset += bytes;
    return str;
  }

  private _ReadNullTerminatedString(): string {
    let start = this.offset;
    while (this.buffer.readUInt8(this.offset, this.noAssert)) {
      this.offset++;
    }
    return this.buffer.toString("utf8", start, this.offset++);
  }

  SetEndianness(endiannes: Endianness) : BinaryReader {
    if(endiannes === Endianness.be) {
      return this.SetBigEndian();
    }
    return this.SetLittleEndian();
  }

  GetEndianness() : Endianness {
    return this.littleEndian ? Endianness.le : Endianness.be;
  }
  SetLittleEndian(): BinaryReader {
    this.littleEndian = true;
    return this;
  }

  SetBigEndian(): BinaryReader {
    this.littleEndian = false;
    return this;
  }

  ReadArray(bytes: number): Uint8Array  {
    return this._ReadArray(bytes);
  }
  ReadUInt8(): number {
    let number = this.buffer.readUInt8(this.offset, this.noAssert);
    this.offset += 1;
    return number;
  }

  ReadInt8(): number {
    let number = this.buffer.readInt8(this.offset, this.noAssert);
    this.offset += 1;
    return number;
  }

  ReadUInt16(): number {
    let number = this.littleEndian ? 
      this.buffer.readUInt16LE(this.offset, this.noAssert)
      : this.buffer.readUInt16BE(this.offset, this.noAssert);
    this.offset += 2;
    return number;
  }

  ReadInt16(): number {
    let number = this.littleEndian ? 
      this.buffer.readInt16LE(this.offset, this.noAssert)
      : this.buffer.readInt16BE(this.offset, this.noAssert);
    this.offset += 2;
    return number;
  }

  ReadUInt32(): number {
    let number = this.littleEndian ? 
      this.buffer.readUInt32LE(this.offset, this.noAssert)
      : this.buffer.readUInt32BE(this.offset, this.noAssert);
    this.offset += 4;
    return number;
  }

  ReadInt32(): number {
    let number = this.littleEndian ? 
      this.buffer.readInt32LE(this.offset, this.noAssert)
      : this.buffer.readInt32BE(this.offset, this.noAssert);
    this.offset += 4;
    return number;
  }

  ReadUInt(size: number): number {
    let number = this.littleEndian ?
      this.buffer.readUIntLE(this.offset, size, this.noAssert)
      : this.buffer.readUIntBE(this.offset, size, this.noAssert);
    this.offset += size;
    return number;
  }

  ReadInt(size: number): number {
    let number = this.littleEndian ?
      this.buffer.readIntLE(this.offset, size, this.noAssert)
      : this.buffer.readIntBE(this.offset, size, this.noAssert);
    this.offset += size;
    return number;
  }

  Skip(number: number): BinaryReader {
    this.offset += number;
    return this;
  }

  Seek(number: number): BinaryReader {
    this.offset = number;
    return this;
  }

  Position(): number {
    return this.offset;
  }

  ReadString(size?: number): string {
    return size == null ? this._ReadNullTerminatedString() : this._ReadString(size);
  }

  Buffer(): Buffer {
    return this.buffer;
  }

}