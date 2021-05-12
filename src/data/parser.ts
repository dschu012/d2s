import * as types from "../d2/types";

//special stats. read the next N properties.
//seems to be hardcode in d2 and not in itemstatcost
const item_property_stat_count = {
  item_maxdamage_percent: { numprops: 2, rangestr: "strModMinDamageRange", equalstr: "strModEnhancedDamage" },
  firemindam: { numprops: 2, rangestr: "strModFireDamageRange", equalstr: "strModFireDamage" },
  lightmindam: { numprops: 2, rangestr: "strModLightningDamageRange", equalstr: "strModLightningDamage" },
  magicmindam: { numprops: 2, rangestr: "strModMagicDamageRange", equalstr: "strModMagicDamage" },
  coldmindam: { numprops: 3, rangestr: "strModColdDamageRange", equalstr: "strModColdDamage" },
  poisonmindam: { numprops: 3, rangestr: "strModPoisonDamageRange", equalstr: "strModPoisonDamage" },
};

//TODO use smaller field names to minimize size of file.
function readConstantData(buffers: any): types.IConstantData {
  const constants = {} as types.IConstantData;

  let strings = _readStrings(_getKey(buffers, "string.txt"));
  strings = Object.assign(strings, _readStrings(_getKey(buffers, "expansionstring.txt")));
  strings = Object.assign(strings, _readStrings(_getKey(buffers, "patchstring.txt")));

  constants.classes = _readClasses(_getArray(buffers, "CharStats.txt"), _getArray(buffers, "PlayerClass.txt"), strings);
  const skillDescs = _readSkillDesc(_getArray(buffers, "SkillDesc.txt"), strings);
  constants.skills = _readSkills(_getArray(buffers, "skills.txt"), skillDescs, strings);
  constants.rare_names = [null].concat(_readRareNames(_getArray(buffers, "RareSuffix.txt"), 1, strings));
  constants.rare_names = constants.rare_names.concat(
    _readRareNames(_getArray(buffers, "RarePrefix.txt"), constants.rare_names.length, strings)
  );
  constants.magic_prefixes = _readMagicNames(_getArray(buffers, "MagicPrefix.txt"), strings);
  constants.magic_suffixes = _readMagicNames(_getArray(buffers, "MagicSuffix.txt"), strings);
  constants.properties = _readProperties(_getArray(buffers, "Properties.txt"), strings);
  constants.magical_properties = _readItemStatCosts(_getArray(buffers, "ItemStatCost.txt"), strings);
  constants.runewords = _readRunewords(_getArray(buffers, "Runes.txt"), strings);
  constants.set_items = _readSetOrUnqItems(_getArray(buffers, "SetItems.txt"), strings);
  constants.unq_items = _readSetOrUnqItems(_getArray(buffers, "UniqueItems.txt"), strings);
  const item_types = _readTypes(_getArray(buffers, "ItemTypes.txt"), strings);
  const armor_items = _readItems(_getArray(buffers, "Armor.txt"), item_types, strings);
  const weapon_items = _readItems(_getArray(buffers, "Weapons.txt"), item_types, strings);
  const other_items = _readItems(_getArray(buffers, "Misc.txt"), item_types, strings);

  constants.stackables = {};
  [...armor_items, ...weapon_items, ...other_items]
    .filter((item) => item.s === 1)
    .map((item) => (constants.stackables[item.code] = { n: item.n }));
  constants.armor_items = {};
  armor_items.map((item) => {
    constants.armor_items[item.code] = item;
    delete item.code;
  });
  constants.weapon_items = {};
  weapon_items.map((item) => {
    constants.weapon_items[item.code] = item;
    delete item.code;
  });
  constants.other_items = {};
  other_items.map((item) => {
    constants.other_items[item.code] = item;
    delete item.code;
  });
  _readGems(constants.other_items, _getArray(buffers, "Gems.txt"), strings);

  return constants;
}

function _getArray(files: { [id: string]: Buffer }, find: string): any {
  return _readTsv(_getKey(files, find));
}

