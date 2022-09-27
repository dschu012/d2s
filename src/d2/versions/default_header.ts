import * as types from "../types";
import { BitReader } from "../../binary/bitreader";
import { BitWriter } from "../../binary/bitwriter";

const difficulties = ["normal", "nm", "hell"];

export function readHeader(char: types.ID2S, reader: BitReader, constants: types.IConstantData) {
  char.header.filesize = reader.ReadUInt32(); //0x0008
  char.header.checksum = reader.ReadUInt32().toString(16).padStart(8, "0"); //0x000c
  reader.SkipBytes(4); //0x0010
  if (char.header.version > 0x61) {
    reader.SeekByte(267);
  }
  char.header.name = reader.ReadString(16).replace(/\0/g, ""); //0x0014
  if (char.header.version > 0x61) {
    reader.SeekByte(36);
  }
  char.header.status = _readStatus(reader.ReadUInt8()); //0x0024
  char.header.progression = reader.ReadUInt8(); //0x0025
  char.header.active_arms = reader.ReadUInt16(); //0x0026 [unk = 0x0, 0x0]
  char.header.class = constants.classes[reader.ReadUInt8()]!.n; //0x0028
  reader.SkipBytes(2); //0x0029 [unk = 0x10, 0x1E]
  char.header.level = reader.ReadUInt8(); //0x002b
  char.header.created = reader.ReadUInt32(); //0x002c
  char.header.last_played = reader.ReadUInt32(); //0x0030
  reader.SkipBytes(4); //0x0034 [unk = 0xff, 0xff, 0xff, 0xff]
  char.header.assigned_skills = _readAssignedSkills(reader.ReadArray(64), constants); //0x0038
  char.header.left_skill = constants.skills[reader.ReadUInt32()]?.s; //0x0078
  char.header.right_skill = constants.skills[reader.ReadUInt32()]?.s; //0x007c
  char.header.left_swap_skill = constants.skills[reader.ReadUInt32()]?.s; //0x0080
  char.header.right_swap_skill = constants.skills[reader.ReadUInt32()]?.s; //0x0084
  char.header.menu_appearance = _readCharMenuAppearance(reader.ReadArray(32), constants); //0x0088 [char menu appearance]
  char.header.difficulty = _readDifficulty(reader.ReadArray(3)); //0x00a8
  char.header.map_id = reader.ReadUInt32(); //0x00ab
  reader.SkipBytes(2); //0x00af [unk = 0x0, 0x0]
  char.header.dead_merc = reader.ReadUInt16(); //0x00b1
  char.header.merc_id = reader.ReadUInt32().toString(16); //0x00b3
  char.header.merc_name_id = reader.ReadUInt16(); //0x00b7
  char.header.merc_type = reader.ReadUInt16(); //0x00b9
  char.header.merc_experience = reader.ReadUInt32(); //0x00bb
  reader.SkipBytes(144); //0x00bf [unk]
  reader.SkipBytes(4); //0x014f [quests header identifier = 0x57, 0x6f, 0x6f, 0x21 "Woo!"]
  reader.SkipBytes(4); //0x0153 [version = 0x6, 0x0, 0x0, 0x0]
  reader.SkipBytes(2); //0x0153 [quests header length = 0x2a, 0x1]
  char.header.quests_normal = _readQuests(reader.ReadArray(96)); //0x0159
  char.header.quests_nm = _readQuests(reader.ReadArray(96)); //0x01b9
  char.header.quests_hell = _readQuests(reader.ReadArray(96)); //0x0219
  reader.SkipBytes(2); //0x0279 [waypoint header identifier = 0x57, 0x53 "WS"]
  reader.SkipBytes(4); //0x027b [waypoint header version = 0x1, 0x0, 0x0, 0x0]
  reader.SkipBytes(2); //0x027f [waypoint header length = 0x50, 0x0]
  char.header.waypoints = _readWaypointData(reader.ReadArray(0x48)); //0x0281
  reader.SkipBytes(2); //0x02c9 [npc header identifier  = 0x01, 0x77 ".w"]
  reader.SkipBytes(2); //0x02ca [npc header length = 0x34]
  char.header.npcs = _readNPCData(reader.ReadArray(0x30)); //0x02cc
}

