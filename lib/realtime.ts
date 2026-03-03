/**
 * Real-time Communication Blueprint
 * 
 * This is a blueprint for SSE-based real-time communication.
 * Use this to replace Socket.IO for Vercel deployment.
 * 
 * For production, consider using:
 * - Pusher (https://pusher.com)
 * - Ably (https://ably.com)
 * - Liveblocks (https://liveblocks.io)
 */

export class EventEmitter {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventEmitter = new EventEmitter();

// SSE Helper type for API routes
export interface SSEConnection {
  controller: ReadableStreamDefaultController;
  close: () => void;
}

/**
 * Create a Server-Sent Events connection handler
 * Use this in your API routes to stream real-time updates
 */
export function createSSEHandler() {
  const connections: Set<SSEConnection> = new Set();

  return {
    addConnection(controller: ReadableStreamDefaultController) {
      const connection = {
        controller,
        close: () => connections.delete(connection),
      };
      connections.add(connection);
      return connection;
    },

    broadcast(event: string, data: unknown) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      connections.forEach((conn) => {
        try {
          conn.controller.enqueue(new TextEncoder().encode(message));
        } catch {
          // Connection might be closed
          conn.close();
        }
      });
    },

    getConnectionCount() {
      return connections.size;
    },

    closeAll() {
      connections.forEach((conn) => conn.close());
      connections.clear();
    },
  };
}

// Example usage in API route:
// 
// import { createSSEHandler } from '@/lib/realtime';
// 
// export async function GET(request: NextRequest) {
//   const sse = createSSEHandler();
//   
//   const stream = new ReadableStream({
//     start(controller) {
//       const connection = sse.addConnection(controller);
//       
//       // Send initial connection message
//       controller.enqueue(`data: ${JSON.stringify({ connected: true })}\n\n`);
//       
//       // Keep connection alive with heartbeat
//       const heartbeat = setInterval(() => {
//         controller.enqueue(`: heartbeat\n\n`);
//       }, 30000);
//       
//       // Cleanup on close
//       request.signal.addEventListener('abort', () => {
//         clearInterval(heartbeat);
//         connection.close();
//       });
//     },
//   });
//   
//   return new Response(stream, {
//     headers: {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive',
//     },
//   });
// }

export default eventEmitter;
