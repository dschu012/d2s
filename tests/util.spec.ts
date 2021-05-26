import { expect } from "chai";
import { BitReader } from "../src/binary/bitreader";
import { BitWriter } from "../src/binary/bitwriter";

/**
 * End to end tests.
 */
describe("utils", () => {
  it("should read bit", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const reader = new BitReader(buffer);
    reader.SeekBit(20);
    expect(reader.ReadBit()).to.eq(1);
    expect(reader.offset).to.eq(21);
  });

  it("should read/write", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const reader = new BitReader(buffer);
    const writer = new BitWriter();
    writer.WriteByte(reader.ReadByte()).WriteUInt16(reader.ReadUInt16()).WriteBytes(reader.ReadBytes(2));
    const result = Buffer.from(writer.ToArray()).toString("hex");
    expect(result).to.eq("4a4d100880");
  });

  it("should write bit", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const writer = new BitWriter();
    writer.WriteBytes(buffer);
    writer.SeekBit(21);
    writer.WriteBit(1);
    expect(Buffer.from(writer.ToArray()).toString("hex")).to.eq("4a4d300880");
  });

  it("should read byte", async () => {
    const buffer = new Uint8Array([0xff]);
    const reader = new BitReader(buffer);
    expect(reader.ReadByte()).to.eq(0xff);
  });
});