export function writeHeader(char: types.ID2S, writer: BitWriter, constants: types.IConstantData) {
  writer
    .WriteUInt32(0x0) //0x0008 (filesize. needs to be writen after all data)
    .WriteUInt32(0x0); //0x000c (checksum. needs to be calculated after all data writer)

  if (char.header.version > 0x61) {
    writer.WriteArray(new Uint8Array(Array(20).fill(0))); // 0x0010
  } else {
    writer
      .WriteArray(new Uint8Array([0x00, 0x00, 0x00, 0x00])) //0x0010
      .WriteString(char.header.name, 16); //0x0014
  }

  writer
    .WriteArray(_writeStatus(char.header.status)) //0x0024
    .WriteUInt8(char.header.progression) //0x0025
    .WriteUInt16(char.header.active_arms) //0x0026
    .WriteUInt8(_classId(char.header.class, constants)) //0x0028
    .WriteArray(new Uint8Array([0x10, 0x1e])) //0x0029
    .WriteUInt8(char.header.level) //0x002b
    .WriteArray(new Uint8Array([0x00, 0x00, 0x00, 0x00])) //0x002c
    .WriteUInt32(char.header.last_played) //0x0030
    .WriteArray(new Uint8Array([0xff, 0xff, 0xff, 0xff])) //0x0034
    .WriteArray(_writeAssignedSkills(char.header.assigned_skills, constants)) //0x0038
    .WriteUInt32(_skillId(char.header.left_skill, constants)) //0x0078
    .WriteUInt32(_skillId(char.header.right_skill, constants)) //0x007c
    .WriteUInt32(_skillId(char.header.left_swap_skill, constants)) //0x0080
    .WriteUInt32(_skillId(char.header.right_swap_skill, constants)) //0x0084
    .WriteArray(_writeCharMenuAppearance(char.header.menu_appearance, constants)) //0x0088 [char menu appearance]
    .WriteArray(_writeDifficulty(char.header.difficulty)) //0x00a8
    .WriteUInt32(char.header.map_id) //0x00ab
    .WriteArray(new Uint8Array([0x00, 0x00])) //0x00af [unk = 0x0, 0x0]
    .WriteUInt16(char.header.dead_merc) //0x00b1
    .WriteUInt32(parseInt(char.header.merc_id, 16)) //0x00b3
    .WriteUInt16(char.header.merc_name_id) //0x00b7
    .WriteUInt16(char.header.merc_type) //0x00b9
    .WriteUInt32(char.header.merc_experience); //0x00bb

  if (char.header.version > 0x61) {
    writer
      .WriteArray(new Uint8Array(76)) //0x00bf [unk]
      .WriteString(char.header.name, 16) //0x010b
      .WriteArray(new Uint8Array(52)); //0x011b [unk]
  } else {
    writer
      .WriteArray(new Uint8Array(140)) //0x00bf [unk]
      .WriteUInt32(0x1); //0x014b [unk = 0x1, 0x0, 0x0, 0x0]
  }

  writer
    .WriteString("Woo!", 4) //0x014f [quests = 0x57, 0x6f, 0x6f, 0x21 "Woo!"]
    .WriteArray(new Uint8Array([0x06, 0x00, 0x00, 0x00, 0x2a, 0x01])) //0x0153 [unk = 0x6, 0x0, 0x0, 0x0, 0x2a, 0x1]
    .WriteArray(_writeQuests(char.header.quests_normal)) //0x0159
    .WriteArray(_writeQuests(char.header.quests_nm)) //0x01b9
    .WriteArray(_writeQuests(char.header.quests_hell)) //0x0219
    .WriteString("WS", 2) //0x0279 [waypoint data = 0x57, 0x53 "WS"]
    .WriteArray(new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x50, 0x00])) //0x027b [unk = 0x1, 0x0, 0x0, 0x0, 0x50, 0x0]
    .WriteArray(_writeWaypointData(char.header.waypoints)) //0x0281
    .WriteArray(new Uint8Array([0x01, 0x77])) //0x02c9 [npc header = 0x01, 0x77 ".w"]
    .WriteUInt16(0x34) //0x02ca [npc struct length]
    .WriteArray(_writeNPCData(char.header.npcs)); //0x02cc [npc introduction data... unk]
}

function _classId(name: string, constants: types.IConstantData): number {
  if (!name) return -1;
  return constants.classes.findIndex((c) => c && c.n == name);
}

function _skillId(name: string, constants: types.IConstantData): number {
  //default to "attack" if empty string or can't find spellname.
  if (name === "") return 0;
  if (!name) return -1;
  const idx = constants.skills.findIndex((s) => s && s.s == name);
  return idx >= 0 ? idx : 0;
}

function _readStatus(byte: number): types.IStatus {
  const status = {} as types.IStatus;
  status.hardcore = ((byte >>> 2) & 1) === 1;
  status.died = ((byte >>> 3) & 1) === 1;
  status.expansion = ((byte >>> 5) & 1) === 1;
  status.ladder = ((byte >>> 6) & 1) === 1;
  return status;
}

function _writeStatus(status: types.IStatus): Uint8Array {
  const arr = new Uint8Array(1);
  arr[0] |= status.hardcore ? 1 << 2 : 0;
  arr[0] |= status.died ? 1 << 3 : 0;
  arr[0] |= status.expansion ? 1 << 5 : 0;
  arr[0] |= status.ladder ? 1 << 6 : 0;
  return arr;
}

function _readCharMenuAppearance(bytes: Uint8Array, constants: types.IConstantData): types.ICharMenuAppearance {
  const appearance = {} as types.ICharMenuAppearance;
  const reader = new BitReader(bytes);
  const graphics = reader.ReadArray(16);
  const tints = reader.ReadArray(16);
  appearance.head = { graphic: graphics[0], tint: tints[0] } as types.IMenuAppearance;
  appearance.torso = { graphic: graphics[1], tint: tints[1] } as types.IMenuAppearance;
  appearance.legs = { graphic: graphics[2], tint: tints[2] } as types.IMenuAppearance;
  appearance.right_arm = { graphic: graphics[3], tint: tints[3] } as types.IMenuAppearance;
  appearance.left_arm = { graphic: graphics[4], tint: tints[4] } as types.IMenuAppearance;
  appearance.right_hand = { graphic: graphics[5], tint: tints[5] } as types.IMenuAppearance;
  appearance.left_hand = { graphic: graphics[6], tint: tints[6] } as types.IMenuAppearance;
  appearance.shield = { graphic: graphics[7], tint: tints[7] } as types.IMenuAppearance;
  appearance.special1 = { graphic: graphics[8], tint: tints[8] } as types.IMenuAppearance;
  appearance.special2 = { graphic: graphics[9], tint: tints[9] } as types.IMenuAppearance;
  appearance.special3 = { graphic: graphics[10], tint: tints[10] } as types.IMenuAppearance;
  appearance.special4 = { graphic: graphics[11], tint: tints[11] } as types.IMenuAppearance;
  appearance.special5 = { graphic: graphics[12], tint: tints[12] } as types.IMenuAppearance;
  appearance.special6 = { graphic: graphics[13], tint: tints[13] } as types.IMenuAppearance;
  appearance.special7 = { graphic: graphics[14], tint: tints[14] } as types.IMenuAppearance;
  appearance.special8 = { graphic: graphics[15], tint: tints[15] } as types.IMenuAppearance;
  return appearance;
}

