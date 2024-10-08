import {
  PrivateGroupsContractArtifact,
  PrivateGroupsContract,
} from "../src/artifacts/PrivateGroups.js";
import {
  AccountWallet,
  CompleteAddress,
  ContractDeployer,
  createDebugLogger,
  Fr,
  PXE,
  waitForPXE,
  TxStatus,
  createPXEClient,
  getContractInstanceFromDeployParams,
  DebugLogger,
} from "@aztec/aztec.js";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { AztecAddress, deriveSigningKey } from "@aztec/circuits.js";
import { TokenContract } from "@aztec/noir-contracts.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";

const setupSandbox = async () => {
  const { PXE_URL = "http://localhost:8080" } = process.env;
  const pxe = await createPXEClient(PXE_URL);
  await waitForPXE(pxe);
  return pxe;
};

async function main() {
  let pxe: PXE;
  let wallets: AccountWallet[] = [];
  let accounts: CompleteAddress[] = [];
  let logger: DebugLogger;

  logger = createDebugLogger("aztec:private-groups");

  pxe = await setupSandbox();
  wallets = await getInitialTestAccountsWallets(pxe);

  const admin = wallets[0].getAddress();
  const alice = wallets[1].getAddress();
  const bob = wallets[2].getAddress();

  const groupMembers = [admin, alice, bob];

  let secretKey = Fr.random();
  let salt = Fr.random();

  let schnorrAccount = await getSchnorrAccount(
    pxe,
    secretKey,
    deriveSigningKey(secretKey),
    salt
  );
  const { address, publicKeys, partialAddress } =
    schnorrAccount.getCompleteAddress();
  let tx = await schnorrAccount.deploy();
  let wallet = await schnorrAccount.register();

  await PrivateGroupsContract.deploy(wallets[0], admin, [alice, admin, bob])
    .send()
    .deployed();
  // let token = await TokenContract.deploy(wallet, wallet.getAddress(), "Test", "TST", 18).send().deployed();
  // await token.methods.mint_private(wallet.getAddress(), 100).send().wait();
}

main();
