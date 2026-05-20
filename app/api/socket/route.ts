import { NextResponse } from "next/server";

// Socket.IO is initialized in server/server.js
// This route is just a health check for the socket endpoint

export async function GET() {
  return NextResponse.json({ message: 'Socket endpoint active. Connect via WebSocket.' });
}
