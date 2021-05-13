import { expect } from "chai";
import { _readBits, _writeBits } from "../src/util";
import { BinaryReader } from "../src/binary/binaryreader";
import { BinaryWriter } from "../src/binary/binarywriter";

/**
 * End to end tests.
 */
describe("utils", () => {
  it("should read bit", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const reader = new BinaryReader(buffer).SetLittleEndian();
    expect(_readBits(reader, 0, 20, 1)).to.eq(1);
  });

  it("should write bit", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const writer = new BinaryWriter().SetLittleEndian();
    writer.WriteArray(buffer);
    _writeBits(writer, 1, 0, 21, 1);
    expect(Buffer.from(writer.toArray()).toString("hex")).to.eq("4a4d300880");
  });
});
