// src/deploy.mjs

import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js";

export async function newAccount(pxe) {
  console.log("creating wallet");
  const walletSecret = Fr.random();
  console.log("generating private key");
  const walletSigningPrivateKey = GrumpkinScalar.random();
  console.log("generating wallet signing private key");

  // Await the wallet setup
  console.log("getting schnorr account");
  const wallet = await getSchnorrAccount(
    pxe,
    walletSecret,
    walletSigningPrivateKey
  ).waitSetup();
  console.log("wallet setup");

  // Get the wallet address and complete address
  const walletCompleteAddress = wallet.getCompleteAddress();
  const walletAddress = wallet.getAddress();

  // Return the wallet, wallet address, and wallet complete address
  return {
    wallet,
    walletAddress,
    walletCompleteAddress,
  };
}
