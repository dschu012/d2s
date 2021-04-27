
import * as types from './types'
import { type } from 'os';

//do nice stuff
//combine group properties (all resists/all stats) and build friendly strings for a ui
//enhanced def/durability/weapon damage.
//lookup socketed compact items (runes/gems) properties for the slot they are in
//compute attributes like str/resists/etc..
export async function enhanceAttributes(char: types.ID2S, constants: types.IConstantData) {
  enhanceItems(char.items, constants, char.attributes.level);
  enhanceItems([char.golem_item], constants, char.attributes.level);
  enhanceItems(char.merc_items, constants, char.attributes.level);
  enhanceItems(char.corpse_items, constants, char.attributes.level);
  enhancePlayerAttributes(char, constants);
}

export async function enhancePlayerAttributes(char: types.ID2S, constants: types.IConstantData) {
  let items = char.items.filter(item => {
    return (item.location_id === 1 && (item.equipped_id !== 13 && item.equipped_id !== 14));
  });
  
  char.item_bonuses = ([] as types.IMagicProperty[]).concat.apply([], items.map(item => _allAttributes(item, constants))).filter(attribute => attribute != null);
  char.item_bonuses = _groupAttributes(char.item_bonuses, constants);
  _enhanceAttributeDescription(char.item_bonuses, constants, char.attributes.level);
}

export async function enhanceItems(items: types.IItem[], constants: types.IConstantData, level: number = 1, parent?: types.IItem) {
  if (!items) {
    return;
  }
  for (const item of items) {
    if (!item) {
      continue;
    }
    if (item.socketed_items && item.socketed_items.length) {
      enhanceItems(item.socketed_items, constants, level, item);
    }
    enhanceItem(item, constants, level, parent);
  }
}

export function enhanceItem(item: types.IItem, constants: types.IConstantData, level: number = 1, parent?: types.IItem) {
  if (parent) {
    //socket item.
    let pt = constants.armor_items[parent.type]
      || constants.weapon_items[parent.type]
      || constants.other_items[item.type];
    let t = constants.other_items[item.type];
    if (t.m) {
      item.magic_attributes = _compactAttributes(t.m[pt.gt], constants);
    }
  }
  let details = null;
  if(constants.armor_items[item.type]) {
    details = constants.armor_items[item.type];
  } else if(constants.weapon_items[item.type]) {
    details = constants.weapon_items[item.type];
    let base_damage = {} as types.IWeaponDamage;
    if(details.mind) base_damage.mindam = details.mind;
    if(details.maxd) base_damage.maxdam = details.maxd;
    if(details.min2d) base_damage.twohandmindam = details.min2d;
    if(details.max2d) base_damage.twohandmaxdam = details.max2d;
    item.base_damage = base_damage;
  } else if(constants.other_items[item.type]) {
     details = constants.other_items[item.type];
  }
  if(details) {
    if(details.rs) item.reqstr = details.rs;
    if(details.rd) item.reqdex = details.rd;
    if(details.i) item.inv_file = details.i;
    if(details.ih) item.inv_height = details.ih;
    if(details.iw) item.inv_width = details.iw;
    if (details.it) item.inv_transform = details.it;
    if (details.itemQuality) item.item_quality = details.itemQuality;
    if (details.c) item.categories = details.c;
    if(item.multiple_pictures) {
      item.inv_file  = details.ig[item.picture_id];
    }
    if(item.magic_prefix || item.magic_suffix) {
      if(item.magic_prefix && constants.magic_prefixes[item.magic_prefix].tc) {
        item.transform_color = constants.magic_prefixes[item.magic_prefix].tc;
      }
      if(item.magic_suffix && constants.magic_suffixes[item.magic_suffix].tc) {
        item.transform_color = constants.magic_suffixes[item.magic_suffix].tc;
      }
    } else if(item.magical_name_ids && item.magical_name_ids.length === 6) {
      for(let i = 0; i < 6; i++) {
        let id = item.magical_name_ids[i];
        if(id) {
          if(i%5==0 && constants.magic_suffixes[id].tc) {
            item.transform_color = constants.magic_suffixes[id].tc;
          } else if(constants.magic_prefixes[id].tc) {
            item.transform_color = constants.magic_prefixes[id].tc;
          }
        }
      }
    } else if(item.unique_id) {
      let unq = constants.unq_items[item.unique_id];
      if(details.ui) item.inv_file = details.ui;
      if(unq && unq.i) item.inv_file = unq.i;
      if(unq && unq.tc) item.transform_color = unq.tc;
    } else if(item.set_id) {
      let set = constants.set_items[item.set_id];
      if(details.ui) item.inv_file = details.ui;
      if(set && set.i) item.inv_file = set.i;
      if(set && set.tc) item.transform_color = set.tc;
    }
  }

  if (item.magic_attributes || item.runeword_attributes || item.socketed_items) {
    _enhanceAttributeDescription(item.magic_attributes, constants, level);
    _enhanceAttributeDescription(item.runeword_attributes, constants, level);
    item.combined_magic_attributes = _groupAttributes(_allAttributes(item, constants), constants);
    _enhanceAttributeDescription(item.combined_magic_attributes, constants, level);
  }
}

