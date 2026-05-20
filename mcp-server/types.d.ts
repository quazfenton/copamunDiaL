/**
 * MCP Server Type Declarations
 * 
 * Type definitions for MCP SDK v1.0.4 compatibility
 */

import { z } from 'zod';

// MCP Server types
export interface MCPServer {
  tool: ToolMethod;
  resource: ResourceMethod;
  prompt: PromptMethod;
}

export type ToolMethod = <T extends z.ZodObject<any>>(
  name: string,
  description: string,
  inputSchema: T,
  handler: (params: z.infer<T>) => Promise<ToolResponse>
) => void;

export type ResourceMethod = <T extends URLPattern>(
  name: string,
  pattern: T,
  handler: (uri: URL, ...params: any[]) => Promise<ResourceResponse>
) => void;

export type PromptMethod = <T extends z.ZodObject<any>>(
  name: string,
  description: string,
  argsSchema: T,
  handler: (args: z.infer<T>) => PromptResponse
) => void;

export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  [key: string]: any;
}

export interface ResourceResponse {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
  }>;
}

export interface PromptResponse {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
    };
  }>;
}

// Extend the Server type from MCP SDK
declare module '@modelcontextprotocol/sdk/server/index.js' {
  export interface Server {
    tool: ToolMethod;
    resource: ResourceMethod;
    prompt: PromptMethod;
  }
}

// URLPattern polyfill type
declare class URLPattern {
  constructor(pattern: string);
  test(url: string): boolean;
  exec(url: string): any;
}

// Export for use in MCP server
export type { MCPServer };
