import * as types from "./types";
import statGroups from "../data/ItemStatGroups.json";
import skillTabs from "../data/SkillTabs.json";

//do nice stuff
//combine group properties (all resists/all stats) and build friendly strings for a ui
//enhanced def/durability/weapon damage.
//lookup socketed compact items (runes/gems) properties for the slot they are in
//compute attributes like str/resists/etc..
export async function enhanceAttributes(char: types.ID2S, constants: types.IConstantData, config?: types.IConfig) {
  enhanceItems(char.items, constants, char.attributes.level, config);
  enhanceItems([char.golem_item], constants, char.attributes.level, config);
  enhanceItems(char.merc_items, constants, char.attributes.level, config);
  enhanceItems(char.corpse_items, constants, char.attributes.level, config);
  enhancePlayerAttributes(char, constants, config);
}

export async function enhancePlayerAttributes(char: types.ID2S, constants: types.IConstantData, config?: types.IConfig) {
  const items = char.items.filter((item) => {
    return item.location_id === 1 && item.equipped_id !== 13 && item.equipped_id !== 14;
  });

  char.item_bonuses = ([] as types.IMagicProperty[]).concat
    .apply(
      [],
      items.map((item) => _allAttributes(item, constants))
    )
    .filter((attribute) => attribute != null);
  //char.item_bonuses = _groupAttributes(char.item_bonuses, constants);
  _enhanceAttributeDescription(char.item_bonuses, constants, char.attributes.level, config);
}

export async function enhanceItems(
  items: types.IItem[],
  constants: types.IConstantData,
  level = 1,
  config?: types.IConfig,
  parent?: types.IItem
) {
  if (!items) {
    return;
  }
  for (const item of items) {
    if (!item) {
      continue;
    }
    if (item.socketed_items && item.socketed_items.length) {
      enhanceItems(item.socketed_items, constants, level, config, item);
    }
    enhanceItem(item, constants, level, config, parent);
  }
}

