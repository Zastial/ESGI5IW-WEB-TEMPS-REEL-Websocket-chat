import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { appendFileSync } from 'node:fs';
import { Inject } from '@nestjs/common';
import { AuthService, JWTPayload } from '../auth/auth.service';

interface Room {
  name: string;
  members: Set<string>;
  cooldown: number;
  isAdmin: boolean;
}

const rooms = new Map<string, Room>();
rooms.set('Lobby', {
  name: 'Lobby',
  members: new Set(),
  cooldown: 0,
  isAdmin: false,
});
rooms.set('Informations', {
  name: 'Informations',
  members: new Set(),
  cooldown: 0,
  isAdmin: false,
});
rooms.set('Recrutement', {
  name: 'Recrutement',
  members: new Set(),
  cooldown: 0,
  isAdmin: false,
});

rooms.set('Support', {
  name: 'Support',
  members: new Set(),
  cooldown: 0,
  isAdmin: true,
});

const writingUsers = new Array<string>();

@WebSocketGateway()
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  readonly userRoles = new Map<string, string>();
  readonly usernames = new Map<string, string>();
  readonly userTokens = new Map<string, JWTPayload>();

  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    if (!token) {
      client.emit('error', { message: 'Token is required' });
      client.disconnect();
      return;
    }

    const payload = this.authService.decodeJWT(token);
    if (!payload) {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
      return;
    }

    const { username, role } = payload;

    this.userRoles.set(client.id, role);
    this.usernames.set(client.id, username);
    this.userTokens.set(client.id, payload);

    appendFileSync(
      './chat-websocket.log',
      `\n[${new Date().toISOString()}] Nouvelle connexion: ${username} (${role}) \n ID: ${client.id}\n`,
    );

    const visibleRooms = this.getVisibleRooms(role);
    client.emit('roomList', visibleRooms);

    await client.join('Lobby');
    rooms.get('Lobby')?.members.add(client.id);
  }

  handleDisconnect(client: Socket) {
    rooms.forEach((room) => {
      room.members.delete(client.id);
    });
    this.userRoles.delete(client.id);
    this.usernames.delete(client.id);
    this.userTokens.delete(client.id);
  }

  private getVisibleRooms(userRole: string): Room[] {
    const visibleRooms: Room[] = [];
    rooms.forEach((room) => {
      if (!room.isAdmin || userRole === 'ADMIN') {
        visibleRooms.push(room);
      }
    });
    return visibleRooms;
  }

  private getRoomInfo(roomName: string): Room | undefined {
    return rooms.get(roomName);
  }

  @SubscribeMessage('createRoom')
  createRoom(
    @MessageBody() data: { roomName: string; type: string; cooldown: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomName, type, cooldown } = data;
    if (rooms.has(roomName)) {
      client.emit('error', { message: 'Room already exists', room: roomName });
      return;
    }

    const room: Room = {
      name: roomName,
      members: new Set([client.id]),
      cooldown: cooldown,
      isAdmin: type === 'private',
    };
    rooms.set(roomName, room);
    client.emit('roomCreated', room);

    this.server.sockets.sockets.forEach((socket) => {
      const role = this.userRoles.get(socket.id) || 'USER';
      const visibleRooms = this.getVisibleRooms(role);
      socket.emit('updateRoomList', visibleRooms);
    });
  }

  @SubscribeMessage('updateUsername')
  updateUsername(
    @MessageBody() newUsername: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.usernames.set(client.id, newUsername);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getRoomInfo(roomName);
    const userRole = this.userRoles.get(client.id) || 'USER';

    if (!room) {
      client.emit('error', { message: 'Room not found', room: roomName });
      return;
    }

    if (room.isAdmin && userRole !== 'ADMIN') {
      client.emit('error', {
        message: 'Access denied to this room',
        room: roomName,
      });
      return;
    }

    await client.join(roomName);
    room.members.add(client.id);
    client.emit('roomJoined', roomName);

    const username = this.usernames.get(client.id) || 'Anonymous';
    this.server.to(roomName).emit('userJoined', {
      username: username,
      room: roomName,
    });
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getRoomInfo(roomName);
    if (!room) return;

    await client.leave(roomName);
    room.members.delete(client.id);

    this.server.to(roomName).emit('userLeft', {
      username: client.handshake.query.username,
      room: roomName,
    });
  }

  @SubscribeMessage('deleteRoom')
  deleteRoom(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.getRoomInfo(roomName);
    const userRole = this.userRoles.get(client.id) || 'USER';

    if (!room) {
      client.emit('error', { message: 'Room not found', room: roomName });
      return;
    }

    if (userRole !== 'ADMIN') {
      client.emit('error', { message: 'Access denied to delete this room' });
      return;
    }

    rooms.delete(roomName);

    this.server.sockets.sockets.forEach((socket) => {
      const role = this.userRoles.get(socket.id) || 'USER';
      const visibleRooms = this.getVisibleRooms(role);
      socket.emit('updateRoomList', visibleRooms);
    });

    this.server.to(roomName).emit('roomDeleted', roomName);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, message } = data;
    const roomInfo = this.getRoomInfo(room);

    if (!roomInfo) {
      client.emit('error', { message: 'Room not found' });
      return;
    }

    const username = this.usernames.get(client.id) || 'Anonymous';
    const currentHourAndMinute = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });

    const formattedMessage = `[${currentHourAndMinute}] ${username}: ${message}`;

    if (writingUsers.includes(username)) {
      const index = writingUsers.indexOf(username);
      if (index > -1) {
        writingUsers.splice(index, 1);
        if (writingUsers.length > 1) {
          this.server
            .to(room)
            .except(client.id)
            .emit('isWriting', "Plusieurs personnes sont en train d'écrire...");
        } else {
          this.server.to(room).except(client.id).emit('isWriting', '');
        }
      }
    }

    this.server.to(room).emit('message', formattedMessage);
  }

  @SubscribeMessage('isWriting')
  handleIsWriting(
    @MessageBody() roomName: string,
    @ConnectedSocket() client: Socket,
  ) {
    const username = this.usernames.get(client.id) || 'Anonymous';
    if (writingUsers.includes(username)) return;
    writingUsers.push(username);

    setTimeout(() => {
      const index = writingUsers.indexOf(username);
      if (index > -1) {
        writingUsers.splice(index, 1);
      }
    }, 5000);

    let message = '';
    if (writingUsers.length > 1 && !writingUsers.includes(username)) {
      message = "Plusieurs personnes sont en train d'écrire...";
      this.server.to(roomName).except(client.id).emit('isWriting', message);
    } else {
      message = `${username} est en train d'écrire...`;
      this.server.to(roomName).except(client.id).emit('isWriting', message);
    }
  }
}
