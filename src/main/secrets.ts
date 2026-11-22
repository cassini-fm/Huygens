import { safeStorage } from "electron";

export type Cipher = {
    encrypt: (plain: string) => Promise<Uint8Array>;
    decrypt: (data: Uint8Array) => Promise<{ plain: string; stale: boolean }>;
};

export async function systemCipher(): Promise<Cipher> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
        throw new Error("System encryption is not available");
    }
    return {
        encrypt: (plain) => safeStorage.encryptStringAsync(plain),
        decrypt: async (data) => {
            const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(data));
            return { plain: result, stale: shouldReEncrypt };
        }
    };
}
