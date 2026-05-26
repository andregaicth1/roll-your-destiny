/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EntryScreen } from './components/EntryScreen';
import { GameRoom } from './components/GameRoom';
import { io, Socket } from 'socket.io-client';
import { RoomState, Player } from './types';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joinedRoom, setJoinedRoom] = useState('');
  const [initialState, setInitialState] = useState<RoomState | null>(null);

  useEffect(() => {
    // Only connect when user clicks join to avoid empty connections
  }, []);

  const handleJoin = (roomId: string, player: Omit<Player, 'id'>) => {
    // Determine the URL based on environment. In Vite dev, it runs together.
    const newSocket = io();
    
    newSocket.on('connect', () => {
      newSocket.emit('join_room', { roomId, player });
    });

    // Wait for the first state update to transition UI
    const stateUpdateListener = (state: RoomState) => {
      setInitialState(state);
      setJoinedRoom(roomId);
      setSocket(newSocket);
      newSocket.off('room_state_update', stateUpdateListener);
    };
    newSocket.on('room_state_update', stateUpdateListener);
  };

  if (joinedRoom && socket && initialState) {
    return (
      <GameRoom 
        socket={socket} 
        roomId={joinedRoom} 
        initialState={initialState} 
        playerId={socket.id || ''} 
      />
    );
  }

  return <EntryScreen onJoin={handleJoin} />;
}
