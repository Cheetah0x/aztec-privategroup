export declare class PublicEnv {
    private pxeURL;
    pxe: import("@aztec/circuit-types").PXE;
    constructor(pxeURL: string);
    createNewWallet(): Promise<import("@aztec/aztec.js").AccountWalletWithSecretKey>;
}
export declare const deployerEnv: PublicEnv;
export declare const filteredInterface: import("@aztec/aztec.js").FunctionArtifact[];
//# sourceMappingURL=config.d.ts.map