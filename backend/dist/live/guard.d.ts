/** Deny by default: Live Mode can invoke only verified, explicit read tools. */
export declare class ReadOnlyToolGuard {
    private readonly allowed;
    private readonly audit;
    constructor(allowed: ReadonlySet<string>, audit?: (message: string) => void);
    assertAllowed(name: string): void;
    listAllowed(available: {
        name: string;
    }[]): string[];
}
export declare const RENDER_READ_TOOLS: Set<string>;
export declare const VERCEL_READ_TOOLS: Set<string>;
export declare const GIT_READ_TOOLS: Set<string>;
//# sourceMappingURL=guard.d.ts.map