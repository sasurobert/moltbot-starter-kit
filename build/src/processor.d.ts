export interface JobRequest {
    payload: string;
    isUrl?: boolean;
}
export declare class JobProcessor {
    process(job: JobRequest): Promise<string>;
}
