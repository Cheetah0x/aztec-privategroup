// //purpose of this component is to create an aztec account when u add a member to a group

// import {
//     AccountWallet,
//     CompleteAddress,
//     ContractDeployer,
//     createDebugLogger,
//     Fr,
//     waitForPXE,
//     TxStatus,
//     createPXEClient,
//     getContractInstanceFromDeployParams,
//     Contract,
//     GrumpkinScalar,
//   } from "@aztec/aztec.js";
//   import { getSchnorrAccount } from "@aztec/accounts/schnorr";
// import { deployerEnv } from '../../config';


//   //i want to return a wallet that is stored in local storage, it can then be used within the app

//   export function CreateAccount() {
//     const secret = Fr.random();
//     const signingPrivateKey = GrumpkinScalar.random();
//     const wallet = getSchnorrAccount(pxe, secret, signingPrivateKey).waitSetup();
//     return wallet;
//   }