function _getKey(files: { [id: string]: Buffer }, find: string): any {
  const key = Object.keys(files).find((key) => key.toLowerCase() === find.toLowerCase());
  if (!key) {
    throw new Error(`Cannot find file: ${find}`);
  }
  return files[key];
}

function _readTsv(file: string): any {
  const lines = file.split(/\r?\n/).map((line) => line.split(/\t/));
  const header = lines[0];
  return {
    header: header,
    lines: lines,
  };
}

function _readStrings(file: string): any {
  const result = {} as any;
  file
    .split(/\r?\n/)
    .map((line) => line.split(/\t/))
    .map((line) => {
      if (!result[line[0]]) {
        result[line[0]] = line[1];
      }
    });
  return result;
}

function _readClasses(tsv: any, tsv2: any, strings: any): any[] {
  const arr = [] as any[];
  const cClass = tsv.header.indexOf("class");
  const cAllSkills = tsv.header.indexOf("StrAllSkills");
  const cSkillTab1 = tsv.header.indexOf("StrSkillTab1");
  const cSkillTab2 = tsv.header.indexOf("StrSkillTab2");
  const cSkillTab3 = tsv.header.indexOf("StrSkillTab3");
  const cClassOnly = tsv.header.indexOf("StrClassOnly");
  const cCode = tsv2.header.indexOf("Code");
  let id = 0;
  for (let i = 1; i < tsv.lines.length; i++) {
    const clazz = tsv.lines[i][cClass];
    if (clazz && clazz != "Expansion") {
      arr[id] = {
        n: clazz,
        c: tsv2.lines[i][cCode],
        as: strings[tsv.lines[i][cAllSkills]],
        ts: [strings[tsv.lines[i][cSkillTab1]], strings[tsv.lines[i][cSkillTab2]], strings[tsv.lines[i][cSkillTab3]]],
        co: strings[tsv.lines[i][cClassOnly]],
      };
      id++;
    }
  }
  return arr;
}

function _readSkillDesc(tsv: any, strings: any): any {
  const arr = {} as any;
  const cSkillDesc = tsv.header.indexOf("skilldesc");
  const cStrName = tsv.header.indexOf("str name");
  for (let i = 1; i < tsv.lines.length; i++) {
    const id = tsv.lines[i][cSkillDesc];
    const skillStrName = tsv.lines[i][cStrName];
    if (id && skillStrName) {
      arr[id] = strings[skillStrName];
    }
  }
  return arr;
}

function _readSkills(tsv: any, skillDescs: any, strings: any): any[] {
  const arr = [] as any[];
  const cSkillDesc = tsv.header.indexOf("skilldesc");
  const cId = tsv.header.indexOf("Id");
  const cCharclass = tsv.header.indexOf("charclass");
  for (let i = 1; i < tsv.lines.length; i++) {
    const id = +tsv.lines[i][cId];
    const skillDesc = tsv.lines[i][cSkillDesc];
    if (skillDesc) {
      const o = {} as any;
      if (skillDescs[skillDesc]) o.s = skillDescs[skillDesc];
      if (tsv.lines[i][cCharclass]) o.c = tsv.lines[i][cCharclass];
      arr[id] = o;
    }
  }
  return arr;
}

function _readRareNames(tsv: any, idx: number, strings: any): any[] {
  const arr = [] as any[];
  const cName = tsv.header.indexOf("name");
  let id = idx;
  for (let i = 1; i < tsv.lines.length; i++) {
    const name = tsv.lines[i][cName];
    if (name) {
      arr[id - idx] = {
        n: strings[name],
      };
      id++;
    }
  }
  return arr;
}

function _readMagicNames(tsv: any, strings: any): any[] {
  const arr = [] as any[];
  const cName = tsv.header.indexOf("Name");
  const cTransformcolor = tsv.header.indexOf("transformcolor");
  let id = 1;
  for (let i = 1; i < tsv.lines.length; i++) {
    const name = tsv.lines[i][cName];
    if (name != "Expansion") {
      const o = {} as any;
      o.n = strings[name];
      if (tsv.lines[i][cTransformcolor]) o.tc = tsv.lines[i][cTransformcolor];
      arr[id] = o;
      id++;
    }
  }
  return arr;
}

