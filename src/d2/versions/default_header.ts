import * as types from '../types'
import { BinaryReader } from '../../binary/binaryreader'
import { BinaryWriter } from '../../binary/binarywriter'
import { _writeBits, _readBits } from '../../util';

const difficulties = ["normal", "nm", "hell"];

export function readHeader(char: types.ID2S, reader: BinaryReader, constants: types.IConstantData) {
  char.header.filesize = reader.ReadUInt32();                                  //0x0008
  char.header.checksum = reader.ReadUInt32().toString(16).padStart(8, '0');    //0x000c
  reader.Skip(4);                                                              //0x0010
  char.header.name = reader.ReadString(16).replace(/\0/g, '');                 //0x0014
  char.header.status = _readStatus(reader.ReadUInt8());                        //0x0024
  char.header.progression = reader.ReadUInt8();                                //0x0025
  char.header.active_arms = reader.ReadUInt16();                               //0x0026 [unk = 0x0, 0x0]
  char.header.class = constants.classes[reader.ReadUInt8()]!.n;            //0x0028
  reader.Skip(2);                                                              //0x0029 [unk = 0x10, 0x1E]
  char.header.level = reader.ReadUInt8();                                      //0x002b
  char.header.created = reader.ReadUInt32();                                   //0x002c
  char.header.last_played = reader.ReadUInt32();                               //0x0030
  reader.Skip(4);                                                              //0x0034 [unk = 0xff, 0xff, 0xff, 0xff]
  char.header.assigned_skills = _readAssignedSkills(reader.ReadArray(64), constants);     //0x0038
  char.header.left_skill = constants.skills[reader.ReadUInt32()]!.s;       //0x0078
  char.header.right_skill = constants.skills[reader.ReadUInt32()]!.s;      //0x007c
  char.header.left_swap_skill = constants.skills[reader.ReadUInt32()]!.s;  //0x0080
  char.header.right_swap_skill = constants.skills[reader.ReadUInt32()]!.s; //0x0084
  char.header.menu_appearance = _readCharMenuAppearance(reader.ReadArray(32), constants); //0x0088 [char menu appearance]
  char.header.difficulty = _readDifficulty(reader.ReadArray(3));               //0x00a8
  char.header.map_id = reader.ReadUInt32();                                    //0x00ab
  reader.Skip(2);                                                              //0x00af [unk = 0x0, 0x0]
  char.header.dead_merc = reader.ReadUInt16();                                 //0x00b1
  char.header.merc_id = reader.ReadUInt32().toString(16);                      //0x00b3
  char.header.merc_name_id = reader.ReadUInt16();                              //0x00b7
  char.header.merc_type = reader.ReadUInt16();                                 //0x00b9
  char.header.merc_experience = reader.ReadUInt32();                           //0x00bb
  reader.Skip(144);                                                            //0x00bf [unk]
  reader.Skip(4);                                                              //0x014f [quests header identifier = 0x57, 0x6f, 0x6f, 0x21 "Woo!"]
  reader.Skip(4);                                                              //0x0153 [version = 0x6, 0x0, 0x0, 0x0]
  reader.Skip(2);                                                              //0x0153 [quests header length = 0x2a, 0x1]
  char.header.quests_normal = _readQuests(reader.ReadArray(96));               //0x0159
  char.header.quests_nm = _readQuests(reader.ReadArray(96));                   //0x01b9
  char.header.quests_hell = _readQuests(reader.ReadArray(96));                 //0x0219
  reader.Skip(2);                                                              //0x0279 [waypoint header identifier = 0x57, 0x53 "WS"]
  reader.Skip(4);                                                              //0x027b [waypoint header version = 0x1, 0x0, 0x0, 0x0]
  reader.Skip(2);                                                              //0x027f [waypoint header length = 0x50, 0x0]
  char.header.waypoints = _readWaypointData(reader.ReadArray(0x48));           //0x0281
  reader.Skip(2);                                                              //0x02c9 [npc header identifier  = 0x01, 0x77 ".w"]
  reader.Skip(2);                                                              //0x02ca [npc header length = 0x34]
  char.header.npcs = _readNPCData(reader.ReadArray(0x30));                     //0x02cc
}