function _writeCharMenuAppearance(appearance: types.ICharMenuAppearance, constants: types.IConstantData): Uint8Array {
  const writer = new BitWriter(32);
  writer.length = 32 * 8;

  const graphics: number[] = [];
  graphics.push(appearance && appearance.head ? appearance.head.graphic : 0);
  graphics.push(appearance && appearance.torso ? appearance.torso.graphic : 0);
  graphics.push(appearance && appearance.legs ? appearance.legs.graphic : 0);
  graphics.push(appearance && appearance.right_arm ? appearance.right_arm.graphic : 0);
  graphics.push(appearance && appearance.left_arm ? appearance.left_arm.graphic : 0);
  graphics.push(appearance && appearance.right_hand ? appearance.right_hand.graphic : 0);
  graphics.push(appearance && appearance.left_hand ? appearance.left_hand.graphic : 0);
  graphics.push(appearance && appearance.shield ? appearance.shield.graphic : 0);
  graphics.push(appearance && appearance.special1 ? appearance.special1.graphic : 0);
  graphics.push(appearance && appearance.special2 ? appearance.special2.graphic : 0);
  graphics.push(appearance && appearance.special3 ? appearance.special3.graphic : 0);
  graphics.push(appearance && appearance.special4 ? appearance.special4.graphic : 0);
  graphics.push(appearance && appearance.special5 ? appearance.special5.graphic : 0);
  graphics.push(appearance && appearance.special6 ? appearance.special6.graphic : 0);
  graphics.push(appearance && appearance.special7 ? appearance.special7.graphic : 0);
  graphics.push(appearance && appearance.special8 ? appearance.special8.graphic : 0);

  for (const g of graphics) {
    writer.WriteUInt8(g);
  }

  const tints: number[] = [];
  tints.push(appearance && appearance.head ? appearance.head.tint : 0);
  tints.push(appearance && appearance.torso ? appearance.torso.tint : 0);
  tints.push(appearance && appearance.legs ? appearance.legs.tint : 0);
  tints.push(appearance && appearance.right_arm ? appearance.right_arm.tint : 0);
  tints.push(appearance && appearance.left_arm ? appearance.left_arm.tint : 0);
  tints.push(appearance && appearance.right_hand ? appearance.right_hand.tint : 0);
  tints.push(appearance && appearance.left_hand ? appearance.left_hand.tint : 0);
  tints.push(appearance && appearance.shield ? appearance.shield.tint : 0);
  tints.push(appearance && appearance.special1 ? appearance.special1.tint : 0);
  tints.push(appearance && appearance.special2 ? appearance.special2.tint : 0);
  tints.push(appearance && appearance.special3 ? appearance.special3.tint : 0);
  tints.push(appearance && appearance.special4 ? appearance.special4.tint : 0);
  tints.push(appearance && appearance.special5 ? appearance.special5.tint : 0);
  tints.push(appearance && appearance.special6 ? appearance.special6.tint : 0);
  tints.push(appearance && appearance.special7 ? appearance.special7.tint : 0);
  tints.push(appearance && appearance.special8 ? appearance.special8.tint : 0);

  for (const t of tints) {
    writer.WriteUInt8(t);
  }
  return writer.ToArray();
}

function _readAssignedSkills(bytes: Uint8Array, constants: types.IConstantData): string[] {
  const skills = [] as string[];
  const reader = new BitReader(bytes);
  for (let i = 0; i < 16; i++) {
    const skillId = reader.ReadUInt32();
    const skill = constants.skills[skillId];
    if (skill) {
      skills.push(skill.s);
    }
  }
  return skills;
}

function _writeAssignedSkills(skills: string[], constants: types.IConstantData): Uint8Array {
  const writer = new BitWriter(64);
  writer.length = 64 * 8;
  skills = skills || [];
  for (let i = 0; i < 16; i++) {
    const skillId = _skillId(skills[i], constants);
    if (skillId > 0) {
      writer.WriteUInt32(skillId);
    } else {
      writer.WriteUInt32(0xffff);
    }
  }

  return writer.ToArray();
}

function _readDifficulty(bytes: Uint8Array): types.IDifficulty {
  const difficulty = {} as types.IDifficulty;
  difficulty.Normal = bytes[0];
  difficulty.Nightmare = bytes[1];
  difficulty.Hell = bytes[2];
  return difficulty;
}

function _writeDifficulty(difficulty: types.IDifficulty): Uint8Array {
  const writer = new BitWriter(3);
  writer.length = 3 * 8;
  writer.WriteUInt8(difficulty.Normal);
  writer.WriteUInt8(difficulty.Nightmare);
  writer.WriteUInt8(difficulty.Hell);
  return writer.ToArray();
}