export function enhanceItem(item: types.IItem, constants: types.IConstantData, level = 1, config?: types.IConfig, parent?: types.IItem) {
  if (parent) {
    //socket item.
    const pt = constants.armor_items[parent.type] || constants.weapon_items[parent.type] || constants.other_items[item.type];
    const t = constants.other_items[item.type];
    if (t.m) {
      item.magic_attributes = compactAttributes(t.m[pt.gt], constants);
    }
  }

  item.level = boundValue(item.level, 1, 99);
  // Ensure coherence of other attributes with quality
  if (item.given_runeword) {
      item.runeword_name = constants.runewords[item.runeword_id] ? constants.runewords[item.runeword_id].n : "";
      if (item.quality > types.Quality.Superior) {
          // Cannot be a runeword
          item.given_runeword = 0;
          item.runeword_id = 0;
          item.runeword_name = "";
          item.runeword_attributes = [];
      }
  }
  if (item.quality !== types.Quality.Magic) {
      item.magic_prefix = 0;
      item.magic_suffix = 0;
  }
  if (item.quality === types.Quality.Rare || item.quality === types.Quality.Crafted) {
      item.rare_name = constants.rare_names[item.rare_name_id] ? constants.rare_names[item.rare_name_id].n : "";
      item.rare_name2 = constants.rare_names[item.rare_name_id2] ? constants.rare_names[item.rare_name_id2].n : "";
  }
  else {
      item.rare_name_id = 0;
      item.rare_name = "";
      item.rare_name_id2 = 0;
      item.rare_name2 = "";
      item.magical_name_ids = [0, 0, 0, 0, 0, 0];
  }
  if (item.quality === types.Quality.Set) {
      item.set_name = constants.set_items[item.set_id] ? constants.set_items[item.set_id].n : "";
  }
  else {
      item.set_id = 0;
      item.set_name = "";
      item.set_attributes = [];
  }
  if (item.quality === types.Quality.Unique) {
      item.unique_name = constants.unq_items[item.unique_id] ? constants.unq_items[item.unique_id].n : "";
  }
  else {
      item.unique_id = 0;
      item.unique_name = "";
  }
  if (item.quality !== types.Quality.Magic && item.quality !== types.Quality.Unique) {
      item.personalized = 0;
      item.personalized_name = "";
  }

  let details = null;
  if (constants.armor_items[item.type]) {
    details = constants.armor_items[item.type];
    item.type_id = types.ItemType.Armor;
    if (details.maxac) {
      if (item.ethereal == 0) {
        item.defense_rating = details.maxac;
      } else if (item.ethereal == 1) {
        item.defense_rating = Math.floor(details.maxac * 1.5);
      }
    }
  } else if (constants.weapon_items[item.type]) {
    details = constants.weapon_items[item.type];
    item.type_id = types.ItemType.Weapon;
    const base_damage = {} as types.IWeaponDamage;
    if (item.ethereal == 0) {
      if (details.mind) base_damage.mindam = details.mind;
      if (details.maxd) base_damage.maxdam = details.maxd;
      if (details.min2d) base_damage.twohandmindam = details.min2d;
      if (details.max2d) base_damage.twohandmaxdam = details.max2d;
    } else if (item.ethereal == 1) {
      if (details.mind) base_damage.mindam = Math.floor(details.mind * 1.5);
      if (details.maxd) base_damage.maxdam = Math.floor(details.maxd * 1.5);
      if (details.min2d) base_damage.twohandmindam = Math.floor(details.min2d * 1.5);
      if (details.max2d) base_damage.twohandmaxdam = Math.floor(details.max2d * 1.5);
    }
    item.base_damage = base_damage;
  } else if (constants.other_items[item.type]) {
    item.type_id = types.ItemType.Other;
    details = constants.other_items[item.type];
  }
  if (details) {
    if (details.n) item.type_name = details.n;
    if (details.rs) item.reqstr = details.rs;
    if (details.rd) item.reqdex = details.rd;
    if (details.i) item.inv_file = details.i;
    if (details.ih) item.inv_height = details.ih;
    if (details.iw) item.inv_width = details.iw;
    if (details.it) item.inv_transform = details.it;
    if (details.iq) item.item_quality = details.iq;
    if (details.c) item.categories = details.c;
    if (details.durability) {
      if (item.ethereal == 0) {
        item.current_durability = details.durability;
        item.max_durability = details.durability;
      } else if (item.ethereal == 1) {
        item.current_durability = details.durability - Math.ceil(details.durability / 2) + 1;
        item.max_durability = details.durability - Math.ceil(details.durability / 2) + 1;
      }
    }
    // Enforce coherence between total_nr_of_sockets & socketed
    if (item.total_nr_of_sockets > 0) {
      item.socketed = 1;
    } else {
      item.socketed = 0;
    }
    if (item.multiple_pictures) {
      item.inv_file = details.ig[item.picture_id];
    }
    if (item.magic_prefix || item.magic_suffix) {
      if (item.magic_prefix && constants.magic_prefixes[item.magic_prefix]?.tc) {
        item.transform_color = constants.magic_prefixes[item.magic_prefix].tc;
      }
      if (item.magic_suffix && constants.magic_suffixes[item.magic_suffix]?.tc) {
        item.transform_color = constants.magic_suffixes[item.magic_suffix].tc;
      }
    } else if (item.magical_name_ids && item.magical_name_ids.length === 6) {
      for (let i = 0; i < 6; i++) {
        const id = item.magical_name_ids[i];
        if (id) {
          if (i % 2 == 0 && constants.magic_prefixes[id] && constants.magic_prefixes[id]?.tc) {
            // even is prefixes
            item.transform_color = constants.magic_prefixes[id].tc;
          } else if (constants.magic_suffixes[id] && constants.magic_suffixes[id]?.tc) {
            // odd is suffixes
            item.transform_color = constants.magic_suffixes[id].tc;
          }
        }
      }
    } else if (item.unique_id) {
      const unq = constants.unq_items[item.unique_id];
      if (details.ui) item.inv_file = details.ui;
      if (unq && unq.i) item.inv_file = unq.i;
      if (unq && unq.tc) item.transform_color = unq.tc;
    } else if (item.set_id) {
      const set = constants.set_items[item.set_id];
      if (details.ui) item.inv_file = details.ui;
      if (set && set.i) item.inv_file = set.i;
      if (set && set.tc) item.transform_color = set.tc;
    }
  }

  if (item.magic_attributes || item.runeword_attributes || item.socketed_items) {
    item.displayed_magic_attributes = _enhanceAttributeDescription(item.magic_attributes, constants, level, config);
    item.displayed_runeword_attributes = _enhanceAttributeDescription(item.runeword_attributes, constants, level, config);
    item.combined_magic_attributes = _allAttributes(item, constants);
    item.displayed_combined_magic_attributes = _enhanceAttributeDescription(item.combined_magic_attributes, constants, level, config);
  }
}

