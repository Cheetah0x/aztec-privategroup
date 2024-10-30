import {
  AccountWallet,
  CompleteAddress,
  ContractDeployer,
  createDebugLogger,
  Fr,
  waitForPXE,
  TxStatus,
  createPXEClient,
  getContractInstanceFromDeployParams,
  Contract,
  GrumpkinScalar,
  PXE,
  DebugLogger,
  AztecAddress,
} from "@aztec/aztec.js";
import {
  PrivateGroupsContractArtifact,
  PrivateGroupsContract,
} from "../src/privategroups/src/artifacts/PrivateGroups";
import { setupSandbox, createAccount } from "./utils";

describe("PrivateGroups", () => {
  let pxe: PXE;
  let wallets: AccountWallet[] = [];
  let accounts: CompleteAddress[] = [];
  let addresses: string[] = [];
  let logger: DebugLogger;
  let private_group_contract: Contract;
  let adminWallet: AccountWallet;
  let aliceWallet: AccountWallet;
  let bobWallet: AccountWallet;
  let adminAddress: AztecAddress;
  let aliceAddress: AztecAddress;
  let bobAddress: AztecAddress;
  let adminInstance: PrivateGroupsContract;
  let aliceInstance: PrivateGroupsContract;
  let bobInstance: PrivateGroupsContract;

  beforeAll(async () => {
    logger = createDebugLogger("aztec:PrivateGroups");
    logger.info("Aztec-PrivateGroups tests running");

    // Setup PXE
    pxe = await setupSandbox();
    const GroupsArtifact = PrivateGroupsContractArtifact;
    console.log("GroupsArtifact");

    // Create admin, Alice, and Bob wallets
    adminWallet = await createAccount(pxe);
    aliceWallet = await createAccount(pxe);
    bobWallet = await createAccount(pxe);
    console.log("wallets created");

    // Store wallets
    wallets = [adminWallet, aliceWallet, bobWallet];

    // Store complete addresses
    accounts = [
      adminWallet.getCompleteAddress(),
      aliceWallet.getCompleteAddress(),
      bobWallet.getCompleteAddress(),
    ];
    console.log("accounts created");

    // Store just the wallet addresses
    addresses = [
      adminWallet.getCompleteAddress().address.toString(),
      aliceWallet.getCompleteAddress().address.toString(),
      bobWallet.getCompleteAddress().address.toString(),
    ];
    console.log("addresses", addresses);

    // Deploy contract with admin address
    adminAddress = adminWallet.getCompleteAddress().address;
    aliceAddress = aliceWallet.getCompleteAddress().address;
    bobAddress = bobWallet.getCompleteAddress().address;
    console.log("addresses", addresses);

    private_group_contract = await Contract.deploy(
      adminWallet,
      GroupsArtifact,
      [adminAddress, [adminAddress, aliceAddress, bobAddress]]
    )
      .send()
      .deployed();
    console.log("contract deployed");
  });

  it("Deploys the contract", async () => {
    // Expect the transaction to be pending
    expect(private_group_contract).toBeDefined();

    console.log("getting contract instance");
    expect(
      await pxe.getContractInstance(private_group_contract.address)
    ).toBeDefined();
    console.log("contract instance gotten");
    expect(
      await pxe.isContractPubliclyDeployed(private_group_contract.address)
    ).toBeTruthy();
    console.log("contract instance is publicly deployed");
  }, 300_000);

  it("should have added all members to group", async () => {
    adminInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      adminWallet
    );

    //assume we are impersonating the admin
    let getMembers = await adminInstance.methods
      .get_group_members(adminAddress)
      .simulate();
    console.log("getMembers", getMembers);
    expect(getMembers).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("get the admin from storage", async () => {
    let getAdmin = await adminInstance.methods.get_admin().simulate();
    expect(getAdmin).toEqual(adminAddress);
  }, 300_000);

  it("gets group member from alice instance", async () => {
    aliceInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      aliceWallet
    );
    let getMembers = await aliceInstance.methods
      .get_group_members(aliceAddress)
      .simulate();
    expect(getMembers).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("returns default value for unauthorized access by bob instance for alice address", async () => {
    bobInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      bobWallet
    );

    // Simulate the call and expect default (unauthorized) result
    const getMembers = await bobInstance.methods
      .get_group_members(aliceAddress)
      .simulate();

    // Check that the result matches the unauthorized access pattern (0x00... addresses)
    const expectedUnauthorizedValue = [
      {
        type: "AztecAddress",
        value:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
      {
        type: "AztecAddress",
        value:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
      {
        type: "AztecAddress",
        value:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    ];

    getMembers.forEach((memberAddress: any) => {
      expect(memberAddress.asBuffer.every((byte: any) => byte === 0)).toBe(
        true
      );
    });
  }, 300_000);

  it("sets the balance for admin and alice, credit for admin, debt for alice", async () => {
    const setBalance = await adminInstance.methods
      .set_balance(adminAddress, aliceAddress, 100)
      .send()
      .wait();
    console.log("setBalance", setBalance);

    const getBalance = await adminInstance.methods
      .read_balance_credit(adminAddress, aliceAddress)
      .simulate();
    console.log("getBalance", getBalance);
    expect(getBalance).toBe(100n);

    const aliceInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      aliceWallet
    );
    const getBalanceAlice = await aliceInstance.methods
      .read_balance_debt(aliceAddress, adminAddress)
      .simulate();
    console.log("getBalanceAlice", getBalanceAlice);
    expect(getBalanceAlice).toBe(100n);

    //alice now pays the admin 50
    const makePayment = await aliceInstance.methods
      .set_balance(aliceAddress, adminAddress, 20)
      .send()
      .wait();
    console.log("makePayment", makePayment);

    const getBalanceAlice2 = await aliceInstance.methods
      .read_balance_debt(aliceAddress, adminAddress)
      .simulate();
    console.log("getBalanceAlice2", getBalanceAlice2);
    expect(getBalanceAlice2).toBe(100n);

    const getBalanceAdmin2 = await adminInstance.methods
      .read_balance_credit(adminAddress, aliceAddress)
      .simulate();
    console.log("getBalanceAdmin2", getBalanceAdmin2);
    expect(getBalanceAdmin2).toBe(100n);
  }, 300_000);

  it("payments between alice and bob", async () => {
    const bobOweAlice = await aliceInstance.methods
      .set_balance(aliceAddress, bobAddress, 100)
      .send()
      .wait();
    console.log("bobOweAlice", bobOweAlice);

    const getBalanceAlice = await aliceInstance.methods
      .read_balance_credit(aliceAddress, bobAddress)
      .simulate();
    expect(getBalanceAlice).toBe(100n);

    const bobPayAlice = await bobInstance.methods
      .make_payment(bobAddress, aliceAddress, 1)
      .send()
      .wait();
    console.log("bobPayAlice", bobPayAlice);

    const getBalanceAlice2 = await aliceInstance.methods
      .read_balance_credit(aliceAddress, bobAddress)
      .simulate();
    console.log("getBalanceAlice2", getBalanceAlice2);
    expect(getBalanceAlice2).toBe(99n);

    const getBobBalance = await bobInstance.methods
      .read_balance_debt(bobAddress, aliceAddress)
      .simulate();
    console.log("getBobBalance", getBobBalance);
    expect(getBobBalance).toBe(99n);
  }, 300_000);

  it("sets up group payments", async () => {
    const setupGroupPayments = await adminInstance.methods
      .setup_group_payments(adminAddress, [aliceAddress, bobAddress], 150)
      .send()
      .wait();
    console.log("setupGroupPayments", setupGroupPayments);

    const aliceBalance = await aliceInstance.methods
      .read_balance_debt(aliceAddress, adminAddress)
      .simulate();
    console.log("aliceBalance", aliceBalance);
    expect(aliceBalance).toBe(150n);

    const bobBalance = await bobInstance.methods
      .read_balance_debt(bobAddress, adminAddress)
      .simulate();
    console.log("bobBalance", bobBalance);
    expect(bobBalance).toBe(50n);

    const adminBalance_alice = await adminInstance.methods
      .read_balance_credit(adminAddress, aliceAddress)
      .simulate();
    console.log("adminBalance_alice", adminBalance_alice);
    expect(adminBalance_alice).toBe(150n);

    const adminBalance_bob = await adminInstance.methods
      .read_balance_credit(adminAddress, bobAddress)
      .simulate();
    console.log("adminBalance_bob", adminBalance_bob);
    expect(adminBalance_bob).toBe(50n);
  }, 300_000);
});
