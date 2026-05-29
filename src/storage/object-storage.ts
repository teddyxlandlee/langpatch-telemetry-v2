export interface PutObjectOptions {
    contentType?: string
}

export interface ObjectStorage<PO extends PutObjectOptions> {
    putObject<T extends string | Buffer>(key: string, body: T, options?: PO) : Promise<unknown>
    getObject(key: string) : Promise<Buffer>
}

export interface ObjectStorageCredentials {
    accessId: string
    accessKey: string
    bucket: string
    region: string
}

export abstract class AbstractObjectStorage<PO extends PutObjectOptions> implements ObjectStorage<PO> {
    abstract putObject<T extends string | Buffer>(key: string, body: T, options?: PO) : Promise<unknown>
    abstract getObject(key: string) : Promise<Buffer>

    protected constructor(protected credentials: ObjectStorageCredentials) {}
}
