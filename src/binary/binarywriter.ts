import { Buffer } from "buffer/";
import { Endianness } from "./constants";

export class BinaryWriter {
  private littleEndian = true;
  private buffer: Buffer;
  private length = 0;
  private offset = 0;
  private noAssert = false;
  private poolSize: number;

  constructor(poolSize = 1024) {
    this.poolSize = poolSize;
    this.buffer = Buffer.alloc(this.poolSize, 0x0);
  }

  private _CheckAlloc(bytes = 0) {
    while (this.length + bytes > this.buffer.length) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(this.poolSize, 0x0)]);
    }
  }

  private _Increment(num: number) {
    this.offset += num;
    if (this.offset > this.length) {
      this.length = this.offset;
      this._CheckAlloc();
    }
  }

  SetEndianness(endiannes: Endianness): BinaryWriter {
    if (endiannes === Endianness.be) {
      return this.SetBigEndian();
    }
    return this.SetLittleEndian();
  }

  GetEndianness(): Endianness {
    return this.littleEndian ? Endianness.le : Endianness.be;
  }
  SetLittleEndian(): BinaryWriter {
    this.littleEndian = true;
    return this;
  }

  SetBigEndian(): BinaryWriter {
    this.littleEndian = false;
    return this;
  }

  toArray(): Uint8Array {
    return new Uint8Array(this.buffer.slice(0, this.length));
  }

  WriteArray(array: Uint8Array): BinaryWriter {
    this._CheckAlloc(array.byteLength);
    const newBuffer = Buffer.from(array);
    newBuffer.copy(this.buffer, this.offset);
    this._Increment(newBuffer.length);
    return this;
  }

  WriteStringNullTerminated(str: string): BinaryWriter {
    const write = `${str}\0`;
    this._CheckAlloc(write.length);
    this.buffer.write(write, this.offset, write.length, "utf8");
    this._Increment(write.length);
    return this;
  }

  WriteString(str: string, len?: number): BinaryWriter {
    len = len || str.length;
    this._CheckAlloc(len);
    this.buffer.write(str, this.offset, len, "utf8");
    this._Increment(len);
    return this;
  }
  WriteUInt8(number: number): BinaryWriter {
    this._CheckAlloc(1);
    this.buffer.writeUInt8(number, this.offset, this.noAssert);
    this._Increment(1);
    return this;
  }

  WriteInt8(number: number): BinaryWriter {
    this._CheckAlloc(1);
    this.buffer.writeInt8(number, this.offset, this.noAssert);
    this._Increment(1);
    return this;
  }

  WriteUInt16(number: number): BinaryWriter {
    this._CheckAlloc(2);
    if (this.littleEndian) {
      this.buffer.writeUInt16LE(number, this.offset, this.noAssert);
    } else {
      this.buffer.writeUInt16BE(number, this.offset, this.noAssert);
    }
    this._Increment(2);
    return this;
  }

  WriteInt16(number: number): BinaryWriter {
    this._CheckAlloc(2);
    if (this.littleEndian) {
      this.buffer.writeInt16LE(number, this.offset, this.noAssert);
    } else {
      this.buffer.writeInt16BE(number, this.offset, this.noAssert);
    }
    this._Increment(2);
    return this;
  }

  WriteUInt32(number: number): BinaryWriter {
    this._CheckAlloc(4);
    if (this.littleEndian) {
      this.buffer.writeUInt32LE(number, this.offset, this.noAssert);
    } else {
      this.buffer.writeUInt32BE(number, this.offset, this.noAssert);
    }
    this._Increment(4);
    return this;
  }

  WriteInt32(number: number): BinaryWriter {
    this._CheckAlloc(4);
    if (this.littleEndian) {
      this.buffer.writeInt32LE(number, this.offset, this.noAssert);
    } else {
      this.buffer.writeInt32BE(number, this.offset, this.noAssert);
    }
    this._Increment(4);
    return this;
  }

  WriteUInt(number: number, size: number): BinaryWriter {
    this._CheckAlloc(size);
    if (this.littleEndian) {
      this.buffer.writeUIntLE(number, this.offset, size, this.noAssert);
    } else {
      this.buffer.writeUIntBE(number, this.offset, size, this.noAssert);
    }
    this._Increment(size);
    return this;
  }

  WriteInt(number: number, size: number): BinaryWriter {
    this._CheckAlloc(size);
    if (this.littleEndian) {
      this.buffer.writeIntLE(number, this.offset, size, this.noAssert);
    } else {
      this.buffer.writeIntBE(number, this.offset, size, this.noAssert);
    }
    this._Increment(size);
    return this;
  }

  Skip(number: number): BinaryWriter {
    this._Increment(number);
    return this;
  }

  Seek(number: number): BinaryWriter {
    this.offset = number;
    if (this.offset > this.length) {
      this.length = this.offset;
      this._CheckAlloc();
    }
    return this;
  }

  Position(): number {
    return this.offset;
  }

  Peek(size = 1): number {
    this._CheckAlloc(size);
    return this.littleEndian
      ? this.buffer.readUIntLE(this.offset, size, this.noAssert)
      : this.buffer.readUIntBE(this.offset, size, this.noAssert);
  }

  Buffer(): Buffer {
    return this.buffer;
  }

  SetLength(len: number): BinaryWriter {
    this.length = len;
    return this;
  }
  Length(): number {
    return this.length;
  }
}
