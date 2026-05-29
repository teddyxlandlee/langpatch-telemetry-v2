export const LEVEL_MANDATORY = 0;
export const LEVEL_FUNCTIONAL = 1;
export const LEVEL_OPTIONAL = 2;

export const SCHEMA_VERSION = 2;



// ========== Basic types ==========
type ISO8601 = string

interface ClientContext {
    country: { name: string; code: string }
    timezone: string
}

interface ProxyContext {
    via_reverse_proxy?: boolean
    is_request_timed_out?: boolean
}

export interface HooksBase {
    enchantment: string
    potion: string
}

export interface HooksArray {
    enchantment: string[]
    potion: string[]
}

export const modPlatforms = [
    'fabric', 'ornithes' /* sic */, 'legacy-fabric' /* since 3.8.5 */,
    'forge', 'neoforge', 'quilt', 'unknown'
] as const

// ========== Public Fields ==========
export interface TelemetryBase {
    client_time: ISO8601 | number /* number from client, ISO8601 to server */
    time?: ISO8601

    proxy_context?: ProxyContext

    schema: 1 | 2
    telemetry_level: 0 | 1 | 2
}

export interface Schema1Base extends TelemetryBase { schema: 1 }
export interface Schema2Base extends TelemetryBase { schema: 2 }

export interface Telemetry0Base extends TelemetryBase { telemetry_level: 0 }
export interface Telemetry1Base extends TelemetryBase { telemetry_level: 1 }
export interface Telemetry2Base extends TelemetryBase { telemetry_level: 2 }


// For schema >= 1 && telemetry_level >= 1
export interface WithModInfo extends TelemetryBase {
    mod_version: string
    mod_platform: typeof modPlatforms[number]
    mc_version: string
    client_context?: ClientContext
}

// For schema >= 2 && telemetry_level >= 1
export interface WithCurrentHooks extends TelemetryBase {
    current_hooks: HooksBase
}

// For schema >= 2 && telemetry_level >= 2
export interface WithAllHooks extends TelemetryBase {
    all_hooks: HooksArray
}

// Schema 1
export type Schema1Telemetry0 = Schema1Base & Telemetry0Base
export type Schema1Telemetry1 = Schema1Base & Telemetry1Base &
    WithModInfo
export type Schema1Telemetry2 = Schema1Base & Telemetry2Base &
    WithModInfo
export type Schema1TelemetryPayload =
    | Schema1Telemetry0
    | Schema1Telemetry1
    | Schema1Telemetry2

// Schema 2
export type Schema2Telemetry0 = Schema2Base & Telemetry0Base
export type Schema2Telemetry1 = Schema2Base & Telemetry1Base &
    WithModInfo & WithCurrentHooks
export type Schema2Telemetry2 = Schema2Base & Telemetry2Base &
    WithModInfo & WithCurrentHooks & WithAllHooks
export type Schema2TelemetryPayload =
    | Schema2Telemetry0
    | Schema2Telemetry1
    | Schema2Telemetry2

export type TelemetryPayload = Schema1TelemetryPayload | Schema2TelemetryPayload