function _enhanceAttributeDescription(magic_attributes: types.IMagicProperty[], constants: types.IConstantData, level: number = 1) {
  if(!magic_attributes) {
    return;
  }
  let dgrps = [0, 0, 0];
  let dgrpsVal = [0, 0, 0];
  for (const property of magic_attributes) {
    let prop = constants.magical_properties[property.id];
    let v = property.values[property.values.length - 1];
    if (prop.dg) {
      if (dgrpsVal[prop.dg - 1] === 0) {
        dgrpsVal[prop.dg - 1] = v;
      }
      if ((dgrpsVal[prop.dg - 1] - v) === 0) {
        dgrps[prop.dg - 1]++;
      }
    }
  }
  for (const property of magic_attributes) {
    let prop = constants.magical_properties[property.id];
    if (prop == null) {
      throw new Error(`Cannot find Magical Property for id: ${property.id}`);
    }
    let v = property.values[property.values.length - 1];
    if(prop.ob === "level") {
      switch(prop.o) {
        case 1: {
          v = Math.floor(level * v / 100);
          break;
        }
        case 2:
        case 3:
        case 4:
        case 5: {
          v = Math.floor((level * v) / (2 ** prop.op));
          break;
        }
        default: {
          break;
        }
      }
      property.op_stats = prop.os;
      property.op_value = v;
    }
    let descFunc = prop.dF;
    let descString = (v >= 0) ? prop.dP : prop.dN;
    let descVal = prop.dV;
    let desc2 = prop.d2;
    if (prop.dg && dgrps[prop.dg - 1] === 4) {
      v = dgrpsVal[prop.dg - 1];
      descString = (v >= 0) ? prop.dgP : prop.dgN;
      descVal = prop.dgV;
      descFunc = prop.dgF;
      desc2 = prop.dg2;
    }
    if (prop.np) {
      //damage range or enhanced damage.
      let count = 0;
      descString = prop.dR;
      if(prop.s === "poisonmindam") { //TODO: this is wrong
        property.values[2] = Math.floor(property.values[2] / 25);
        property.values[0] = Math.floor(property.values[0] / property.values[2]);
        property.values[1] = Math.floor(property.values[1] / property.values[2]);
      }
      if (property.values[0] === property.values[1]) {
        count++;
        descString = prop.dE;
        //TODO. why???
        if (prop.s === "item_maxdamage_percent") {
          descString = `+%d% ${descString.replace(/}/gi, '')}`;
        }
      }
      property.description = descString.replace(/%d/gi, () => {
        let v = property.values[count++];
        return v;
      });
    } else {
      _descFunc(property, constants, v, descFunc, descVal, descString, desc2);
    }
  }
  magic_attributes.sort((a, b) => constants.magical_properties[b.id].so - constants.magical_properties[a.id].so);
  for(let i = magic_attributes.length - 1; i > 0; i--) {
    if(magic_attributes[i].description === magic_attributes[i-1].description) {
      magic_attributes[i-1].visible = false;
    }
  }
}

