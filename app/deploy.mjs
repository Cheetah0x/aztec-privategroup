// src/deploy.mjs
import { writeFileSync } from "fs";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import {
  Contract,
  loadContractArtifact,
  createPXEClient,
  Fr,
  AztecAddress,
  GrumpkinScalar,
} from "@aztec/aztec.js";
import {
  getInitialTestAccountsWallets,
  getDeployedTestAccountsWallets,
} from "@aztec/accounts/testing";
import {
  PublicGroupsContractArtifact,
  PublicGroupsContract,
} from "../src/artifacts/PublicGroups";
import { newAccount } from "./helpers/newAccount.mjs";

const { PXE_URL = "http://localhost:8080" } = process.env;

async function main() {
  console.log("Starting deployment script...");

  // Create PXE client
  const pxe = createPXEClient(PXE_URL);
  console.log("PXE client created:", pxe);

  // Create new wallet
  //   console.log("Creating new wallet...");
  //   const newWallet = await newAccount(pxe);
  //   console.log("New wallet created successfully!");

  //   const adminWallet = newWallet.wallet;
  //   const adminAddress = newWallet.walletAddress;
  //   const adminCompleteAddress = newWallet.walletCompleteAddress;

  const wallets = await getInitialTestAccountsWallets(pxe);

  const adminWallet = wallets[0];
  const aliceWallet = wallets[1];
  const bobWallet = wallets[2];

  const adminCompleteAddress = adminWallet.getCompleteAddress();
  const adminAddress = adminWallet.getAddress();
  const aliceAddress = aliceWallet.getAddress();
  const bobAddress = bobWallet.getAddress();

  // Log wallet details
  console.log("Admin wallet details:");
  console.log("Admin Wallet Address:", adminAddress.toString());
  console.log("Admin Complete Address:", adminCompleteAddress.toString());

  // Load the group contract artifact
  console.log("Loading GroupContract artifact...");
  console.log("GroupContract artifact loaded.");

  // Deploy the contract
  console.log("Deploying GroupContract...");
  const group_contract = await Contract.deploy(
    adminWallet,
    PublicGroupsContractArtifact,
    [adminCompleteAddress] // Pass admin address only
  )
    .send()
    .deployed();

  console.log(
    `Contract deployed successfully at ${group_contract.address.toString()}`
  );

  // Write contract address to file
  const addresses = { group_contract: group_contract.address.toString() };
  console.log("Writing contract address to addresses.json...");
  writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Contract address written to addresses.json");

  // Log final confirmation
  console.log(
    `Group contract deployment completed. Contract Address: ${group_contract.address.toString()}`
  );
}

main().catch((err) => {
  console.error(`Error in deployment script: ${err}`);
  process.exit(1);
});
