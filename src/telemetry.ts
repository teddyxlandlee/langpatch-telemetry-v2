import {
    HooksArray,
    HooksBase,
    LEVEL_FUNCTIONAL,
    LEVEL_MANDATORY,
    LEVEL_OPTIONAL,
    modPlatforms, Schema1Telemetry1, Schema2Telemetry1, Schema2Telemetry2,
    SCHEMA_VERSION,
    TelemetryPayload, WithModInfo
} from "./types.js";
import {assert, assertIdentifier, assertNumber, error} from "./asserts.js";
import {uuidv7} from "uuidv7";
import {ObjectStorage} from "./storage/object-storage.js";
import {TencentCosObjectStorage} from "./storage/tencent-cos-impl.js";

export interface Geo {
    country: {
        name: string
        code: string
    }
    timezone: string
}

export function failResponse(message: string, status: number = 400) {
    return new Response(message, { status })
}

function checkV1V2(json: Partial<TelemetryPayload>): {
    payload: TelemetryPayload, timedOutRequest: boolean
} {
    // check isObject
    assert(json && typeof json === 'object', 'Not JSON object')
    // check schema
    assertNumber(
        json.schema, 1, SCHEMA_VERSION,
        'Invalid schema version, must be 1..' + SCHEMA_VERSION
    )
    const schema: TelemetryPayload['schema'] = json.schema

    assert(typeof json.client_time === 'number', 'Numeral client time required')
    const clientTimeNumber = json.client_time as number
    try {
        assertNumber(
            json.telemetry_level, LEVEL_MANDATORY, LEVEL_OPTIONAL,
            'Invalid telemetry level, must be 0, 1, or 2'
        )
    } catch {
        json.telemetry_level = LEVEL_FUNCTIONAL // set to default if invalid
    }

    let ret: Partial<TelemetryPayload> = {schema, telemetry_level: json.telemetry_level}
    if (json.telemetry_level >= LEVEL_FUNCTIONAL) {
        const jsonRef = json as WithModInfo
        const { mod_version, mod_platform, mc_version } = jsonRef
        assert(typeof mod_version === 'string', 'string mod_version required')
        assert(typeof mc_version === 'string', 'string mc_version required')
        assert(modPlatforms.includes(mod_platform), 'unsupported mod platform')
        ret = {...ret, mod_version, mod_platform, mc_version}
    }

    const clientDateObject = new Date(clientTimeNumber)
    const currentDateObject = new Date()
    let timedOutRequest = false
    if (currentDateObject.valueOf() - clientDateObject.valueOf() > 10_000) {
        console.warn('client time too early')
        timedOutRequest = true
    }
    ret.client_time = clientDateObject.toISOString()
    ret.time = currentDateObject.toISOString()

    if (schema >= 2) {
        if (json.telemetry_level >= LEVEL_FUNCTIONAL) {
            const jsonRef = json as Schema2Telemetry1 | Schema2Telemetry2
            assert(typeof jsonRef.current_hooks === 'object', 'current_hooks object must be present for schema v2, level 1')
            const { enchantment, potion }: HooksBase = jsonRef.current_hooks
            assertIdentifier(enchantment, 'enchantment identifier must be valid')
            assertIdentifier(potion, 'potion identifier must be valid')
            const retRef = ret as Schema2Telemetry1
            retRef.current_hooks = {enchantment, potion}
        }
        if (json.telemetry_level >= LEVEL_OPTIONAL) {
            const jsonRef = json as Schema2Telemetry2
            assert(typeof jsonRef.all_hooks === 'object', 'all_hooks object must be present for schema v2, level 2')
            const { enchantment, potion }: HooksArray = jsonRef.all_hooks
            assert(Array.isArray(enchantment), 'enchantment must be array')
            assert(Array.isArray(potion), 'potion must be array')
            enchantment.forEach((item, index) => assertIdentifier(item, 'enchantment identifier at index ' + index + ' must be valid'))
            potion.forEach((item, index) => assertIdentifier(item, 'potion identifier at index ' + index + ' must be valid'))
            const retRef = ret as Schema2Telemetry2
            retRef.all_hooks = {enchantment, potion}
        }
    }

    return { payload: ret as TelemetryPayload, timedOutRequest }
}

export type TelemetryReturnValue = {
    success: false,
    response: Response,
} | {
    success: true,
    promiseToAwait: Promise<unknown>,
    response: Response,
}

const SUPPORTS_PROXY_AS_SOURCE = true

/**
 * Note: Content-Type and Via remains unverified. They should be verified in upstream.
 *
 * @param body already parsed with {@link JSON.parse}.
 * If body is received from proxy, then this field is already verified and unwrapped.
 * @param isProxy whether the request is received from the proxy.
 * @param geoGetter factory for {@link Geo} information.
 */
export async function responseV1V2(body: any, isProxy: boolean, geoGetter: () => Promise<Geo>): Promise<TelemetryReturnValue> {
    let payload: TelemetryPayload, timedOutRequest: boolean
    try {
        const res = checkV1V2(body as Partial<TelemetryPayload>);
        ({payload, timedOutRequest} = res)
    } catch (error) {
        return {
            success: false,
            response: failResponse(error instanceof Error ? error.message : String(error)),
        }
    }

    payload.proxy_context = {
        is_request_timed_out: timedOutRequest,
        via_reverse_proxy: SUPPORTS_PROXY_AS_SOURCE && isProxy,
    }

    if (payload.telemetry_level >= LEVEL_FUNCTIONAL) {
        const payloadRef = payload as Schema1Telemetry1
        const geo = await geoGetter()
        payloadRef.client_context = {
            country: geo.country,
            timezone: geo.timezone,
        }
    }

    const internalRequest: Promise<unknown> = uploadToCos(payload)
    return {
        success: true,
        promiseToAwait: internalRequest,
        response: new Response(null, {status: 202})
    }
}

function pad2(x: number) {
    return ('' + x).padStart(2, '0')
}

// NOTE: GEO_COS_* are separated from COS_*.
// GEO_COS_* are used to fetch Country.mmdb from COS (GET-only), while
// COS_* are used for telemetry itself (PUT-only).
const {
    COS_SECRET_ID,
    COS_SECRET_KEY,
    COS_BUCKET,
    COS_REGION,
} = process.env

function uploadToCos(payload: TelemetryPayload): Promise<unknown> {
    const date = new Date()
    const uuid = uuidv7()
    const filename = `${date.getUTCFullYear()}/${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())}/${uuid}.json`

    const objectStorage: ObjectStorage<any> = new TencentCosObjectStorage({
        accessId: COS_SECRET_ID || error('COS_SECRET_ID is not set'),
        accessKey: COS_SECRET_KEY || error('COS_SECRET_KEY is not set'),
        bucket: COS_BUCKET || error('COS_BUCKET is not set'),
        region: COS_REGION || error('COS_REGION is not set'),
    })

    return objectStorage.putObject(filename, JSON.stringify(payload), {
        contentType: 'application/json'
    })
}