export function compactAttributes(mods: any[], constants: types.IConstantData): types.IMagicProperty[] {
  const modifiers = [] as types.IMagicProperty[];
  for (const mod of mods) {
    for (const stat of constants.properties[mod.prop] || []) {
      const statId = constants.magical_properties.findIndex((e) => e.s === stat.s)
      const prop = constants.magical_properties[statId];
      if (prop) {
        let values: number[] = [];
        let v;
        let param;
        switch (stat.type) {
          case "proc":
            values = [mod.max, mod.p, mod.min];
            v = mod.max;
            break;
          case "charges":
            values = [mod.max, mod.p, mod.min, mod.min];
            v = mod.max;
            break;
          case "all":
            values = [mod.min, mod.max];
            v = mod.max;
            param = mod.p;
            break;
          case "min":
            values = [mod.min, mod.max];
            v = mod.min;
            break;
          case "max":
            values = [mod.min, mod.max];
            v = mod.max;
          case "param":
            values = [mod.p, mod.max];
            v = Number(mod.p);
            if (prop.s == "poisonlength") {
              values = [mod.min, mod.max, mod.p];
            }
            break;
          case "other":
            param = mod.p
              ? prop.s == "item_addskill_tab"
                ? skillTabs[Number(mod.p)].id
                : mod.p
              : stat.val;
            values = prop.s == "item_addskill_tab" 
              //? [Math.abs(Math.floor(mod.p / 3) - 3),  Math.floor(mod.p / 3), mod.min] 
              ? [param & 0x7, (param >> 3) & 0x1fff, mod.max]
              : [param, mod.max];
            v = mod.max;
            if (mod.prop == "skill-rand") {
              const rnd = Math.floor(Math.random() * (mod.max - mod.min) + mod.min);
              values = [constants.skills[rnd]?.id, mod.p];
            }    
            break;
        }
       
        modifiers.push({
          id: statId,
          name: prop.s,
          values: values,
          value: v,
          param: param,
          type: stat.type
        });
      }
    }
  }
  return modifiers;
}  

function _enhanceAttributeDescription(
  _magic_attributes: types.IMagicProperty[],
  constants: types.IConstantData,
  level = 1,
  config?: types.IConfig
): types.IMagicProperty[] {
  if (!_magic_attributes) return [];
  const mods: types.IMagicProperty[] = [..._magic_attributes.map((attr) => ({ ...attr }))];
  
  for (const mod of mods) {
    const prop = constants.magical_properties[mod.id];
    mod.value = mod.values[mod.values?.length - 1];
    mod.param = prop.dF !== 19 ? mod.values[0]: undefined;
    //mod.df =  prop.dF;
    //mod.so = prop.so;
  }

  consolidateMods(mods);

  for (const mod of mods) {
    const prop = constants.magical_properties[mod.id];
      mod.description = describeSingleMod(mod, prop, constants);
  }
 
  addModGroups(mods, constants);
  
  if (config?.sortProperties) {
    mods.sort((a, b) => 
      constants.magical_properties[b.id]?.so - constants.magical_properties[a.id]?.so 
    );
  }
  return mods;
}

