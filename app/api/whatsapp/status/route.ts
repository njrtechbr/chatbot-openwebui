import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { evolutionSocket } from '../socketio';

export async function GET() {
  try {
    const status = {
      connected: evolutionWs.isConnected(),
      instance: process.env.EVOLUTION_INSTANCE_NAME
    };
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting WebSocket status:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket status' },
      { status: 500 }
    );
  }
}
