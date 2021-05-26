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
    const writer = new BitWriter();
    for(let i = 0; i < 90; i ++) {
      writer.WriteByte(125)
        .WriteUInt16(125)
        .WriteUInt16(125, 9)
        .WriteUInt32(125)
        .WriteUInt32(125, 27);
    }

    const reader = new BitReader(writer.ToArray());
    for(let i = 0; i < 90; i ++) {
      expect(reader.ReadByte()).to.eq(125);
      expect(reader.ReadUInt16()).to.eq(125);
      expect(reader.ReadUInt16(9)).to.eq(125);
      expect(reader.ReadUInt32()).to.eq(125);
      expect(reader.ReadUInt32(27)).to.eq(125);
    }
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