function describeSingleMod(
  mod: any,
  prop: any,
  constants: types.IConstantData,
) {
  if (!prop) return;
  let val = mod.value;

  if (prop.s.endsWith("perlevel")) {
    // Per-level mod, we show it for character level 99 for the flair
    if (prop.s.includes("tohit")) {
      val = val! / 2;
    } else {
      val = val! / 8;
    }
    val = Math.floor(99 * val);
  }
  
  let modDesc = (val ?? 0) < 0 ? prop.dN : prop.dP;
  if (prop.id == 39 || prop.id == 41 || prop.id == 43 || prop.id == 45) {
    modDesc = prop.dP;
  }
  let valueDesc: string | undefined;
  switch (prop.dF) {
    case 1: case 6: case 12:
      valueDesc = (val ?? 0) < 0 ? `${val}` : `+${val}`;
      break;
    case 2: case 7:
      valueDesc = `${val}%`;
      break;
    case 3: case 9:
      valueDesc = `${val}`;
      break;
    case 4: case 8:
      valueDesc = (val ?? 0) < 0 ? `${val}%` : `+${val}%`;
      break;
    case 5: case 10: 
      valueDesc = `${Math.floor((val! * 100) / 128)}%`;
      break;
    case 11:
      modDesc = modDesc.replace("%d", `${100 / val!}`);
      break;
    case 13:  // +[value] to [class] Skill Levels
      modDesc = formatStr(constants.classes[mod.values[0]!].as, val);
      break;
    case 14:  // +[value] to [skilltab] Skill Levels ([class] Only)
      const skillTab = constants.classes[mod.values[1]].ts[mod.values[0]];
      if (skillTab) {
        modDesc = `+${val} to ${skillTab} ${constants.classes[mod.values[1]].co}`;
        modDesc = formatStr(skillTab, val) + " " + constants.classes[mod.values[1]].co;
      }
      break;
    case 15:  // [chance]% to cast [slvl] [skill] on [event]
      modDesc = modDesc
        // Extra % because the actual one is doubled to escape it
        .replace("%d%", `${mod.values[2]}`)
        .replace("%d", `${mod.values[0]}`)
        .replace("%s", `${constants.skills[mod.values[1]!].n}`);
      break;
    case 16: // Level [sLvl] [skill] Aura When Equipped
      modDesc = modDesc
        .replace("%d", `${val}`)
        .replace("%s", `${constants.skills[mod.values[0]]?.n}`);
      break;
    case 19: //main
      modDesc = formatStr(modDesc, val);
      break;
    case 20:
      valueDesc = `${-val!}%`;
      break;
    case 21:
      valueDesc = `${-val!}`;
      break;
    case 22:  // [value]% / [montype]
      valueDesc = `${val}%`;
      break;
    case 23:  // [value]% / [montype]
      valueDesc = `${val}%`;
      modDesc = formatStr(modDesc, val)
      break;
    case 24: // charges
      modDesc = formatStr(modDesc, mod.values[0], constants.skills[mod.values[1]].n, mod.values[2], mod.values[3]);
      break;
    case 27: // +[value] to [skill] ([class] Only)
      const skill = constants.skills[mod.values[0]];
      modDesc = formatStr(modDesc, val, skill?.n, constants.classes.filter((e) => e?.c === skill?.c)[0]?.co);
      break;
    case 28: // +[value] to [skill]
      modDesc = formatStr(modDesc, val, constants.skills[mod.values[0]]?.n);
      break;
    // Custom describe functions to handle groups
    case 100:
      // Non-poison elemental or magic damage.
      if (mod.values?.[0] !== mod.values?.[1]) {
        modDesc = prop.dN;
      }
      modDesc = modDesc
        .replace("%d", `${mod.values?.[0]}`)
        .replace("%d", `${mod.values?.[1]}`);
      break;
    case 101: // Poison damage
      if (mod.values?.[0] === mod.values?.[1]) {
        modDesc = modDesc
          .replace( "%d", `${Math.round((mod.values![0] * mod.values![2]) / 256)}`)
          .replace("%d", `${Math.round(mod.values![2] / 25)}`);
      } else {
        modDesc = prop.dN
          .replace("%d", `${Math.round((mod.values![0] * mod.values![2]) / 256)}`)
          .replace("%d", `${Math.round((mod.values![1] * mod.values![2]) / 256)}`)
          .replace("%d", `${Math.round(mod.values![2] / 25)}`);
      }
      break;
  }

  if (modDesc) {
    let fullDesc = "";
    switch (prop.dV) {
      case 1:
        fullDesc = `${valueDesc} ${modDesc}`;
        break;
      case 2:
        fullDesc = `${modDesc} ${valueDesc}`;
        break;
      default:
        fullDesc = modDesc;
    }
    if (6 <= prop.dF && prop.dF <= 9) {
      fullDesc += ` ${prop.d2}`;
    }
  
    return fullDesc;
  }
}