export function writeHeader(char: types.ID2S, writer: BinaryWriter, constants: types.IConstantData) {
  writer.SetLittleEndian()
   .Skip(4)                                                                    //0x0008 (filesize. needs to be writen after all data)
   .Skip(4)                                                                    //0x000c (checksum. needs to be calculated after all data writer)
   .WriteUInt32(char.header.active_arms)                                       //0x0010
   .WriteString(char.header.name, 16)                                          //0x0014
   .WriteArray(_writeStatus(char.header.status))                               //0x0024
   .WriteUInt8(char.header.progression)                                        //0x0025
   .WriteArray(new Uint8Array([0x00, 0x00]))                                   //0x0026
   .WriteUInt8(_classId(char.header.class, constants))                                    //0x0028
   .WriteArray(new Uint8Array([0x10, 0x1e]))                                   //0x0029
   .WriteUInt8(char.header.level)                                              //0x002b
   .WriteArray(new Uint8Array([0x00, 0x00, 0x00, 0x00]))                       //0x002c
   .WriteUInt32(char.header.last_played)                                       //0x0030
   .WriteArray(new Uint8Array([0xff, 0xff, 0xff, 0xff]))                       //0x0034
   .WriteArray(_writeAssignedSkills(char.header.assigned_skills, constants))              //0x0038
   .WriteUInt32(_skillId(char.header.left_skill, constants))                              //0x0078
   .WriteUInt32(_skillId(char.header.right_skill, constants))                             //0x007c
   .WriteUInt32(_skillId(char.header.left_swap_skill, constants))                         //0x0080
   .WriteUInt32(_skillId(char.header.right_swap_skill, constants))                        //0x0084
   .Skip(32)                                                                   //0x0088 [char menu appearance]
   .WriteArray(_writeDifficulty(char.header.difficulty))                       //0x00a8
   .WriteUInt32(char.header.map_id)                                            //0x00ab
   .WriteArray(new Uint8Array([0x00, 0x00]))                                   //0x00af [unk = 0x0, 0x0]
   .WriteUInt16(char.header.dead_merc)                                         //0x00b1
   .WriteUInt32(parseInt(char.header.merc_id,16))                              //0x00b3
   .WriteUInt16(char.header.merc_name_id)                                      //0x00b7
   .WriteUInt16(char.header.merc_type)                                         //0x00b9
   .WriteUInt32(char.header.merc_experience)                                   //0x00bb
   .Skip(140)                                                                  //0x00bf [unk]
   .WriteUInt32(0x1)                                                           //0x014b [unk = 0x1, 0x0, 0x0, 0x0]
   .WriteString("Woo!")                                                        //0x014f [quests = 0x57, 0x6f, 0x6f, 0x21 "Woo!"]
   .WriteArray(new Uint8Array([0x06, 0x00, 0x00, 0x00, 0x2a, 0x01]))           //0x0153 [unk = 0x6, 0x0, 0x0, 0x0, 0x2a, 0x1]
   .WriteArray(_writeQuests(char.header.quests_normal))                        //0x0159
   .WriteArray(_writeQuests(char.header.quests_nm))                            //0x01b9
   .WriteArray(_writeQuests(char.header.quests_hell))                          //0x0219
   .WriteString("WS")                                                          //0x0279 [waypoint data = 0x57, 0x53 "WS"]
   .WriteArray(new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x50, 0x00]))           //0x027b [unk = 0x1, 0x0, 0x0, 0x0, 0x50, 0x0]
   .WriteArray(_writeWaypointData(char.header.waypoints))                         //0x0281
   .WriteArray(new Uint8Array([0x01, 0x77]))                                   //0x02c9 [npc header = 0x01, 0x77 ".w"]
   .WriteUInt16(0x34)                                                          //0x02ca [npc struct length]
   .WriteArray(_writeNPCData(char.header.npcs))                            //0x02cc [npc introduction data... unk]                       
   ;

}

function _classId(name: string, constants: types.IConstantData): number {
  if(!name) return -1;
  return constants.classes.findIndex(c => c && c.n == name);
}

function _skillId(name: string, constants: types.IConstantData): number {
  //default to "attack" if empty string or can't find spellname.
  if(name==="") return 0;
  if(!name) return -1;
  let idx = constants.skills.findIndex(s => s && s.s == name);
  return idx >= 0 ? idx : 0;
}

function _readStatus(byte: number): types.IStatus {
  let status = {} as types.IStatus;
  status.hardcore = ((byte >>> 2 & 1) === 1);
  status.died = ((byte >>> 3 & 1) === 1);
  status.expansion = ((byte >>> 5 & 1) === 1);
  status.ladder = ((byte >>> 6 & 1) === 1);
  return status;
}

function _writeStatus(status: types.IStatus): Uint8Array {
  let arr = new Uint8Array(1);
  arr[0] |= (status.hardcore) ? (1 << 2) : 0;
  arr[0] |= (status.died) ? (1 << 3) : 0;
  arr[0] |= (status.expansion) ? (1 << 5) : 0;
  arr[0] |= (status.ladder) ? (1 << 6) : 0;
  return arr;
}

function _readCharMenuAppearance(bytes: Uint8Array, constants: types.IConstantData): types.ICharMenuAppearance {
  let appearance = {} as types.ICharMenuAppearance;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  let graphics = reader.ReadArray(16);
  let tints = reader.ReadArray(16);
  appearance.head =  { graphic: graphics[0], tint: tints[0] } as types.IMenuAppearance;
  appearance.torso =  { graphic: graphics[1], tint: tints[1] } as types.IMenuAppearance;
  appearance.legs =  { graphic: graphics[2], tint: tints[2] } as types.IMenuAppearance;
  appearance.right_arm =  { graphic: graphics[3], tint: tints[3] } as types.IMenuAppearance;
  appearance.left_arm =  { graphic: graphics[4], tint: tints[4] } as types.IMenuAppearance;
  appearance.right_hand =  { graphic: graphics[5], tint: tints[5] } as types.IMenuAppearance;
  appearance.left_hand =  { graphic: graphics[6], tint: tints[6] } as types.IMenuAppearance;
  appearance.shield =  { graphic: graphics[7], tint: tints[7] } as types.IMenuAppearance;
  appearance.special1 =  { graphic: graphics[8], tint: tints[8] } as types.IMenuAppearance;
  appearance.special2 =  { graphic: graphics[9], tint: tints[9] } as types.IMenuAppearance;
  appearance.special3 =  { graphic: graphics[10], tint: tints[10] } as types.IMenuAppearance;
  appearance.special4 =  { graphic: graphics[11], tint: tints[11] } as types.IMenuAppearance;
  appearance.special5 =  { graphic: graphics[12], tint: tints[12] } as types.IMenuAppearance;
  appearance.special6 =  { graphic: graphics[13], tint: tints[13] } as types.IMenuAppearance;
  appearance.special7 =  { graphic: graphics[14], tint: tints[14] } as types.IMenuAppearance;
  appearance.special8 =  { graphic: graphics[15], tint: tints[15] } as types.IMenuAppearance;
  return appearance;
}

