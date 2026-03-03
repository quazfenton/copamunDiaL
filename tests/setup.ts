import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(null)),
  AuthOptions: {},
}))

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