function _readProperties(tsv: any, strings: any): any {
  const arr = {} as any;
  const cCode = tsv.header.indexOf("code");
  const cStats = [];
  for (let j = 1; j <= 7; j++) {
    cStats[j] = {} as any;
    cStats[j].cStat = tsv.header.indexOf(`stat${j}`);
    cStats[j].cFunc = tsv.header.indexOf(`func${j}`);
  }
  for (let i = 1; i < tsv.lines.length; i++) {
    const code = tsv.lines[i][cCode];
    if (code != "Expansion") {
      const prop = [];
      //prop.code = code;
      for (let j = 1; j <= 7; j++) {
        const stat = tsv.lines[i][cStats[j].cStat];
        const func = tsv.lines[i][cStats[j].cFunc];
        if (!stat && !func) {
          break;
        }
        const s = {} as any;
        if (stat) s.s = stat;
        if (func) s.f = +func;
        prop[j - 1] = s;
      }
      if (prop.length) {
        arr[code] = prop;
      }
    }
  }
  return arr;
}

function _readRunewords(tsv: any, strings: any): any[] {
  const arr = [] as any[];
  const cName = tsv.header.indexOf("Name");
  for (let i = 1; i < tsv.lines.length; i++) {
    const name = tsv.lines[i][cName];
    if (name) {
      let id = +name.substring(8);
      //TODO: why?
      if (id > 75) {
        id += 25;
      } else {
        id += 26;
      }
      arr[id] = {
        n: strings[tsv.lines[i][cName]],
      };
    }
  }
  return arr;
}

function _readTypes(tsv: any, strings: any): any {
  const arr = {} as any;
  const cCode = tsv.header.indexOf("Code");
  const cItemType = tsv.header.indexOf("ItemType");
  const cEquiv1 = tsv.header.indexOf("Equiv1");
  const cEquiv2 = tsv.header.indexOf("Equiv2");
  const cInvGfx = [];
  for (let i = 1; i <= 6; i++) {
    cInvGfx.push(tsv.header.indexOf(`InvGfx${i}`));
  }
  for (let i = 1; i < tsv.lines.length; i++) {
    const code = tsv.lines[i][cCode];
    if (code) {
      const o = {} as any;
      const invgfx = [];
      for (let j = 0; j <= 6; j++) {
        if (tsv.lines[i][cInvGfx[j]]) invgfx[j] = tsv.lines[i][cInvGfx[j]];
      }
      o.ig = invgfx;
      o.eq1 = tsv.lines[i][cEquiv1];
      o.eq2 = tsv.lines[i][cEquiv2];
      o.n = tsv.lines[i][cItemType];
      o.c = [o.n];
      arr[code] = o;
    }
  }

  for (const k of Object.keys(arr)) {
    arr[k].c = [..._resolvetItemTypeCategories(arr, k)];
    if (arr[k] !== undefined && arr[arr[k].eq1] !== undefined) {
      arr[k].eq1n = arr[arr[k].eq1].n;
    }

    if (arr[k] !== undefined && arr[arr[k].eq2] !== undefined) {
      arr[k].eq2n = arr[arr[k].eq2].n;
    }
  }

  return arr;
}

function _resolvetItemTypeCategories(arr: any, key: string) {
  let res: string[] = [];
  if (arr[key] !== undefined) {
    res = [arr[key].n, ..._resolvetItemTypeCategories(arr, arr[key].eq1), ..._resolvetItemTypeCategories(arr, arr[key].eq2)];
  }
  return res;
}