function _readQuests(bytes: Uint8Array): types.IQuests {
  const quests = {} as types.IQuests;
  const reader = new BitReader(bytes);
  quests.act_i = {} as types.IActIQuests;
  quests.act_i.introduced = reader.ReadUInt16() === 0x1; //0x0000
  quests.act_i.den_of_evil = _readQuest(reader.ReadArray(2)); //0x0002
  quests.act_i.sisters_burial_grounds = _readQuest(reader.ReadArray(2));
  quests.act_i.tools_of_the_trade = _readQuest(reader.ReadArray(2));
  quests.act_i.the_search_for_cain = _readQuest(reader.ReadArray(2));
  quests.act_i.the_forgotten_tower = _readQuest(reader.ReadArray(2));
  quests.act_i.sisters_to_the_slaughter = _readQuest(reader.ReadArray(2));
  quests.act_i.completed = reader.ReadUInt16() === 0x1;
  quests.act_ii = {} as types.IActIIQuests;
  quests.act_ii.introduced = reader.ReadUInt16() === 0x1; //0x0010 [if jerhyn introduction = 0x01]
  quests.act_ii.radaments_lair = _readQuest(reader.ReadArray(2)); //0x0012
  quests.act_ii.the_horadric_staff = _readQuest(reader.ReadArray(2));
  quests.act_ii.tainted_sun = _readQuest(reader.ReadArray(2));
  quests.act_ii.arcane_sanctuary = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_summoner = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_seven_tombs = _readQuest(reader.ReadArray(2));
  quests.act_ii.completed = reader.ReadUInt16() === 0x1; //0x001e
  quests.act_iii = {} as types.IActIIIQuests;
  quests.act_iii.introduced = reader.ReadUInt16() === 0x1; //0x0020 [if hratli introduction = 0x01]
  quests.act_iii.lam_esens_tome = _readQuest(reader.ReadArray(2)); //0x0022
  quests.act_iii.khalims_will = _readQuest(reader.ReadArray(2));
  quests.act_iii.blade_of_the_old_religion = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_golden_bird = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_blackened_temple = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_guardian = _readQuest(reader.ReadArray(2));
  quests.act_iii.completed = reader.ReadUInt16() === 0x1; //0x002e
  quests.act_iv = {} as types.IActIVQuests;
  quests.act_iv.introduced = reader.ReadUInt16() === 0x1; //0x0030 [if activ introduction = 0x01]
  quests.act_iv.the_fallen_angel = _readQuest(reader.ReadArray(2)); //0x0032
  quests.act_iv.terrors_end = _readQuest(reader.ReadArray(2));
  quests.act_iv.hellforge = _readQuest(reader.ReadArray(2));
  quests.act_iv.completed = reader.ReadUInt16() === 0x1; //0x0038
  reader.SkipBytes(10); //0x003a
  quests.act_v = {} as types.IActVQuests;
  quests.act_v.introduced = reader.ReadUInt16() === 0x1;
  quests.act_v.siege_on_harrogath = _readQuest(reader.ReadArray(2)); //0x0046
  quests.act_v.rescue_on_mount_arreat = _readQuest(reader.ReadArray(2));
  quests.act_v.prison_of_ice = _readQuest(reader.ReadArray(2));
  quests.act_v.betrayal_of_harrogath = _readQuest(reader.ReadArray(2));
  quests.act_v.rite_of_passage = _readQuest(reader.ReadArray(2));
  quests.act_v.eve_of_destruction = _readQuest(reader.ReadArray(2));
  quests.act_v.completed = reader.ReadUInt16() === 0x1;
  reader.SkipBytes(12);
  return quests; //sizeof [0x0060]
}

