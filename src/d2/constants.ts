import * as types from "./types";

const versionedConstants: Map<number, types.IConstantData> = new Map<number, types.IConstantData>();

function getConstantData(version: number): types.IConstantData {
  if (!(version in versionedConstants)) {
    throw new Error(`No constant data found for this version ${version}`);
  }
  return versionedConstants[version];
}

function setConstantData(version: number, data: types.IConstantData) {
  versionedConstants[version] = data;
}

export { getConstantData, setConstantData };