function _readItems(tsv: any, itemtypes: any, strings: any): any[] {
  const arr = [] as any[];
  const cCode = tsv.header.indexOf("code");
  const cNameStr = tsv.header.indexOf("namestr");
  const cStackable = tsv.header.indexOf("stackable");
  const cMindam = tsv.header.indexOf("mindam");
  const cMaxdam = tsv.header.indexOf("maxdam");
  const cTwoHandMindam = tsv.header.indexOf("2handmindam");
  const cTwoHandMaxdam = tsv.header.indexOf("2handmaxdam");
  const cMinmisdam = tsv.header.indexOf("minmisdam");
  const cMaxmisdam = tsv.header.indexOf("maxmisdam");
  const cReqstr = tsv.header.indexOf("reqstr");
  const cReqdex = tsv.header.indexOf("reqdex");
  const cGemapplytype = tsv.header.indexOf("gemapplytype");
  const cInvfile = tsv.header.indexOf("invfile");
  const cUniqueInvfile = tsv.header.indexOf("uniqueinvfile");
  const cSetInvfile = tsv.header.indexOf("setinvfile");
  const cInvwidth = tsv.header.indexOf("invwidth");
  const cInvheight = tsv.header.indexOf("invheight");
  const cInvtransform = tsv.header.indexOf("InvTrans");
  const cType = tsv.header.indexOf("type");
  const cNormCode = tsv.header.indexOf("normcode");
  const cUberCode = tsv.header.indexOf("ubercode");
  const cUltraCode = tsv.header.indexOf("ultracode");

  for (let i = 1; i < tsv.lines.length; i++) {
    const code = tsv.lines[i][cCode];
    if (code) {
      const item = {} as any;
      item.code = code;
      item.nc = tsv.lines[i][cNormCode];
      item.exc = tsv.lines[i][cUberCode];
      item.elc = tsv.lines[i][cUltraCode];
      item.iq =
        item.code === item.exc
          ? types.EItemQuality.exceptional
          : item.code === item.elc
          ? types.EItemQuality.elite
          : types.EItemQuality.normal;
      item.n = strings[tsv.lines[i][cNameStr]];
      if (tsv.lines[i][cStackable] && +tsv.lines[i][cStackable] > 0) item.s = 1;
      if (tsv.lines[i][cMindam] && +tsv.lines[i][cMindam] > 0) item.mind = +tsv.lines[i][cMindam];
      if (tsv.lines[i][cMaxdam] && +tsv.lines[i][cMaxdam] > 0) item.maxd = +tsv.lines[i][cMaxdam];
      if (tsv.lines[i][cTwoHandMindam] && +tsv.lines[i][cTwoHandMindam] > 0) item.min2d = +tsv.lines[i][cTwoHandMindam];
      if (tsv.lines[i][cTwoHandMaxdam] && +tsv.lines[i][cTwoHandMaxdam] > 0) item.max2d = +tsv.lines[i][cTwoHandMaxdam];
      if (tsv.lines[i][cMinmisdam] && +tsv.lines[i][cMinmisdam] > 0) item.minmd = +tsv.lines[i][cMinmisdam];
      if (tsv.lines[i][cMaxmisdam] && +tsv.lines[i][cMaxmisdam] > 0) item.maxmd = +tsv.lines[i][cMaxmisdam];
      if (tsv.lines[i][cReqstr]) item.rs = +tsv.lines[i][cReqstr];
      if (tsv.lines[i][cReqdex]) item.rd = +tsv.lines[i][cReqdex];
      if (tsv.lines[i][cGemapplytype]) item.gt = +tsv.lines[i][cGemapplytype];
      if (tsv.lines[i][cInvfile]) item.i = tsv.lines[i][cInvfile];
      if (tsv.lines[i][cUniqueInvfile]) item.ui = tsv.lines[i][cUniqueInvfile];
      if (tsv.lines[i][cSetInvfile]) item.si = tsv.lines[i][cSetInvfile];
      if (tsv.lines[i][cInvwidth]) item.iw = +tsv.lines[i][cInvwidth];
      if (tsv.lines[i][cInvheight]) item.ih = +tsv.lines[i][cInvheight];
      if (tsv.lines[i][cInvtransform]) item.it = +tsv.lines[i][cInvtransform];
      const type = itemtypes[tsv.lines[i][cType]];
      if (type && type.ig) {
        item.ig = type.ig;
        item.eq1n = type.eq1n;
        item.eq2n = type.eq2n;
        item.c = type.c;
      }
      arr.push(item);
    }
  }
  return arr;
}