function _readAssignedSkills(bytes: Uint8Array, constants: types.IConstantData): string[] {
  let skills = [] as string[];
  let reader = new BinaryReader(bytes).SetLittleEndian();
  for (let i = 0; i < 16; i++) {
    let skillId = reader.ReadUInt32();
    let skill = constants.skills[skillId];
    if (skill) {
      skills.push(skill.s);
    }
  }
  return skills;
}

function _writeAssignedSkills(skills: string[], constants: types.IConstantData): Uint8Array {
  let writer = new BinaryWriter(64).SetLittleEndian().SetLength(64);
  skills = skills || [];
  for (let i = 0; i < 16; i++) {
    let skillId = _skillId(skills[i], constants);
    if(skillId > 0) {
      writer.WriteUInt32(skillId);
    } else {
      writer.WriteUInt32(0xffff);
    }
  }
  
  return writer.toArray();
}

function _readDifficulty(bytes: Uint8Array): types.IDifficulty {
  let difficulty = {} as types.IDifficulty;
  difficulty.Normal = bytes[0];
  difficulty.Nightmare = bytes[1];
  difficulty.Hell = bytes[2];
  return difficulty;
}

function _writeDifficulty(difficulty: types.IDifficulty): Uint8Array {
  let writer = new BinaryWriter(3).SetLittleEndian().SetLength(3);
  writer.WriteUInt8(difficulty.Normal)
  writer.WriteUInt8(difficulty.Nightmare)
  writer.WriteUInt8(difficulty.Hell)
  return writer.toArray();
}

function _readQuests(bytes: Uint8Array): types.IQuests {
  let quests = {} as types.IQuests;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  quests.act_i = {} as types.IActIQuests;
  quests.act_i.introduced = reader.ReadUInt16() === 0x1;                       //0x0000
  quests.act_i.den_of_evil = _readQuest(reader.ReadArray(2));                  //0x0002
  quests.act_i.sisters_burial_grounds = _readQuest(reader.ReadArray(2));
  quests.act_i.tools_of_the_trade = _readQuest(reader.ReadArray(2));
  quests.act_i.the_search_for_cain = _readQuest(reader.ReadArray(2));
  quests.act_i.the_forgotten_tower = _readQuest(reader.ReadArray(2));
  quests.act_i.sisters_to_the_slaughter = _readQuest(reader.ReadArray(2));
  quests.act_i.completed = reader.ReadUInt16() === 0x1;
  quests.act_ii = {} as types.IActIIQuests;
  quests.act_ii.introduced = reader.ReadUInt16() === 0x1;                      //0x0010 [if jerhyn introduction = 0x01]
  quests.act_ii.radaments_lair = _readQuest(reader.ReadArray(2));              //0x0012
  quests.act_ii.the_horadric_staff = _readQuest(reader.ReadArray(2));
  quests.act_ii.tainted_sun = _readQuest(reader.ReadArray(2));
  quests.act_ii.arcane_sanctuary = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_summoner = _readQuest(reader.ReadArray(2));
  quests.act_ii.the_seven_tombs = _readQuest(reader.ReadArray(2));
  quests.act_ii.completed = reader.ReadUInt16() === 0x1;                       //0x001e
  quests.act_iii = {} as types.IActIIIQuests;
  quests.act_iii.introduced = reader.ReadUInt16() === 0x1;                     //0x0020 [if hratli introduction = 0x01]
  quests.act_iii.lam_esens_tome = _readQuest(reader.ReadArray(2));             //0x0022
  quests.act_iii.khalims_will = _readQuest(reader.ReadArray(2));
  quests.act_iii.blade_of_the_old_religion = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_golden_bird =_readQuest(reader.ReadArray(2));
  quests.act_iii.the_blackened_temple = _readQuest(reader.ReadArray(2));
  quests.act_iii.the_guardian = _readQuest(reader.ReadArray(2));
  quests.act_iii.completed = reader.ReadUInt16() === 0x1;                      //0x002e
  quests.act_iv = {} as types.IActIVQuests;
  quests.act_iv.introduced = reader.ReadUInt16() === 0x1;                      //0x0030 [if activ introduction = 0x01]
  quests.act_iv.the_fallen_angel = _readQuest(reader.ReadArray(2));            //0x0032
  quests.act_iv.terrors_end = _readQuest(reader.ReadArray(2));
  quests.act_iv.hellforge = _readQuest(reader.ReadArray(2));
  quests.act_iv.completed = reader.ReadUInt16() === 0x1;                       //0x0038
  reader.Skip(10);                                                             //0x003a
  quests.act_v = {} as types.IActVQuests;
  quests.act_v.introduced = reader.ReadUInt16() === 0x1;
  quests.act_v.siege_on_harrogath = _readQuest(reader.ReadArray(2));           //0x0046
  quests.act_v.rescue_on_mount_arreat = _readQuest(reader.ReadArray(2));
  quests.act_v.prison_of_ice = _readQuest(reader.ReadArray(2));
  quests.act_v.betrayal_of_harrogath = _readQuest(reader.ReadArray(2));
  quests.act_v.rite_of_passage = _readQuest(reader.ReadArray(2));
  quests.act_v.eve_of_destruction = _readQuest(reader.ReadArray(2));
  quests.act_v.completed = reader.ReadUInt16() === 0x1;
  reader.Skip(12);
  return quests;                                                               //sizeof [0x0060]
}

