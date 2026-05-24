'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ autoConnect: true });
  }
  return socket;
}

export function getPlayerId(): string {
  let id = sessionStorage.getItem('lirummy-player-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('lirummy-player-id', id);
  }
  return id;
}