function _readGems(miscItems: any, tsv: any, strings: any) {
  const cCode = tsv.header.indexOf("code");
  const types = ["weapon", "helm", "shield"];
  const cols = {} as any;
  for (const type of types) {
    cols[type] = [];
    for (let j = 1; j <= 3; j++) {
      cols[type][j] = {} as any;
      cols[type][j].cMod = tsv.header.indexOf(`${type}Mod${j}Code`);
      cols[type][j].cParam = tsv.header.indexOf(`${type}Mod${j}Param`);
      cols[type][j].cMin = tsv.header.indexOf(`${type}Mod${j}Min`);
      cols[type][j].cMax = tsv.header.indexOf(`${type}Mod${j}Max`);
    }
  }
  for (let i = 1; i < tsv.lines.length; i++) {
    const code = tsv.lines[i][cCode];
    if (code && code != "Expansion") {
      const item = miscItems[code];
      for (let k = 0; k < 3; k++) {
        const type = types[k];
        for (let j = 1; j <= 3; j++) {
          const mod = tsv.lines[i][cols[type][j].cMod];
          if (!mod) {
            break;
          }
          if (j == 1) {
            if (!item.m) item.m = [];
            item.m[k] = [];
          }
          const m = {} as any;
          m.m = mod;
          if (tsv.lines[i][cols[type][j].cParam]) m.p = +tsv.lines[i][cols[type][j].cParam];
          if (tsv.lines[i][cols[type][j].cMin]) m.min = +tsv.lines[i][cols[type][j].cMin];
          if (tsv.lines[i][cols[type][j].cMax]) m.max = +tsv.lines[i][cols[type][j].cMax];
          item.m[k].push(m);
        }
      }
    }
  }
}

function _readSetOrUnqItems(tsv: any, strings: any): any[] {
  const arr = [] as any[];
  const cIndex = tsv.header.indexOf("index");
  const cInvfile = tsv.header.indexOf("invfile");
  const cCode = tsv.header.indexOf("code");
  const cInvtransform = tsv.header.indexOf("invtransform");
  let id = 0;
  for (let i = 1; i < tsv.lines.length; i++) {
    const index = tsv.lines[i][cIndex];
    if (index && index != "Expansion") {
      const o = {} as any;
      o.n = strings[tsv.lines[i][cIndex]];
      if (tsv.lines[i][cInvfile]) o.i = tsv.lines[i][cInvfile];
      if (tsv.lines[i][cCode]) o.c = tsv.lines[i][cCode];
      if (tsv.lines[i][cInvtransform]) o.tc = tsv.lines[i][cInvtransform];
      arr[id] = o;
      id++;
    }
  }
  return arr;
}

