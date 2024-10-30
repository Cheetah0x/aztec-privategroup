import {
  Fr,
  createPXEClient,
  deriveMasterIncomingViewingSecretKey,
} from "@aztec/aztec.js";
import { PrivateGroupsContractArtifact } from "./privategroups/src/artifacts/PrivateGroups";
import { AccountManager } from "@aztec/aztec.js/account";
import { SingleKeyAccountContract } from "@aztec/accounts/single_key";

export class PublicEnv {
  pxe;

  constructor(private pxeURL: string) {
    this.pxe = createPXEClient(this.pxeURL);
  }

  async createNewWallet() {
    // Generate a new secret key for each wallet
    const secretKey = Fr.random();
    const encryptionPrivateKey =
      deriveMasterIncomingViewingSecretKey(secretKey);
    const accountContract = new SingleKeyAccountContract(encryptionPrivateKey);

    // Create a new AccountManager instance
    const account = new AccountManager(this.pxe, secretKey, accountContract);

    // Register the account and get the wallet
    const wallet = await account.register(); // Returns AccountWalletWithSecretKey
    console.log(
      `Created new wallet with address: ${await wallet.getAddress()}`
    );

    return wallet; // Returns AccountWalletWithSecretKey
  }
}

export const deployerEnv = new PublicEnv(
  process.env.PXE_URL || "http://localhost:8080"
);

const IGNORE_FUNCTIONS = [
  "constructor",
  "compute_note_hash_and_optionally_a_nullifier",
];
export const filteredInterface = PrivateGroupsContractArtifact.functions.filter(
  (f) => !IGNORE_FUNCTIONS.includes(f.name)
);