function _writeQuests(quests: types.IQuests): Uint8Array {
  const writer = new BitWriter(96);
  writer.length = 96 * 8;
  const difficultyCompleted = +quests.act_v.completed || +quests.act_v.eve_of_destruction.is_completed;
  return writer
    .WriteUInt16(+quests.act_i.introduced)
    .WriteArray(_writeQuest(quests.act_i.den_of_evil))
    .WriteArray(_writeQuest(quests.act_i.sisters_burial_grounds))
    .WriteArray(_writeQuest(quests.act_i.tools_of_the_trade))
    .WriteArray(_writeQuest(quests.act_i.the_search_for_cain))
    .WriteArray(_writeQuest(quests.act_i.the_forgotten_tower))
    .WriteArray(_writeQuest(quests.act_i.sisters_to_the_slaughter))
    .WriteUInt16(+quests.act_i.completed || +quests.act_i.sisters_to_the_slaughter.is_completed)
    .WriteUInt16(+quests.act_ii.introduced || +quests.act_i.sisters_to_the_slaughter.is_completed)
    .WriteArray(_writeQuest(quests.act_ii.radaments_lair))
    .WriteArray(_writeQuest(quests.act_ii.the_horadric_staff))
    .WriteArray(_writeQuest(quests.act_ii.tainted_sun))
    .WriteArray(_writeQuest(quests.act_ii.arcane_sanctuary))
    .WriteArray(_writeQuest(quests.act_ii.the_summoner))
    .WriteArray(_writeQuest(quests.act_ii.the_seven_tombs))
    .WriteUInt16(+quests.act_ii.completed || +quests.act_ii.the_seven_tombs.is_completed)
    .WriteUInt16(+quests.act_iii.introduced || +quests.act_ii.the_seven_tombs.is_completed)
    .WriteArray(_writeQuest(quests.act_iii.lam_esens_tome))
    .WriteArray(_writeQuest(quests.act_iii.khalims_will))
    .WriteArray(_writeQuest(quests.act_iii.blade_of_the_old_religion))
    .WriteArray(_writeQuest(quests.act_iii.the_golden_bird))
    .WriteArray(_writeQuest(quests.act_iii.the_blackened_temple))
    .WriteArray(_writeQuest(quests.act_iii.the_guardian))
    .WriteUInt16(+quests.act_iii.completed || +quests.act_iii.the_guardian.is_completed)
    .WriteUInt16(+quests.act_iv.introduced || +quests.act_iii.the_guardian.is_completed)
    .WriteArray(_writeQuest(quests.act_iv.the_fallen_angel))
    .WriteArray(_writeQuest(quests.act_iv.terrors_end))
    .WriteArray(_writeQuest(quests.act_iv.hellforge))
    .WriteUInt16(+quests.act_iv.completed || +quests.act_iv.terrors_end.is_completed)
    .WriteArray(new Uint8Array(6))
    .WriteUInt16(+quests.act_v.introduced || +quests.act_iv.terrors_end.is_completed)
    .WriteArray(new Uint8Array(4))
    .WriteArray(_writeQuest(quests.act_v.siege_on_harrogath))
    .WriteArray(_writeQuest(quests.act_v.rescue_on_mount_arreat))
    .WriteArray(_writeQuest(quests.act_v.prison_of_ice))
    .WriteArray(_writeQuest(quests.act_v.betrayal_of_harrogath))
    .WriteArray(_writeQuest(quests.act_v.rite_of_passage))
    .WriteArray(_writeQuest(quests.act_v.eve_of_destruction))
    .WriteUInt8(difficultyCompleted)
    .WriteUInt8(difficultyCompleted ? 0x80 : 0x0) //is this right?
    .WriteArray(new Uint8Array(12))
    .ToArray();
}

function _readQuest(bytes: Uint8Array): types.IQuest {
  const quest = {} as types.IQuest;
  const reader = new BitReader(bytes);
  quest.is_completed = reader.ReadBit() === 1;
  quest.is_requirement_completed = reader.ReadBit() === 1;
  quest.is_received = reader.ReadBit() === 1;
  if (reader.ReadBit() === 1) quest.unk3 = true;
  if (reader.ReadBit() === 1) quest.unk4 = true;
  if (reader.ReadBit() === 1) quest.unk5 = true;
  if (reader.ReadBit() === 1) quest.unk6 = true;
  if (reader.ReadBit() === 1) quest.consumed_scroll = true;
  if (reader.ReadBit() === 1) quest.unk8 = true;
  if (reader.ReadBit() === 1) quest.unk9 = true;
  if (reader.ReadBit() === 1) quest.unk10 = true;
  if (reader.ReadBit() === 1) quest.unk11 = true;
  quest.closed = reader.ReadBit() === 1;
  quest.done_recently = reader.ReadBit() === 1;
  if (reader.ReadBit() === 1) quest.unk14 = true;
  if (reader.ReadBit() === 1) quest.unk15 = true;
  return quest;
}

function _writeQuest(quest: types.IQuest): Uint8Array {
  const writer = new BitWriter(2);
  writer.length = 2 * 8;
  writer.WriteBit(+quest.is_completed);
  writer.WriteBit(+quest.is_requirement_completed);
  writer.WriteBit(+quest.is_received);
  writer.WriteBit(+quest.unk3);
  writer.WriteBit(+quest.unk4);
  writer.WriteBit(+quest.unk5);
  writer.WriteBit(+quest.unk6);
  writer.WriteBit(+quest.consumed_scroll);
  writer.WriteBit(+quest.unk8);
  writer.WriteBit(+quest.unk9);
  writer.WriteBit(+quest.unk10);
  writer.WriteBit(+quest.unk11);
  writer.WriteBit(+quest.closed);
  writer.WriteBit(+quest.done_recently);
  writer.WriteBit(+quest.unk14);
  writer.WriteBit(+quest.unk15);
  return writer.ToArray();
}

function _readWaypointData(bytes: Uint8Array): types.IWaypointData {
  const waypoints = {} as types.IWaypointData;
  const reader = new BitReader(bytes);
  for (let i = 0; i < difficulties.length; i++) {
    waypoints[difficulties[i]] = _readWaypoints(reader.ReadArray(24));
  }
  return waypoints;
}

