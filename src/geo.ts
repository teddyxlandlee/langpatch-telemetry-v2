import {Reader, ReaderModel} from "@maxmind/geoip2-node";
import { Geo } from "./telemetry.js";
import * as fs from "node:fs";
import {error} from "./asserts.js";
import {ObjectStorage} from "./storage/object-storage.js";
import {TencentCosObjectStorage} from "./storage/tencent-cos-impl.js";

let globalGeoReader: ReaderModel | undefined
const pathToGeoCache = '/tmp/Country.mmdb'

async function getGeoReader() : Promise<ReaderModel> {
    if (globalGeoReader) return globalGeoReader

    while (isFileAbsentOrExpired(pathToGeoCache)) {
        await fetchGeoReader()
    }

    const reader = await Reader.open(pathToGeoCache)
    globalGeoReader = reader
    return reader
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

async function fetchGeoReader() : Promise<void> {
    const objectStorage: ObjectStorage<any> = new TencentCosObjectStorage({
        accessId: GEO_COS_SECRET_ID || error("GEO_COS_SECRET_ID is not set"),
        accessKey: GEO_COS_SECRET_KEY || error("GEO_COS_SECRET_KEY is not set"),
        bucket: GEO_COS_BUCKET || error("GEO_COS_BUCKET is not set"),
        region: GEO_COS_REGION || 'ap-hongkong',
    })

    const result = await objectStorage.getObject(GEO_COS_FILE_KEY || 'Country.mmdb')
    fs.writeFileSync(pathToGeoCache, result)
}

export function getGeo(forwardedFor: string | undefined) : Promise<Geo> {
    return new Promise(async (resolve, reject) => {
        if (!forwardedFor) {
            reject(new Error("forwarded for null"))
            return;
        }
        const clientIp = forwardedFor.split(",")[0].trim()
        const reader = await getGeoReader()
        const [timezone, country] = [
            reader.city(clientIp).location?.timeZone,
            reader.country(clientIp).country,
        ]
        if (!country) reject(new Error("country undefined"))
        if (!timezone) reject(new Error("timezone undefined"))

        const countryRef = country
        resolve({
            country: {
                code: countryRef.isoCode,
                name: countryRef.names.en
            },
            timezone: timezone as string,
        })
    })
}