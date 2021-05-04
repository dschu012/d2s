import { expect } from "chai";
import { _readBits, _writeBits } from "../src/util";
import { BinaryReader } from "../src/binary/binaryreader";

/**
 * End to end tests.
 */
describe("utils", () => {
  it("should read bit", async () => {
    const buffer = Buffer.from("4a4d100880", "hex");
    const reader = new BinaryReader(buffer).SetLittleEndian();
    expect(_readBits(reader, 0, 20, 1)).to.eq(1);
  });
});