function _compactAttributes(mods: any[], constants: types.IConstantData): types.IMagicProperty[] {
  let magic_attributes = [] as types.IMagicProperty[];
  for (const mod of mods) {
    let properties = constants.properties[mod.m] || [];
    for (let i = 0; i < properties.length; i++) {
      let property = properties[i];
      let stat = property.s;
      switch (property.f) {
        case 5: {
          stat = "mindamage"
          break;
        }
        case 6: {
          stat = "maxdamage"
          break;
        }
        case 7: {
          stat = "item_maxdamage_percent"
          break;
        }
        case 20: {
          stat = "item_indesctructible"
          break;
        }
        default: {
          break;
        }
      }
      let id = _itemStatCostFromStat(stat, constants);      
      let prop = constants.magical_properties[id];
      if (prop.np) i += prop.np;
      let v = [mod.min, mod.max];
      if (mod.p) {
        v.push(mod.p);
      }
      magic_attributes.push({
        id: id,
        values: v,
        name: prop.s
      } as types.IMagicProperty);
    }
  }
  return magic_attributes;
}

function _descFunc(property: types.IMagicProperty, constants: types.IConstantData, v: number, descFunc: number, descVal: number, descString: string, desc2: string) {
  if (!descFunc) {
    return;
  }
  let sign = (v >= 0) ? '+' : '';
  let value = null;
  let desc2Present = (descFunc >= 6 && descFunc <= 10);
  switch (descFunc) {
    case 1:
    case 6:
    case 12: {
      value = `${sign}${v}`;
      break;
    }
    case 2:
    case 7: {
      value = `${v}%`;
      break;
    }
    case 3:
    case 9: {
      value = `${v}`;
      break;
    }
    case 4:
    case 8: {
      value = `${sign}${v}%`;
      break;
    }
    case 5:
    case 10: {
      value = `${v * 100 / 128}%`;
      break;
    }
    case 11: {
      property.description = descString.replace(/%d/, (v / 100).toString());
      break;
    }
    case 13: {
      let clazz = constants.classes[property.values[0]];
      property.description = `${sign}${v} ${clazz.as}`;
      break;
    }
    case 14: {
      let clazz = constants.classes[property.values[1]];
      let skillTabStr = clazz.ts[property.values[0]];
      descString = skillTabStr.replace(/%d/gi, v);
      property.description = `${descString} ${clazz.co}`;
      break;
    }
    case 15: { //todo... not right % chance?
      let count = 2;
      descString = descString.replace(/%d%|%s/gi, () => {
        let v = property.values[count--];
        if (count == 0) {
          return constants.skills[v].s;
        }
        return v;
      }).replace(/%d/, property.values[count--].toString());
      property.description = `${descString}`;
      break;
    }
    case 16: {
      property.description = descString.replace(/%d/, v.toString());
      property.description = property.description.replace(/%s/, constants.skills[property.values[0]].s);
      break;
    }
    case 17: {  //todo
      property.description = `${v} ${descString} (Increases near [time])`;
      break;
    }
    case 18: { //todo
      property.description = `${v}% ${descString} (Increases near [time])`;
      break;
    }
    case 19: {
      property.description = descString.replace(/%d/, v.toString());
      break;
    }
    case 20: {
      value = `${v * -1}%`;
      break;
    }
    case 21: {
      value = `${v * -1}`;
      break;
    }
    case 22: { //todo
      property.description = `${v}% ${descString} [montype]`;
      break;
    }
    case 23: { //todo
      property.description = `${v}% ${descString} [monster]]`;
      break;
    }
    case 24: {
      //charges
      let count = 0;
      descString = descString.replace(/%d/gi, () => {
        return property.values[2 + (count++)].toString();
      });
      property.description = `Level ${property.values[0]} ${constants.skills[property.values[1]].s} ${descString}`;
      break;
    }
    case 27: {
      let skill = constants.skills[property.values[0]];
      let clazz = _classFromCode(skill.c, constants);
      property.description = `${sign}${v} to ${skill.s} ${clazz.co}`;
      break;
    }
    case 28: {
      let skill = constants.skills[property.values[0]];
      property.description = `${sign}${v} to ${skill.s}`;
      break;
    }
    default: {
      throw new Error(`No handler for descFunc: ${descFunc}`);
    }
  }
  if (value) {
    switch (descVal) {
      case 0: {
        property.description = `${descString}`;
        break;
      }
      case 1: {
        property.description = `${value} ${descString}`;
        break;
      }
      case 2: {
        property.description = `${descString} ${value}`;
        break;
      }
      default: {
        throw new Error(`No handler for descVal: ${descVal}`);
      }
    }
  }
  if (desc2Present) {
    property.description += ` ${desc2}`;
  }
}



