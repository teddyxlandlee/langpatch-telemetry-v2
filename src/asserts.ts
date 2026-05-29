export function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message)
}

export function assertNumber(value: unknown, minInclusive: number, maxInclusive: number, message: string): asserts value is number {
    assert(typeof value === 'number' && value >= minInclusive && value <= maxInclusive, message)
}

export function assertIdentifier(value: unknown, message: string): asserts value is string {
    assert(typeof value === 'string' && /^([0-9a-z_\-]+:)?[0-9a-z_\-/]+$/.test(value), message)
}

export function error(msg: string): never {
    throw new Error(msg)
}