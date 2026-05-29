import {AbstractObjectStorage, ObjectStorageCredentials, PutObjectOptions} from "./object-storage.js";
import COS from "cos-nodejs-sdk-v5";

export class TencentCosObjectStorage extends AbstractObjectStorage<PutObjectOptions> {
    async getObject(key: string): Promise<Buffer> {
        const result = await this.cos.getObject({
            Bucket: this.credentials.bucket,
            Region: this.credentials.region,
            Key: key,
        })

        return result.Body
    }

    async putObject<T extends string | Buffer>(key: string, body: T, options?: PutObjectOptions): Promise<unknown> {
        return await this.cos.putObject({
            Bucket: this.credentials.bucket,
            Region: this.credentials.region,
            Key: key,
            Body: body,
            ContentType: options?.contentType,
        })
    }

    private cos: COS

    constructor(credentials: ObjectStorageCredentials) {
        super(credentials);
        this.cos = new COS({
            SecretKey: credentials.accessKey,
            SecretId: credentials.accessId,
        })
    }
}