function _readItemStatCosts(tsv: any, strings: any): any[] {
  const arr = [] as any[];
  const cStat = tsv.header.indexOf("Stat");
  const cId = tsv.header.indexOf("ID");
  const cCSvBits = tsv.header.indexOf("CSvBits");
  const cCSvParam = tsv.header.indexOf("CSvParam");
  const cCSvSigned = tsv.header.indexOf("CSvSigned");
  const cEncode = tsv.header.indexOf("Encode");
  const cValShift = tsv.header.indexOf("ValShift");
  const cSigned = tsv.header.indexOf("Signed");
  const cSaveBits = tsv.header.indexOf("Save Bits");
  const cSaveAdd = tsv.header.indexOf("Save Add");
  const cSaveParamBits = tsv.header.indexOf("Save Param Bits");
  const cDescPriority = tsv.header.indexOf("descpriority");
  const cDescFunc = tsv.header.indexOf("descfunc");
  const cDescVal = tsv.header.indexOf("descval");
  const cDescstrpos = tsv.header.indexOf("descstrpos");
  const cDescstrneg = tsv.header.indexOf("descstrneg");
  const cDescstr2 = tsv.header.indexOf("descstr2");
  const cDgrp = tsv.header.indexOf("dgrp");
  const cDgrpFunc = tsv.header.indexOf("dgrpfunc");
  const cDgrpVal = tsv.header.indexOf("dgrpval");
  const cDgrpstrpos = tsv.header.indexOf("dgrpstrpos");
  const cDgrpstrneg = tsv.header.indexOf("dgrpstrneg");
  const cDgrpstr2 = tsv.header.indexOf("dgrpstr2");
  const cOp = tsv.header.indexOf("op");
  const cOpParam = tsv.header.indexOf("op param");
  const cOpBase = tsv.header.indexOf("op base");
  const cOpStat1 = tsv.header.indexOf("op stat1");
  const cOpStat2 = tsv.header.indexOf("op stat2");
  const cOpStat3 = tsv.header.indexOf("op stat3");
  for (let i = 1; i < tsv.lines.length; i++) {
    const id = +tsv.lines[i][cId];
    const stat = tsv.lines[i][cStat];
    if (stat) {
      const o = {} as any;
      o.s = stat;
      if (tsv.lines[i][cCSvBits]) o.cB = +tsv.lines[i][cCSvBits];
      if (tsv.lines[i][cCSvParam]) o.cP = +tsv.lines[i][cCSvParam];
      if (tsv.lines[i][cCSvSigned]) o.cS = +tsv.lines[i][cCSvSigned];
      if (tsv.lines[i][cEncode]) o.e = +tsv.lines[i][cEncode];
      if (tsv.lines[i][cValShift]) o.vS = +tsv.lines[i][cValShift];
      if (tsv.lines[i][cSigned]) o.sS = +tsv.lines[i][cSigned];
      if (tsv.lines[i][cSaveBits]) o.sB = +tsv.lines[i][cSaveBits];
      if (tsv.lines[i][cSaveAdd]) o.sA = +tsv.lines[i][cSaveAdd];
      if (tsv.lines[i][cSaveParamBits]) o.sP = +tsv.lines[i][cSaveParamBits];
      if (tsv.lines[i][cDescPriority]) o.so = +tsv.lines[i][cDescPriority];
      if (tsv.lines[i][cDescFunc]) o.dF = +tsv.lines[i][cDescFunc];
      if (tsv.lines[i][cDescVal]) o.dV = +tsv.lines[i][cDescVal];
      if (tsv.lines[i][cDescstrpos]) o.dP = strings[tsv.lines[i][cDescstrpos]];
      if (tsv.lines[i][cDescstrneg]) o.dN = strings[tsv.lines[i][cDescstrneg]];
      if (tsv.lines[i][cDescstr2]) o.d2 = strings[tsv.lines[i][cDescstr2]];
      if (tsv.lines[i][cDgrp]) o.dg = +tsv.lines[i][cDgrp];
      if (tsv.lines[i][cDgrpFunc]) o.dgF = +tsv.lines[i][cDgrpFunc];
      if (tsv.lines[i][cDgrpVal]) o.dgV = +tsv.lines[i][cDgrpVal];
      if (tsv.lines[i][cDgrpstrpos]) o.dgP = strings[tsv.lines[i][cDgrpstrpos]];
      if (tsv.lines[i][cDgrpstrneg]) o.dN = strings[tsv.lines[i][cDgrpstrneg]];
      if (tsv.lines[i][cDgrpstr2]) o.dg2 = strings[tsv.lines[i][cDgrpstr2]];
      if (tsv.lines[i][cOp]) o.o = +tsv.lines[i][cOp];
      if (tsv.lines[i][cOpParam]) o.op = +tsv.lines[i][cOpParam];
      if (tsv.lines[i][cOpBase]) o.ob = tsv.lines[i][cOpBase];
      if (tsv.lines[i][cOpStat1]) o.os = [tsv.lines[i][cOpStat1]];
      if (tsv.lines[i][cOpStat2]) o.os[1] = tsv.lines[i][cOpStat2];
      if (tsv.lines[i][cOpStat3]) o.os[2] = tsv.lines[i][cOpStat3];

      const dmgstatrange = item_property_stat_count[stat];
      if (dmgstatrange) {
        o.np = dmgstatrange.numprops;
        o.dR = strings[dmgstatrange.rangestr];
        o.dE = strings[dmgstatrange.equalstr];
      }
      arr[id] = o;
    }
  }
  return arr;
}

export { readConstantData };