function addModGroups(
  modifiers: types.IMagicProperty[],
  constants: types.IConstantData
  ) {
  for (const group of statGroups) {
    const mods = modifiers?.filter(({ id }) => group.statsInGroup.includes(id)) ?? [];
    // We assume a mods have been merged so we cannot have duplicates
    if (mods.length !== group.statsInGroup.length) {
      continue;
    }
    if (group.allEqual && mods.some(({ value }) => value !== mods[0].value)) {
      continue;
    }
    // On some rare items we can get increase in min damage that's larger than the increase in max damage.
    // The game solves this by displaying them separately.
    if (group.isRange && (mods[0].value ?? 0) > (mods[1].value ?? 0)) {
      continue;
    }
    // Damage increase on non-weapons is awkward, it has all 4 mods that apply in the multiple groups.
    if (
      group.s === "group:secondary-dmg" ||
      group.s === "group:min-dmg" ||
      group.s === "group:max-dmg"
    ) {
      // We already described the range, ignore these "duplicate" groups
      if (modifiers?.find((mod) => mod.name === "group:primary-dmg")) {
        // We still have to remember to delete the description from the mods,
        // primary-dmg only contains 2, not all 4.
        for (const mod of mods) {
          delete mod.description;
        }
        continue;
      }
    }

    const extraMod: types.IMagicProperty = {
      id: -1,
      name: group.s,
      so: group.so,
      df: group.dF,
      value: mods[0].value,
      //value: group.allEqual ? mods[0].value : undefined,
      values: mods.map(({ value }) => value ?? 0),
    };
    extraMod.description = describeSingleMod(extraMod, group, constants);
    modifiers?.push(extraMod);

    // Clear descriptions of items in group so they are not displayed
    for (const mod of mods) {
      delete mod.description;
    }
  }
}

function formatStr(str: string, ...values: any[]) {
  let i = 0;
  return str?.replace(/%(\+)?([ids%\d])/g, (m, plus, chr) => {
    if (chr === '%') {
      return chr;
    } else {
      let value = (chr === 'd' || chr === 's' || chr === 'i' ? values[i++] : values[chr]);
      if (plus && !isNaN(value) && parseInt(value) > 0) value = '+' + value;
      return value;
    }
  });
}

function consolidateMods(mods: types.IMagicProperty[]) {
  for (const mod of mods) {
    let duplicateIndex: number | undefined;
    while (
      (duplicateIndex = mods.findIndex(
        (other) => mod !== other && 
        (mod.id === other.id && "value" in mod && mod.param === other.param)
      )) >= 0
    ) {
      const [duplicate] = mods.splice(duplicateIndex, 1);
      mod.value = (mod.value ?? 0) + (duplicate.value ?? 0);
    }
  }
}

function boundValue(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function _itemStatCostFromStat(stat: string, constants: types.IConstantData): number {
  return constants.magical_properties.findIndex((e) => e.s === stat);
}

function _classFromCode(code: string, constants: types.IConstantData): any {
  return constants.classes.filter((e) => e.c === code)[0];
}

function _allAttributes(item: types.IItem, constants: types.IConstantData): types.IMagicProperty[] {
  let socketed_attributes = [] as types.IMagicProperty[];
  if (item.socketed_items) {
    for (const i of item.socketed_items) {
      if (i.magic_attributes) {
        socketed_attributes = socketed_attributes.concat(...JSON.parse(JSON.stringify(i.magic_attributes)));
      }
    }
  }
  const magic_attributes = item.magic_attributes || [];
  const runeword_attributes = item.runeword_attributes || [];
  return [
    ...[],
    ...JSON.parse(JSON.stringify(magic_attributes)),
    ...JSON.parse(JSON.stringify(runeword_attributes)),
    ...JSON.parse(JSON.stringify(socketed_attributes)),
  ].filter((attribute) => attribute != null);
}