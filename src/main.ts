import { Hono } from 'hono'
import { serve } from "@hono/node-server";
import jwt from 'jsonwebtoken'
import {Geo, responseV1V2} from "./telemetry.js";
import {getGeo} from "./geo.js";

const app = new Hono({
    strict: false,  // does not distinguish '/foo' and '/foo/'
})

const PROXY_JWT_SECRET = process.env.PROXY_JWT_SECRET
if (!PROXY_JWT_SECRET) {
    throw new Error('PROXY_JWT_SECRET is not set')
}

app.post('/v2', async (context) => {
    const isProxy = context.req.header('Via')?.includes('LangPatch-Migrate-Proxy') || false
    let body: any, geoGetter: () => Promise<Geo>
    if (isProxy) {
        if ((context.req.header('Content-Type') || '').toLowerCase() !== 'text/plain; charset=utf-8') {
            return new Response('Content-Type mismatch (for proxy)', {status: 400})
        }
        try {
            const payload = jwt.verify((await context.req.text()), Buffer.from(PROXY_JWT_SECRET, 'base64'))
            if (typeof payload === 'string') {
                return new Response('Expected JWT result to be JSON object, got string', {status: 400})
            }
            body = JSON.parse(payload.content)
            geoGetter = async () => payload.geo_context
        } catch (error) {
            if (error instanceof SyntaxError) {
                return new Response('Invalid JSON payload', {status: 400})
            }
            console.error("Proxy JWT verification failed:", error)
            return new Response('Unauthorized', {status: 401})
        }
    } else {
        if ((context.req.header('Content-Type') || '') !== 'application/json') {
            return new Response('Content-Type mismatch', {status: 400})
        }
        body = await context.req.json()
        geoGetter = () => getGeo(context.req.header('X-Forwarded-For'))
    }
    const res = await responseV1V2(body, isProxy, geoGetter)
    if (res.success) {
        // We're unable to execute COS upload after response, so here we await it
        await res.promiseToAwait
    }

    return res.response
})

serve({
    fetch: app.fetch,
    port: parseInt(process.env.PORT || '') || 9000
})