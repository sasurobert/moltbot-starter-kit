export interface Challenge {
    address: string;
    target: string;
    salt: string;
    difficulty: number;
    expiresAt: number;
}
export declare class PoWSolver {
    solve(challenge: Challenge): string;
    private checkDifficulty;
}