function _writeQuests(quests: types.IQuests): Uint8Array {
  let writer = new BinaryWriter(96).SetLittleEndian().SetLength(96);
  let difficultyCompleted = +quests.act_v.completed || +quests.act_v.eve_of_destruction.is_completed;
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
    .Skip(6)
    .WriteUInt16(+quests.act_v.introduced || +quests.act_iv.terrors_end.is_completed)
    .Skip(4)
    .WriteArray(_writeQuest(quests.act_v.siege_on_harrogath))
    .WriteArray(_writeQuest(quests.act_v.rescue_on_mount_arreat))
    .WriteArray(_writeQuest(quests.act_v.prison_of_ice))
    .WriteArray(_writeQuest(quests.act_v.betrayal_of_harrogath))
    .WriteArray(_writeQuest(quests.act_v.rite_of_passage))
    .WriteArray(_writeQuest(quests.act_v.eve_of_destruction))
    .WriteUInt8(difficultyCompleted)
    .WriteUInt8(difficultyCompleted ? 0x80 : 0x0) //is this right?
    .Skip(12)
    .toArray()
    ;
}

function _readQuest(bytes: Uint8Array): types.IQuest {
  let quest = {} as types.IQuest;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  let start = reader.Position();
  if(_readBits(reader, start, 15, 1)) quest.unk15 = true;
  if(_readBits(reader, start, 14, 1)) quest.unk14 = true;
  quest.done_recently = _readBits(reader, start, 13, 1) === 1;
  quest.closed = _readBits(reader, start, 12, 1) === 1;
  if(_readBits(reader, start, 11, 1)) quest.unk11 = true;
  if(_readBits(reader, start, 10, 1)) quest.unk10 = true;
  if(_readBits(reader, start, 9, 1)) quest.unk9 = true;
  if(_readBits(reader, start, 8, 1)) quest.unk8 = true;
  if(_readBits(reader, start, 7, 1)) quest.consumed_scroll = true;
  if(_readBits(reader, start, 6, 1)) quest.unk6 = true;
  if(_readBits(reader, start, 5, 1)) quest.unk5 = true;
  if(_readBits(reader, start, 4, 1)) quest.unk4 = true;
  if(_readBits(reader, start, 3, 1)) quest.unk3 = true;
  quest.is_received = _readBits(reader, start, 2, 1) === 1;
  quest.is_requirement_completed = _readBits(reader, start, 1, 1) === 1;
  quest.is_completed = _readBits(reader, start, 0, 1) === 1;
  return quest;
}

function _writeQuest(quest: types.IQuest): Uint8Array {
  let writer = new BinaryWriter(2).SetLittleEndian().SetLength(2);
  let start = writer.Position();
  _writeBits(writer, +quest.unk15, start, 15, 1);
  _writeBits(writer, +quest.done_recently, start, 13, 1);
  _writeBits(writer, +quest.closed, start, 12, 1);
  _writeBits(writer, +quest.unk14, start, 14, 1);
  _writeBits(writer, +quest.unk11, start, 11, 1);
  _writeBits(writer, +quest.unk10, start, 10, 1);
  _writeBits(writer, +quest.unk9, start, 9, 1);
  _writeBits(writer, +quest.unk8, start, 8, 1);
  _writeBits(writer, +quest.consumed_scroll, start, 7, 1);
  _writeBits(writer, +quest.unk6, start, 6, 1);
  _writeBits(writer, +quest.unk5, start, 5, 1);
  _writeBits(writer, +quest.unk4, start, 4, 1);
  _writeBits(writer, +quest.unk3, start, 3, 1);
  _writeBits(writer, +quest.is_received, start, 2, 1);
  _writeBits(writer, +quest.is_requirement_completed, start, 1, 1);
  _writeBits(writer, +quest.is_completed, start, 0, 1);
  return  writer.toArray();
}

function _readWaypointData(bytes: Uint8Array): types.IWaypointData {
  let waypoints = {} as types.IWaypointData;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  for(let i = 0; i < difficulties.length; i++) {
    waypoints[difficulties[i]] = _readWaypoints(reader.ReadArray(24));
  }
  return waypoints;
}

