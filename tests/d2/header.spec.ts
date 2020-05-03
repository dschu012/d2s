import { expect } from 'chai';
import { readHeader, writeHeader, fixHeader, writeHeaderData, readHeaderData } from '../../src/d2/header';
import * as types from '../../src/d2/types';
import { BinaryReader } from '../../src/binary/binaryreader';
import { BinaryWriter } from '../../src/binary/binarywriter';
import * as fs from 'fs';
import * as path from 'path';
import { constants } from '../../src/data/versions/96_constant_data';

describe('header', () => {

  it('should calulcate checksum', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/simple.d2s"));
    let writer = new BinaryWriter().SetLittleEndian();
    writer.WriteArray(inputstream);
    let pre = writer.Seek(0x000c).Peek(4);
    await fixHeader(writer);
    let post = writer.Seek(0x000c).Peek(4);
    expect(post).to.eq(pre);
  });

  it('should read', async () => {
    let inputstream = fs.readFileSync(path.join(__dirname, "../../examples/chars/simple.d2s"));
    let reader = new BinaryReader(inputstream).SetLittleEndian();
    let d2s = {} as types.ID2S;
    await readHeader(d2s, reader);
    await readHeaderData(d2s, reader, constants);
    expect(d2s.header.version).to.eq(96);
  });

  it('should write', async () => {
    let json = fs.readFileSync(path.join(__dirname, "../../examples/chars/simple.json"), "utf-8");
    let d2s = JSON.parse(json);
    let output = new BinaryWriter();
    output.WriteArray(await writeHeader(d2s));
    output.WriteArray(await writeHeaderData(d2s, constants));
    expect(output.Length()).to.eq(765);
  });

});