function _readWaypoints(bytes: Uint8Array): types.IWaypoints {
  const waypoints = {} as types.IWaypoints;
  const reader = new BitReader(bytes);
  reader.SkipBytes(2); //unk = 0x2, 0x
  waypoints.act_i = {} as types.IActIWaypoints;
  waypoints.act_i.rogue_encampement = reader.ReadBit() === 1;
  waypoints.act_i.cold_plains = reader.ReadBit() === 1;
  waypoints.act_i.stony_field = reader.ReadBit() === 1;
  waypoints.act_i.dark_woods = reader.ReadBit() === 1;
  waypoints.act_i.black_marsh = reader.ReadBit() === 1;
  waypoints.act_i.outer_cloister = reader.ReadBit() === 1;
  waypoints.act_i.jail_lvl_1 = reader.ReadBit() === 1;
  waypoints.act_i.inner_cloister = reader.ReadBit() === 1;
  waypoints.act_i.catacombs_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_ii = {} as types.IActIIWaypoints;
  waypoints.act_ii.lut_gholein = reader.ReadBit() === 1;
  waypoints.act_ii.sewers_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_ii.dry_hills = reader.ReadBit() === 1;
  waypoints.act_ii.halls_of_the_dead_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_ii.far_oasis = reader.ReadBit() === 1;
  waypoints.act_ii.lost_city = reader.ReadBit() === 1;
  waypoints.act_ii.palace_cellar_lvl_1 = reader.ReadBit() === 1;
  waypoints.act_ii.arcane_sanctuary = reader.ReadBit() === 1;
  waypoints.act_ii.canyon_of_the_magi = reader.ReadBit() === 1;
  waypoints.act_iii = {} as types.IActIIIWaypoints;
  waypoints.act_iii.kurast_docks = reader.ReadBit() === 1;
  waypoints.act_iii.spider_forest = reader.ReadBit() === 1;
  waypoints.act_iii.great_marsh = reader.ReadBit() === 1;
  waypoints.act_iii.flayer_jungle = reader.ReadBit() === 1;
  waypoints.act_iii.lower_kurast = reader.ReadBit() === 1;
  waypoints.act_iii.kurast_bazaar = reader.ReadBit() === 1;
  waypoints.act_iii.upper_kurast = reader.ReadBit() === 1;
  waypoints.act_iii.travincal = reader.ReadBit() === 1;
  waypoints.act_iii.durance_of_hate_lvl_2 = reader.ReadBit() === 1;
  waypoints.act_iv = {} as types.IActIVWaypoints;
  waypoints.act_iv.the_pandemonium_fortress = reader.ReadBit() === 1;
  waypoints.act_iv.city_of_the_damned = reader.ReadBit() === 1;
  waypoints.act_iv.river_of_flame = reader.ReadBit() === 1;
  waypoints.act_v = {} as types.IActVWaypoints;
  waypoints.act_v.harrogath = reader.ReadBit() === 1;
  waypoints.act_v.frigid_highlands = reader.ReadBit() === 1;
  waypoints.act_v.arreat_plateau = reader.ReadBit() === 1;
  waypoints.act_v.crystalline_passage = reader.ReadBit() === 1;
  waypoints.act_v.halls_of_pain = reader.ReadBit() === 1;
  waypoints.act_v.glacial_trail = reader.ReadBit() === 1;
  waypoints.act_v.frozen_tundra = reader.ReadBit() === 1;
  waypoints.act_v.the_ancients_way = reader.ReadBit() === 1;
  waypoints.act_v.worldstone_keep_lvl_2 = reader.ReadBit() === 1;
  reader.Align().SkipBytes(17);
  return waypoints;
}

function _writeWaypointData(waypoints: types.IWaypointData): Uint8Array {
  const writer = new BitWriter(72);
  writer.length = 72 * 8;
  for (let i = 0; i < difficulties.length; i++) {
    const w = waypoints != null ? waypoints[difficulties[i]] : null;
    writer.WriteArray(_writeWaypoints(w));
  }
  return writer.ToArray();
}

function _writeWaypoints(waypoints: types.IWaypoints): Uint8Array {
  const writer = new BitWriter(24);
  writer.length = 24 * 8;
  writer.WriteArray(new Uint8Array([0x02, 0x01]));
  if (waypoints) {
    if (waypoints.act_i) {
      writer.WriteBit(+waypoints.act_i.rogue_encampement);
      writer.WriteBit(+waypoints.act_i.cold_plains);
      writer.WriteBit(+waypoints.act_i.stony_field);
      writer.WriteBit(+waypoints.act_i.dark_woods);
      writer.WriteBit(+waypoints.act_i.black_marsh);
      writer.WriteBit(+waypoints.act_i.outer_cloister);
      writer.WriteBit(+waypoints.act_i.jail_lvl_1);
      writer.WriteBit(+waypoints.act_i.inner_cloister);
      writer.WriteBit(+waypoints.act_i.catacombs_lvl_2);
    }
    if (waypoints.act_ii) {
      writer.WriteBit(+waypoints.act_ii.lut_gholein);
      writer.WriteBit(+waypoints.act_ii.sewers_lvl_2);
      writer.WriteBit(+waypoints.act_ii.dry_hills);
      writer.WriteBit(+waypoints.act_ii.halls_of_the_dead_lvl_2);
      writer.WriteBit(+waypoints.act_ii.far_oasis);
      writer.WriteBit(+waypoints.act_ii.lost_city);
      writer.WriteBit(+waypoints.act_ii.palace_cellar_lvl_1);
      writer.WriteBit(+waypoints.act_ii.arcane_sanctuary);
      writer.WriteBit(+waypoints.act_ii.canyon_of_the_magi);
    }
    if (waypoints.act_iii) {
      writer.WriteBit(+waypoints.act_iii.kurast_docks);
      writer.WriteBit(+waypoints.act_iii.spider_forest);
      writer.WriteBit(+waypoints.act_iii.great_marsh);
      writer.WriteBit(+waypoints.act_iii.flayer_jungle);
      writer.WriteBit(+waypoints.act_iii.lower_kurast);
      writer.WriteBit(+waypoints.act_iii.kurast_bazaar);
      writer.WriteBit(+waypoints.act_iii.upper_kurast);
      writer.WriteBit(+waypoints.act_iii.travincal);
      writer.WriteBit(+waypoints.act_iii.durance_of_hate_lvl_2);
    }
    if (waypoints.act_iv) {
      writer.WriteBit(+waypoints.act_iv.the_pandemonium_fortress);
      writer.WriteBit(+waypoints.act_iv.city_of_the_damned);
      writer.WriteBit(+waypoints.act_iv.river_of_flame);
    }
    if (waypoints.act_v) {
      writer.WriteBit(+waypoints.act_v.harrogath);
      writer.WriteBit(+waypoints.act_v.frigid_highlands);
      writer.WriteBit(+waypoints.act_v.arreat_plateau);
      writer.WriteBit(+waypoints.act_v.crystalline_passage);
      writer.WriteBit(+waypoints.act_v.halls_of_pain);
      writer.WriteBit(+waypoints.act_v.glacial_trail);
      writer.WriteBit(+waypoints.act_v.frozen_tundra);
      writer.WriteBit(+waypoints.act_v.the_ancients_way);
      writer.WriteBit(+waypoints.act_v.worldstone_keep_lvl_2);
    }
  } else {
    //all wps
    //writer.WriteArray(new Uint8Array(5));
    writer.WriteArray(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x7f]));
    //_writeBits(writer, 0x3fffffffff, start, 0, 38);
  }
  writer.Align().WriteArray(new Uint8Array(17));
  return writer.ToArray();
}