function _readWaypoints(bytes: Uint8Array): types.IWaypoints {
  let waypoints = {} as types.IWaypoints;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  reader.Skip(2); //unk = 0x2, 0x1
  let start = reader.Position();
  waypoints.act_i = {} as types.IActIWaypoints;
  waypoints.act_i.rogue_encampement = _readBits(reader, start, 0, 1) === 1;
  waypoints.act_i.cold_plains = _readBits(reader, start, 1, 1) === 1
  waypoints.act_i.stony_field = _readBits(reader, start, 2, 1) === 1
  waypoints.act_i.dark_woods = _readBits(reader, start, 3, 1) === 1
  waypoints.act_i.black_marsh = _readBits(reader, start, 4, 1) === 1
  waypoints.act_i.outer_cloister = _readBits(reader, start, 5, 1) === 1
  waypoints.act_i.jail_lvl_1 = _readBits(reader, start, 6, 1) === 1
  waypoints.act_i.inner_cloister = _readBits(reader, start, 7, 1) === 1
  waypoints.act_i.catacombs_lvl_2 = _readBits(reader, start, 8, 1) === 1
  waypoints.act_ii = {} as types.IActIIWaypoints;
  waypoints.act_ii.lut_gholein = _readBits(reader, start, 9, 1) === 1
  waypoints.act_ii.sewers_lvl_2 = _readBits(reader, start, 10, 1) === 1
  waypoints.act_ii.dry_hills = _readBits(reader, start, 11, 1) === 1
  waypoints.act_ii.halls_of_the_dead_lvl_2 = _readBits(reader, start, 12, 1) === 1
  waypoints.act_ii.far_oasis = _readBits(reader, start, 13, 1) === 1
  waypoints.act_ii.lost_city = _readBits(reader, start, 14, 1) === 1
  waypoints.act_ii.palace_cellar_lvl_1 = _readBits(reader, start, 15, 1) === 1
  waypoints.act_ii.arcane_sanctuary = _readBits(reader, start, 16, 1) === 1
  waypoints.act_ii.canyon_of_the_magi = _readBits(reader, start, 17, 1) === 1
  waypoints.act_iii = {} as types.IActIIIWaypoints;
  waypoints.act_iii.kurast_docks = _readBits(reader, start, 18, 1) === 1
  waypoints.act_iii.spider_forest = _readBits(reader, start, 19, 1) === 1
  waypoints.act_iii.great_marsh = _readBits(reader, start, 20, 1) === 1
  waypoints.act_iii.flayer_jungle = _readBits(reader, start, 21, 1) === 1
  waypoints.act_iii.lower_kurast = _readBits(reader, start, 22, 1) === 1
  waypoints.act_iii.kurast_bazaar = _readBits(reader, start, 23, 1) === 1
  waypoints.act_iii.upper_kurast = _readBits(reader, start, 24, 1) === 1
  waypoints.act_iii.travincal = _readBits(reader, start, 25, 1) === 1
  waypoints.act_iii.durance_of_hate_lvl_2 = _readBits(reader, start, 26, 1) === 1
  waypoints.act_iv = {} as types.IActIVWaypoints;
  waypoints.act_iv.the_pandemonium_fortress = _readBits(reader, start, 27, 1) === 1
  waypoints.act_iv.city_of_the_damned = _readBits(reader, start, 28, 1) === 1
  waypoints.act_iv.river_of_flame = _readBits(reader, start, 29, 1) === 1
  waypoints.act_v = {} as types.IActVWaypoints;
  waypoints.act_v.harrogath = _readBits(reader, start, 30, 1) === 1
  waypoints.act_v.frigid_highlands = _readBits(reader, start, 31, 1) === 1
  waypoints.act_v.arreat_plateau = _readBits(reader, start, 32, 1) === 1
  waypoints.act_v.crystalline_passage = _readBits(reader, start, 33, 1) === 1
  waypoints.act_v.halls_of_pain = _readBits(reader, start, 34, 1) === 1
  waypoints.act_v.glacial_trail = _readBits(reader, start, 35, 1) === 1
  waypoints.act_v.frozen_tundra = _readBits(reader, start, 36, 1) === 1
  waypoints.act_v.the_ancients_way = _readBits(reader, start, 37, 1) === 1
  waypoints.act_v.worldstone_keep_lvl_2 = _readBits(reader, start, 38, 1) === 1
  reader.Skip(17); //unk
  return waypoints;
}

function _writeWaypointData(waypoints: types.IWaypointData): Uint8Array {
  let writer = new BinaryWriter(72).SetLittleEndian().SetLength(72);
  for(let i = 0; i < difficulties.length; i++) {
    let w = waypoints != null ? waypoints[difficulties[i]] : null;
    writer.WriteArray(_writeWaypoints(w));
  }
  return writer.toArray();
}


