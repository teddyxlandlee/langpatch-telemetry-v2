// import {Reader, ReaderModel} from "@maxmind/geoip2-node";
import { Geo } from "./telemetry.js";
import * as fs from "node:fs";
import {error} from "./asserts.js";
import {ObjectStorage} from "./storage/object-storage.js";
import {TencentCosObjectStorage} from "./storage/tencent-cos-impl.js";
import {IP2Location} from "ip2location-nodejs";

// let globalGeoReader: ReaderModel | undefined
const pathToGeoCache = '/tmp/geo.bin'

interface GeoProvider {
    getGeo(ip: string) : Promise<Geo>
}

class Ip2LocationGeoProvider implements GeoProvider {
    private engine: IP2Location

    constructor() {
        this.engine = new IP2Location()
        this.engine.open(pathToGeoCache)
    }

    private filter(message: string) : string {
        if (message.toLowerCase().includes('not applicable')) return ''
        return message
    }

    async getGeo(ip: string) : Promise<Geo> {
        const result = await this.engine.getAllAsync(ip)
        return {
            country: {
                name: this.filter(result.countryLong),
                code: this.filter(result.countryShort),
            },
            timezone: this.filter(result.timeZone),
        }
    }
}

let globalGeoProvider: GeoProvider | undefined

async function getGeoProvider() : Promise<GeoProvider> {
    if (!globalGeoProvider) {
        while (isFileAbsentOrExpired(pathToGeoCache)) {
            await fetchGeoProvider()
        }
        globalGeoProvider = new Ip2LocationGeoProvider()
    }
    return globalGeoProvider
}

// 10 days
const EXPIRE_THRESHOLD = 10 * 86400 * 1000
function isFileAbsentOrExpired(path: string) {
    try {
        return fs.statSync(path).mtimeMs < (Date.now() - EXPIRE_THRESHOLD)
    } catch {
        return true
    }
}

// NOTE: GEO_COS_* are separated from COS_*.
// GEO_COS_* are used to fetch Country.mmdb from COS (GET-only), while
// COS_* are used for telemetry itself (PUT-only).
const {
    GEO_COS_SECRET_ID,
    GEO_COS_SECRET_KEY,
    GEO_COS_BUCKET,
    GEO_COS_REGION,
    GEO_COS_FILE_KEY,
} = process.env

async function fetchGeoProvider() : Promise<void> {
    const objectStorage: ObjectStorage<any> = new TencentCosObjectStorage({
        accessId: GEO_COS_SECRET_ID || error("GEO_COS_SECRET_ID is not set"),
        accessKey: GEO_COS_SECRET_KEY || error("GEO_COS_SECRET_KEY is not set"),
        bucket: GEO_COS_BUCKET || error("GEO_COS_BUCKET is not set"),
        region: GEO_COS_REGION || 'ap-hongkong',
    })

    const result = await objectStorage.getObject(GEO_COS_FILE_KEY || 'geo.bin')
    fs.writeFileSync(pathToGeoCache, result)
}

export async function getGeo(forwardedFor: string | undefined) : Promise<Geo> {
    if (!forwardedFor) {
        throw new Error("forwarded for null")
    }
    const clientIp = forwardedFor.split(",")[0].trim()
    const geoProvider = await getGeoProvider()

    return geoProvider.getGeo(clientIp)
}