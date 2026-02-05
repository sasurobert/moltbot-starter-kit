import axios from "axios";
import * as crypto from "crypto";
import { CONFIG } from "./config";

export interface JobRequest {
    payload: string;
    isUrl?: boolean;
}

export class JobProcessor {
    async process(job: JobRequest): Promise<string> {
        let content = job.payload;

        if (job.isUrl || job.payload.startsWith("http")) {
            // SSRF Protection
            const url = new URL(job.payload);
            const isAllowed = CONFIG.SECURITY.ALLOWED_DOMAINS.some(domain =>
                url.hostname === domain || url.hostname.endsWith(`.${domain}`)
            );

            if (!isAllowed) {
                throw new Error(`Domain not allowed: ${url.hostname}`);
            }

            try {
                console.log(`Fetching job data from ${job.payload}...`);
                const res = await axios.get(job.payload, { timeout: CONFIG.REQUEST_TIMEOUT });
                content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            } catch (e: any) {
                // Propagate error if it's the domain check, otherwise logging warning approach for availability
                if (e.message.includes("Domain not allowed")) throw e;

                console.warn("Failed to fetch URL, using raw payload");
            }
        }

        // Hash computation (SHA256)
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