function _writeWaypoints(waypoints: types.IWaypoints): Uint8Array {
  let writer = new BinaryWriter(24).SetLittleEndian().SetLength(24);
  writer.WriteArray(new Uint8Array([0x02, 0x01]));
  let start = writer.Position();
  if(waypoints) {
    if(waypoints.act_i) {
      _writeBits(writer, +waypoints.act_i.rogue_encampement, start, 0, 1);
      _writeBits(writer, +waypoints.act_i.cold_plains, start, 1, 1);
      _writeBits(writer, +waypoints.act_i.stony_field, start, 2, 1);
      _writeBits(writer, +waypoints.act_i.dark_woods, start, 3, 1);
      _writeBits(writer, +waypoints.act_i.black_marsh, start, 4, 1);
      _writeBits(writer, +waypoints.act_i.outer_cloister, start, 5, 1);
      _writeBits(writer, +waypoints.act_i.jail_lvl_1, start, 6, 1);
      _writeBits(writer, +waypoints.act_i.inner_cloister, start, 7, 1);
      _writeBits(writer, +waypoints.act_i.catacombs_lvl_2, start, 8, 1);
    }
    if(waypoints.act_ii) {
      _writeBits(writer, +waypoints.act_ii.lut_gholein, start, 9, 1);
      _writeBits(writer, +waypoints.act_ii.sewers_lvl_2, start, 10, 1);
      _writeBits(writer, +waypoints.act_ii.dry_hills, start, 11, 1);
      _writeBits(writer, +waypoints.act_ii.halls_of_the_dead_lvl_2, start, 12, 1);
      _writeBits(writer, +waypoints.act_ii.far_oasis, start, 13, 1);
      _writeBits(writer, +waypoints.act_ii.lost_city, start, 14, 1);
      _writeBits(writer, +waypoints.act_ii.palace_cellar_lvl_1, start, 15, 1);
      _writeBits(writer, +waypoints.act_ii.arcane_sanctuary, start, 16, 1);
      _writeBits(writer, +waypoints.act_ii.canyon_of_the_magi, start, 17, 1);
    }
    if(waypoints.act_iii) {
      _writeBits(writer, +waypoints.act_iii.kurast_docks, start, 18, 1);
      _writeBits(writer, +waypoints.act_iii.spider_forest, start, 19, 1);
      _writeBits(writer, +waypoints.act_iii.great_marsh, start, 20, 1);
      _writeBits(writer, +waypoints.act_iii.flayer_jungle, start, 21, 1);
      _writeBits(writer, +waypoints.act_iii.lower_kurast, start, 22, 1);
      _writeBits(writer, +waypoints.act_iii.kurast_bazaar, start, 23, 1);
      _writeBits(writer, +waypoints.act_iii.upper_kurast, start, 24, 1);
      _writeBits(writer, +waypoints.act_iii.travincal, start, 25, 1);
      _writeBits(writer, +waypoints.act_iii.durance_of_hate_lvl_2, start, 26, 1);
    }
    if(waypoints.act_iv) {
      _writeBits(writer, +waypoints.act_iv.the_pandemonium_fortress, start, 27, 1);
      _writeBits(writer, +waypoints.act_iv.city_of_the_damned, start, 28, 1);
      _writeBits(writer, +waypoints.act_iv.river_of_flame, start, 29, 1);
    }
    if(waypoints.act_v) {
      _writeBits(writer, +waypoints.act_v.harrogath, start, 30, 1);
      _writeBits(writer, +waypoints.act_v.frigid_highlands, start, 31, 1);
      _writeBits(writer, +waypoints.act_v.arreat_plateau, start, 32, 1);
      _writeBits(writer, +waypoints.act_v.crystalline_passage, start, 33, 1);
      _writeBits(writer, +waypoints.act_v.halls_of_pain, start, 34, 1);
      _writeBits(writer, +waypoints.act_v.glacial_trail, start, 35, 1);
      _writeBits(writer, +waypoints.act_v.frozen_tundra, start, 36, 1);
      _writeBits(writer, +waypoints.act_v.the_ancients_way, start, 37, 1);
      _writeBits(writer, +waypoints.act_v.worldstone_keep_lvl_2, start, 38, 1);
    }
  } else {
    //all wps
    //writer.WriteArray(new Uint8Array(5));
    writer.WriteArray(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x7f]));
    //_writeBits(writer, 0x3fffffffff, start, 0, 38);
  }
  writer.Seek(start + 5);
  writer.WriteArray(new Uint8Array(17));
  return writer.toArray();
}