function _readNPCData(bytes: Uint8Array): types.INPCData {
  const npcs = { normal: {}, nm: {}, hell: {} } as types.INPCData;
  const reader = new BitReader(bytes);
  for (let j = 0; j < 3; j++) {
    npcs[difficulties[j]] = {
      warriv_act_ii: { intro: false, congrats: false },
      charsi: { intro: false, congrats: false },
      warriv_act_i: { intro: false, congrats: false },
      kashya: { intro: false, congrats: false },
      akara: { intro: false, congrats: false },
      gheed: { intro: false, congrats: false },
      greiz: { intro: false, congrats: false },
      jerhyn: { intro: false, congrats: false },
      meshif_act_ii: { intro: false, congrats: false },
      geglash: { intro: false, congrats: false },
      lysnader: { intro: false, congrats: false },
      fara: { intro: false, congrats: false },
      drogan: { intro: false, congrats: false },
      alkor: { intro: false, congrats: false },
      hratli: { intro: false, congrats: false },
      ashera: { intro: false, congrats: false },
      cain_act_iii: { intro: false, congrats: false },
      elzix: { intro: false, congrats: false },
      malah: { intro: false, congrats: false },
      anya: { intro: false, congrats: false },
      natalya: { intro: false, congrats: false },
      meshif_act_iii: { intro: false, congrats: false },
      ormus: { intro: false, congrats: false },
      cain_act_v: { intro: false, congrats: false },
      qualkehk: { intro: false, congrats: false },
      nihlathak: { intro: false, congrats: false },
    } as types.INPCS;
  }
  //introductions
  for (let i = 0; i < 3; i++) {
    const j = i * 5;
    const npc = npcs[difficulties[i]];
    npc.warriv_act_ii.intro = reader.bits[0 + j * 8] === 1;
    npc.charsi.intro = reader.bits[2 + j * 8] === 1;
    npc.warriv_act_i.intro = reader.bits[3 + j * 8] === 1;
    npc.kashya.intro = reader.bits[4 + j * 8] === 1;
    npc.akara.intro = reader.bits[5 + j * 8] === 1;
    npc.gheed.intro = reader.bits[6 + j * 8] === 1;
    npc.greiz.intro = reader.bits[8 + j * 8] === 1;
    npc.jerhyn.intro = reader.bits[9 + j * 8] === 1;
    npc.meshif_act_ii.intro = reader.bits[10 + j * 8] === 1;
    npc.geglash.intro = reader.bits[11 + j * 8] === 1;
    npc.lysnader.intro = reader.bits[12 + j * 8] === 1;
    npc.fara.intro = reader.bits[13 + j * 8] === 1;
    npc.drogan.intro = reader.bits[14 + j * 8] === 1;
    npc.alkor.intro = reader.bits[16 + j * 8] === 1;
    npc.hratli.intro = reader.bits[17 + j * 8] === 1;
    npc.ashera.intro = reader.bits[18 + j * 8] === 1;
    npc.cain_act_iii.intro = reader.bits[21 + j * 8] === 1;
    npc.elzix.intro = reader.bits[23 + j * 8] === 1;
    npc.malah.intro = reader.bits[24 + j * 8] === 1;
    npc.anya.intro = reader.bits[25 + j * 8] === 1;
    npc.natalya.intro = reader.bits[27 + j * 8] === 1;
    npc.meshif_act_iii.intro = reader.bits[28 + j * 8] === 1;
    npc.ormus.intro = reader.bits[31 + j * 8] === 1;
    npc.cain_act_v.intro = reader.bits[37 + j * 8] === 1;
    npc.qualkehk.intro = reader.bits[38 + j * 8] === 1;
    npc.nihlathak.intro = reader.bits[39 + j * 8] === 1;
  }
  //congrats
  for (let i = 0; i < 3; i++) {
    const j = i * 5;
    const npc = npcs[difficulties[i]];
    npc.warriv_act_ii.congrats = reader.bits[192 + (0 + j * 8)] === 1;
    npc.charsi.congrats = reader.bits[192 + (2 + j * 8)] === 1;
    npc.warriv_act_i.congrats = reader.bits[192 + (3 + j * 8)] === 1;
    npc.kashya.congrats = reader.bits[192 + (4 + j * 8)] === 1;
    npc.akara.congrats = reader.bits[192 + (5 + j * 8)] === 1;
    npc.gheed.congrats = reader.bits[192 + (6 + j * 8)] === 1;
    npc.greiz.congrats = reader.bits[192 + (8 + j * 8)] === 1;
    npc.jerhyn.congrats = reader.bits[192 + (9 + j * 8)] === 1;
    npc.meshif_act_ii.congrats = reader.bits[192 + (10 + j * 8)] === 1;
    npc.geglash.congrats = reader.bits[192 + (11 + j * 8)] === 1;
    npc.lysnader.congrats = reader.bits[192 + (12 + j * 8)] === 1;
    npc.fara.congrats = reader.bits[192 + (13 + j * 8)] === 1;
    npc.drogan.congrats = reader.bits[192 + (14 + j * 8)] === 1;
    npc.alkor.congrats = reader.bits[192 + (16 + j * 8)] === 1;
    npc.hratli.congrats = reader.bits[192 + (17 + j * 8)] === 1;
    npc.ashera.congrats = reader.bits[192 + (18 + j * 8)] === 1;
    npc.cain_act_iii.congrats = reader.bits[192 + (21 + j * 8)] === 1;
    npc.elzix.congrats = reader.bits[192 + (23 + j * 8)] === 1;
    npc.malah.congrats = reader.bits[192 + (24 + j * 8)] === 1;
    npc.anya.congrats = reader.bits[192 + (25 + j * 8)] === 1;
    npc.natalya.congrats = reader.bits[192 + (27 + j * 8)] === 1;
    npc.meshif_act_iii.congrats = reader.bits[192 + (28 + j * 8)] === 1;
    npc.ormus.congrats = reader.bits[192 + (31 + j * 8)] === 1;
    npc.cain_act_v.congrats = reader.bits[192 + (37 + j * 8)] === 1;
    npc.qualkehk.congrats = reader.bits[192 + (38 + j * 8)] === 1;
    npc.nihlathak.congrats = reader.bits[192 + (39 + j * 8)] === 1;
  }
  return npcs;
}

