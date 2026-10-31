import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class PlayerSchema extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') x: number = 0;
  @type('number') z: number = 20;
  @type('number') rotation: number = 0;
  @type('string') action: string = 'idle';
  @type('string') robeColor: string = 'brown';
  @type('number') cushionIndex: number = -1;
  @type('boolean') connected: boolean = true;
  @type('number') disconnectedAt: number = 0;
  @type('number') exp: number = 0;
  @type('number') level: number = 1;
}

export class IncenseStickSchema extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = '';
  @type('string') ownerName: string = '';
  @type('number') slotIndex: number = 0;
  @type('number') createdAt: number = 0;
  @type('number') expiresAt: number = 0;
}

export class ChatMessageSchema extends Schema {
  @type('string') id: string = '';
  @type('string') senderId: string = '';
  @type('string') senderName: string = '';
  @type('string') timeString: string = '';
  @type('string') text: string = '';
}

export class AudioStateSchema extends Schema {
  @type('string') trackId: string = '';
  @type('string') trackTitle: string = '';
  @type('string') trackUrl: string = '';
  @type('number') trackDuration: number = 24;
  @type('number') startTime: number = 0;
}

export class TempleRoomState extends Schema {
  @type('string') roomName: string = 'Chánh Điện Thanh Tịnh';
  @type('string') theme: string = 'Chung';
  @type('number') maxCapacity: number = 50;
  @type('boolean') isPrivate: boolean = false;
  @type('number') serverTime: number = Date.now();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([IncenseStickSchema]) incenseSticks = new ArraySchema<IncenseStickSchema>();
  @type([ChatMessageSchema]) chatMessages = new ArraySchema<ChatMessageSchema>();
  @type(AudioStateSchema) audioState = new AudioStateSchema();
}

export class LobbyRoomEntrySchema extends Schema {
  @type('string') roomId: string = '';
  @type('string') roomName: string = '';
  @type('string') theme: string = 'Chung';
  @type('number') clients: number = 0;
  @type('number') maxClients: number = 50;
  @type('string') currentTrackTitle: string = '';
  @type('boolean') isPrivate: boolean = false;
}

export class LobbyState extends Schema {
  @type({ map: LobbyRoomEntrySchema }) rooms = new MapSchema<LobbyRoomEntrySchema>();
}