function _readNPCData(bytes: Uint8Array): types.INPCData {
  let npcs = { normal: {}, nm: {}, hell: {} } as types.INPCData;
  let reader = new BinaryReader(bytes).SetLittleEndian();
  let start = reader.Position();
  for(let j = 0 ; j < 3; j++) {
    npcs[difficulties[j]] = {
      warriv_act_ii: { intro: false, congrats: false},
      charsi: { intro: false, congrats: false},
      warriv_act_i: { intro: false, congrats: false},
      kashya: { intro: false, congrats: false},
      akara: { intro: false, congrats: false},
      gheed: { intro: false, congrats: false},
      greiz: { intro: false, congrats: false},
      jerhyn: { intro: false, congrats: false},
      meshif_act_ii: { intro: false, congrats: false},
      geglash: { intro: false, congrats: false},
      lysnader: { intro: false, congrats: false},
      fara: { intro: false, congrats: false},
      drogan: { intro: false, congrats: false},
      alkor: { intro: false, congrats: false},
      hratli: { intro: false, congrats: false},
      ashera: { intro: false, congrats: false},
      cain_act_iii: { intro: false, congrats: false},
      elzix: { intro: false, congrats: false},
      malah: { intro: false, congrats: false},
      anya: { intro: false, congrats: false},
      natalya: { intro: false, congrats: false},
      meshif_act_iii: { intro: false, congrats: false},
      ormus: { intro: false, congrats: false},
      cain_act_v: { intro: false, congrats: false},
      qualkehk: { intro: false, congrats: false},
      nihlathak: { intro: false, congrats: false}, 
    } as types.INPCS;
  }
  //introductions
  for(let j = 0; j < 3; j++) {
    let npc = npcs[difficulties[j]];
    npc.warriv_act_ii.intro = _readBits(reader, start, 0 + (j * 8), 1) === 1;
    npc.charsi.intro = _readBits(reader, start, 2 + (j * 8), 1) === 1;
    npc.warriv_act_i.intro = _readBits(reader, start, 3 + (j * 8), 1) === 1;
    npc.kashya.intro = _readBits(reader, start, 4 + (j * 8), 1) === 1;
    npc.akara.intro = _readBits(reader, start, 5 + (j * 8), 1) === 1;
    npc.gheed.intro = _readBits(reader, start, 6 + (j * 8), 1) === 1;
    npc.greiz.intro = _readBits(reader, start, 8 + (j * 8), 1) === 1;
    npc.jerhyn.intro = _readBits(reader, start, 9 + (j * 8), 1) === 1;
    npc.meshif_act_ii.intro = _readBits(reader, start, 10 + (j * 8), 1) === 1;
    npc.geglash.intro = _readBits(reader, start, 11 + (j * 8), 1) === 1;
    npc.lysnader.intro = _readBits(reader, start, 12 + (j * 8), 1) === 1;
    npc.fara.intro = _readBits(reader, start, 13 + (j * 8), 1) === 1;
    npc.drogan.intro = _readBits(reader, start, 14 + (j * 8), 1) === 1;
    npc.alkor.intro = _readBits(reader, start, 16 + (j * 8), 1) === 1;
    npc.hratli.intro = _readBits(reader, start, 17 + (j * 8), 1) === 1;
    npc.ashera.intro = _readBits(reader, start, 18 + (j * 8), 1) === 1;
    npc.cain_act_iii.intro = _readBits(reader, start, 21 + (j * 8), 1) === 1;
    npc.elzix.intro = _readBits(reader, start, 23 + (j * 8), 1) === 1;
    npc.malah.intro = _readBits(reader, start, 24 + (j * 8), 1) === 1;
    npc.malah.intro = _readBits(reader, start, 24 + (j * 8), 1) === 1;
    npc.anya.intro = _readBits(reader, start, 25 + (j * 8), 1) === 1;
    npc.natalya.intro = _readBits(reader, start, 27 + (j * 8), 1) === 1;
    npc.meshif_act_iii.intro = _readBits(reader, start, 28 + (j * 8), 1) === 1;
    npc.ormus.intro = _readBits(reader, start, 31 + (j * 8), 1) === 1;
    npc.cain_act_v.intro = _readBits(reader, start, 37 + (j * 8), 1) === 1;
    npc.qualkehk.intro = _readBits(reader, start, 38 + (j * 8), 1) === 1;
    npc.nihlathak.intro = _readBits(reader, start, 39 + (j * 8), 1) === 1;
  }
  start += 24;
  //congrats
  for(let j = 0; j < 3; j++) {
    let npc = npcs[difficulties[j]];
    npc.warriv_act_ii.congrats = _readBits(reader, start, 0 + (j * 8), 1) === 1;
    npc.charsi.congrats = _readBits(reader, start, 2 + (j * 8), 1) === 1;
    npc.warriv_act_i.congrats = _readBits(reader, start, 3 + (j * 8), 1) === 1;
    npc.kashya.congrats = _readBits(reader, start, 4 + (j * 8), 1) === 1;
    npc.akara.congrats = _readBits(reader, start, 5 + (j * 8), 1) === 1;
    npc.gheed.congrats = _readBits(reader, start, 6 + (j * 8), 1) === 1;
    npc.greiz.congrats = _readBits(reader, start, 8 + (j * 8), 1) === 1;
    npc.jerhyn.congrats = _readBits(reader, start, 9 + (j * 8), 1) === 1;
    npc.meshif_act_ii.congrats = _readBits(reader, start, 10 + (j * 8), 1) === 1;
    npc.geglash.congrats = _readBits(reader, start, 11 + (j * 8), 1) === 1;
    npc.lysnader.congrats = _readBits(reader, start, 12 + (j * 8), 1) === 1;
    npc.fara.congrats = _readBits(reader, start, 13 + (j * 8), 1) === 1;
    npc.drogan.congrats = _readBits(reader, start, 14 + (j * 8), 1) === 1;
    npc.alkor.congrats = _readBits(reader, start, 16 + (j * 8), 1) === 1;
    npc.hratli.congrats = _readBits(reader, start, 17 + (j * 8), 1) === 1;
    npc.ashera.congrats = _readBits(reader, start, 18 + (j * 8), 1) === 1;
    npc.cain_act_iii.congrats = _readBits(reader, start, 21 + (j * 8), 1) === 1;
    npc.elzix.congrats = _readBits(reader, start, 23 + (j * 8), 1) === 1;
    npc.malah.congrats = _readBits(reader, start, 24 + (j * 8), 1) === 1;
    npc.malah.congrats = _readBits(reader, start, 24 + (j * 8), 1) === 1;
    npc.anya.congrats = _readBits(reader, start, 25 + (j * 8), 1) === 1;
    npc.natalya.congrats = _readBits(reader, start, 27 + (j * 8), 1) === 1;
    npc.meshif_act_iii.congrats = _readBits(reader, start, 28 + (j * 8), 1) === 1;
    npc.ormus.congrats = _readBits(reader, start, 31 + (j * 8), 1) === 1;
    npc.cain_act_v.congrats = _readBits(reader, start, 37 + (j * 8), 1) === 1;
    npc.qualkehk.congrats = _readBits(reader, start, 38 + (j * 8), 1) === 1;
    npc.nihlathak.congrats = _readBits(reader, start, 39 + (j * 8), 1) === 1;
  }
  return npcs;
}