function _writeNPCData(npcs: types.INPCData): Uint8Array {
  const writer = new BitWriter(0x30);
  writer.length = 0x30 * 8;
  if (npcs) {
    for (let j = 0; j < 3; j++) {
      const npc = npcs[difficulties[j]];
      writer.SeekByte(j * 5);
      writer.WriteBit(+npc.warriv_act_ii.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.charsi.intro);
      writer.WriteBit(+npc.warriv_act_i.intro);
      writer.WriteBit(+npc.kashya.intro);
      writer.WriteBit(+npc.akara.intro);
      writer.WriteBit(+npc.gheed.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.greiz.intro);
      writer.WriteBit(+npc.jerhyn.intro);
      writer.WriteBit(+npc.meshif_act_ii.intro);
      writer.WriteBit(+npc.geglash.intro);
      writer.WriteBit(+npc.lysnader.intro);
      writer.WriteBit(+npc.fara.intro);
      writer.WriteBit(+npc.drogan.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.alkor.intro);
      writer.WriteBit(+npc.hratli.intro);
      writer.WriteBit(+npc.ashera.intro);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.cain_act_iii.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.elzix.intro);
      writer.WriteBit(+npc.malah.intro);
      writer.WriteBit(+npc.anya.intro);
      writer.WriteBit(0);
      writer.WriteBit(+npc.natalya.intro);
      writer.WriteBit(+npc.meshif_act_iii.intro);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.ormus.intro);
      writer.WriteBits(new Uint8Array(5).fill(0), 5);
      writer.WriteBit(+npc.cain_act_v.intro);
      writer.WriteBit(+npc.qualkehk.intro);
      writer.WriteBit(+npc.nihlathak.intro);
    }
    for (let j = 0; j < 3; j++) {
      writer.SeekByte(24 + j * 5);
      const npc = npcs[difficulties[j]];
      writer.WriteBit(+npc.warriv_act_ii.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.charsi.congrats);
      writer.WriteBit(+npc.warriv_act_i.congrats);
      writer.WriteBit(+npc.kashya.congrats);
      writer.WriteBit(+npc.akara.congrats);
      writer.WriteBit(+npc.gheed.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.greiz.congrats);
      writer.WriteBit(+npc.jerhyn.congrats);
      writer.WriteBit(+npc.meshif_act_ii.congrats);
      writer.WriteBit(+npc.geglash.congrats);
      writer.WriteBit(+npc.lysnader.congrats);
      writer.WriteBit(+npc.fara.congrats);
      writer.WriteBit(+npc.drogan.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.alkor.congrats);
      writer.WriteBit(+npc.hratli.congrats);
      writer.WriteBit(+npc.ashera.congrats);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.cain_act_iii.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.elzix.congrats);
      writer.WriteBit(+npc.malah.congrats);
      writer.WriteBit(+npc.anya.congrats);
      writer.WriteBit(0);
      writer.WriteBit(+npc.natalya.congrats);
      writer.WriteBit(+npc.meshif_act_iii.congrats);
      writer.WriteBits(new Uint8Array(2).fill(0), 2);
      writer.WriteBit(+npc.ormus.congrats);
      writer.WriteBits(new Uint8Array(5).fill(0), 5);
      writer.WriteBit(+npc.cain_act_v.congrats);
      writer.WriteBit(+npc.qualkehk.congrats);
      writer.WriteBit(+npc.nihlathak.congrats);
    }
  }
  return writer.ToArray();
}
