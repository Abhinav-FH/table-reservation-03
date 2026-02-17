// Prisma returns BigInt values which JSON.stringify cannot handle by default.
// This utility recursively converts all BigInt values to strings for safe serialization.

export function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