function _writeNPCData(npcs: types.INPCData): Uint8Array {
  let writer = new BinaryWriter(0x30).SetLittleEndian().SetLength(0x30);
  let start = writer.Position();
  if(npcs) {
    for(let j = 0 ; j < 3; j++) {
      let npc = npcs[difficulties[j]];
      _writeBits(writer, +npc.warriv_act_ii.intro, start, 0 + (j * 8), 1);
      _writeBits(writer, +npc.charsi.intro, start, 2 + (j * 8), 1);
      _writeBits(writer, +npc.warriv_act_i.intro, start, 3 + (j * 8), 1);
      _writeBits(writer, +npc.kashya.intro, start, 4 + (j * 8), 1);
      _writeBits(writer, +npc.akara.intro, start, 5 + (j * 8), 1);
      _writeBits(writer, +npc.gheed.intro, start, 6 + (j * 8), 1);
      _writeBits(writer, +npc.greiz.intro, start, 8 + (j * 8), 1);
      _writeBits(writer, +npc.jerhyn.intro, start, 9 + (j * 8), 1);
      _writeBits(writer, +npc.meshif_act_ii.intro, start, 10 + (j * 8), 1);
      _writeBits(writer, +npc.geglash.intro, start, 11 + (j * 8), 1);
      _writeBits(writer, +npc.lysnader.intro, start, 12 + (j * 8), 1);
      _writeBits(writer, +npc.fara.intro, start, 13 + (j * 8), 1);
      _writeBits(writer, +npc.drogan.intro, start, 14 + (j * 8), 1);
      _writeBits(writer, +npc.alkor.intro, start, 16 + (j * 8), 1);
      _writeBits(writer, +npc.hratli.intro, start, 17 + (j * 8), 1);
      _writeBits(writer, +npc.ashera.intro, start, 18 + (j * 8), 1);
      _writeBits(writer, +npc.cain_act_iii.intro, start, 21 + (j * 8), 1);
      _writeBits(writer, +npc.elzix.intro, start, 23 + (j * 8), 1);
      _writeBits(writer, +npc.malah.intro, start, 24 + (j * 8), 1);
      _writeBits(writer, +npc.malah.intro, start, 24 + (j * 8), 1);
      _writeBits(writer, +npc.anya.intro, start, 25 + (j * 8), 1);
      _writeBits(writer, +npc.natalya.intro, start, 27 + (j * 8), 1);
      _writeBits(writer, +npc.meshif_act_iii.intro, start, 28 + (j * 8), 1);
      _writeBits(writer, +npc.ormus.intro, start, 31 + (j * 8), 1);
      _writeBits(writer, +npc.cain_act_v.intro, start, 37 + (j * 8), 1);
      _writeBits(writer, +npc.qualkehk.intro, start, 38 + (j * 8), 1);
      _writeBits(writer, +npc.nihlathak.intro, start, 39 + (j * 8), 1);
    }
    start += 24;
    for(let j = 0 ; j < 3; j++) {
      let npc = npcs[difficulties[j]];
      _writeBits(writer, +npc.warriv_act_ii.congrats, start, 0 + (j * 8), 1);
      _writeBits(writer, +npc.charsi.congrats, start, 2 + (j * 8), 1);
      _writeBits(writer, +npc.warriv_act_i.congrats, start, 3 + (j * 8), 1);
      _writeBits(writer, +npc.kashya.congrats, start, 4 + (j * 8), 1);
      _writeBits(writer, +npc.akara.congrats, start, 5 + (j * 8), 1);
      _writeBits(writer, +npc.gheed.congrats, start, 6 + (j * 8), 1);
      _writeBits(writer, +npc.greiz.congrats, start, 8 + (j * 8), 1);
      _writeBits(writer, +npc.jerhyn.congrats, start, 9 + (j * 8), 1);
      _writeBits(writer, +npc.meshif_act_ii.congrats, start, 10 + (j * 8), 1);
      _writeBits(writer, +npc.geglash.congrats, start, 11 + (j * 8), 1);
      _writeBits(writer, +npc.lysnader.congrats, start, 12 + (j * 8), 1);
      _writeBits(writer, +npc.fara.congrats, start, 13 + (j * 8), 1);
      _writeBits(writer, +npc.drogan.congrats, start, 14 + (j * 8), 1);
      _writeBits(writer, +npc.alkor.congrats, start, 16 + (j * 8), 1);
      _writeBits(writer, +npc.hratli.congrats, start, 17 + (j * 8), 1);
      _writeBits(writer, +npc.ashera.congrats, start, 18 + (j * 8), 1);
      _writeBits(writer, +npc.cain_act_iii.congrats, start, 21 + (j * 8), 1);
      _writeBits(writer, +npc.elzix.congrats, start, 23 + (j * 8), 1);
      _writeBits(writer, +npc.malah.congrats, start, 24 + (j * 8), 1);
      _writeBits(writer, +npc.malah.congrats, start, 24 + (j * 8), 1);
      _writeBits(writer, +npc.anya.congrats, start, 25 + (j * 8), 1);
      _writeBits(writer, +npc.natalya.congrats, start, 27 + (j * 8), 1);
      _writeBits(writer, +npc.meshif_act_iii.congrats, start, 28 + (j * 8), 1);
      _writeBits(writer, +npc.ormus.congrats, start, 31 + (j * 8), 1);
      _writeBits(writer, +npc.cain_act_v.congrats, start, 37 + (j * 8), 1);
      _writeBits(writer, +npc.qualkehk.congrats, start, 38 + (j * 8), 1);
      _writeBits(writer, +npc.nihlathak.congrats, start, 39 + (j * 8), 1);
    }
  }
  return writer.toArray();
}