function _itemStatCostFromStat(stat: string, constants: types.IConstantData): number {
  return constants.magical_properties.findIndex(e => e.s === stat);
}

function _classFromCode(code: string, constants: types.IConstantData): any {
  return constants.classes.filter(e => e.c === code)[0];
}

function _allAttributes(item: types.IItem, constants: types.IConstantData): types.IMagicProperty[] {
  let socketed_attributes = [] as types.IMagicProperty[];
  if (item.socketed_items) {
    for (const i of item.socketed_items) {
      socketed_attributes = socketed_attributes.concat(...i.magic_attributes);
    }
  }
  let magic_attributes = item.magic_attributes || [];
  let runeword_attributes = item.runeword_attributes || [];
  return [...[], ...magic_attributes, ...runeword_attributes, ...socketed_attributes].filter(attribute => attribute != null);
}

function _groupAttributes(all_attributes: types.IMagicProperty[], constants: types.IConstantData): types.IMagicProperty[] {
  let combined_magic_attributes = [] as types.IMagicProperty[];
  for (const magic_attribute of all_attributes) {
    let prop = constants.magical_properties[magic_attribute.id];
    let properties = combined_magic_attributes.filter(e => { 
      //encoded skills need to look at those params too.
      if(prop.e === 3) {
        return e.id === magic_attribute.id 
          && e.values[0] === magic_attribute.values[0] && e.values[1] === magic_attribute.values[1]
      }
      return e.id === magic_attribute.id
    });
    if(properties && properties.length) {
      for(let i = 0; i < properties.length; i++) {
        let property = properties[i];
        if (prop.np) { //damage props
          property.values[0] += magic_attribute.values[0];
          property.values[1] += magic_attribute.values[1];
          break;
        }
        //only combine attributes if the params for the descFunc are the same.
        let sameParams = true;
        let numValues = (prop.e === 3) ? 2 : 1;
        for(let j = 0; j < property.values.length - numValues; j++) {
          sameParams = property.values[j] === magic_attribute.values[j];
          if(!sameParams) {
            break;
          }
        }
        if(sameParams) {
          for(let j = 1; j <= numValues; j++) {
            let idx = property.values.length - j;
            property.values[idx] += magic_attribute.values[idx];
          }
        } else {
          combined_magic_attributes.push({
            id: magic_attribute.id,
            values: magic_attribute.values,
            name: magic_attribute.name
          } as types.IMagicProperty);
        }
      }
    } else {
      combined_magic_attributes.push({
        id: magic_attribute.id,
        values: magic_attribute.values,
        name: magic_attribute.name
      } as types.IMagicProperty);
    }
  }
  return combined_magic_attributes;
}