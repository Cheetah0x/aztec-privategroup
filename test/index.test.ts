import {
  AccountWallet,
  CompleteAddress,
  createDebugLogger,
  Contract,
  PXE,
  DebugLogger,
  AztecAddress,
} from "@aztec/aztec.js";
import {
  PrivateGroupsContractArtifact,
  PrivateGroupsContract,
} from "../src/circuits/src/artifacts/PrivateGroups";
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
    const group_members = [adminAddress, aliceAddress, bobAddress];
    console.log("group_members", group_members);

    //deploy the contract
    private_group_contract = await Contract.deploy(
      adminWallet,
      GroupsArtifact,
      [adminAddress, [adminAddress, aliceAddress, bobAddress]],
      "constructor"
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
    console.log("contract instance gotten", private_group_contract.address);
    expect(
      await pxe.isContractPubliclyDeployed(private_group_contract.address)
    ).toBeTruthy();
    console.log("contract instance is publicly deployed");
  }, 300_000);

  it("check members as contract", async () => {
    const members = await private_group_contract.methods
      .get_group_members(adminAddress)
      .simulate();
    console.log("members", members);
    expect(members).toEqual([adminAddress, aliceAddress, bobAddress]);
  });

  it("should have added all members to group", async () => {
    adminInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      adminWallet
    );

    //assume we are impersonating the admin
    let getMembers = await adminInstance.methods
      .get_group_members(adminAddress)
      .simulate();
    expect(getMembers).toEqual([adminAddress, aliceAddress, bobAddress]);
    console.log("admin instance done");
  });

  it("try with alice", async () => {
    //try with alice and bob
    aliceInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      aliceWallet
    );
    console.log("alice instance made");

    let getMembersAlice = await aliceInstance.methods
      .get_group_members(aliceAddress)
      .simulate();
    expect(getMembersAlice).toEqual([adminAddress, aliceAddress, bobAddress]);
  });

  it("try with bob", async () => {
    bobInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      bobWallet
    );
    console.log("bob instance made");
    let getMembersBob = await bobInstance.methods
      .get_group_members(bobAddress)
      .simulate();
    expect(getMembersBob).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("gets the admin from storage", async () => {
    adminInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      adminWallet
    );
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

    // Check that each returned address is a zero address
    getMembers.forEach((memberAddress: AztecAddress) => {
      expect(memberAddress.toString()).toBe(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  }, 300_000);

  it("sets the balance for admin and alice, credit for admin, debt for alice", async () => {
    // First, set up the debt from Alice to Admin
    const setBalance = await adminInstance.methods
      .set_balance(adminAddress, aliceAddress, 50)
      .send()
      .wait();

    // Verify initial balances
    const initialAdminCredit = await adminInstance.methods
      .read_balance_credit(adminAddress, aliceAddress)
      .simulate();
    console.log("initialAdminCredit", initialAdminCredit);
    expect(initialAdminCredit).toBe(50n);

    const initialAliceDebt = await aliceInstance.methods
      .read_balance_debt(aliceAddress, adminAddress)
      .simulate();
    console.log("initialAliceDebt", initialAliceDebt);
    expect(initialAliceDebt).toBe(50n);

    // Now Alice can make a payment
    const make_payment = await aliceInstance.methods
      .make_payment(aliceAddress, adminAddress, 20)
      .send()
      .wait();

    // Check final balances
    const finalAdminCredit = await adminInstance.methods
      .read_total_balance(adminAddress, aliceAddress)
      .simulate();
    console.log("finalAdminCredit", finalAdminCredit);
    expect(finalAdminCredit).toBe(30n);

    const finalAliceDebt = await aliceInstance.methods
      .read_total_balance(aliceAddress, adminAddress)
      .simulate();
    console.log("finalAliceDebt", finalAliceDebt);
    expect(finalAliceDebt).toBe(30n);
  }, 300_000);

  it("payments between alice and bob", async () => {
    const bobOweAlice = await aliceInstance.methods
      .set_balance(aliceAddress, bobAddress, 100)
      .send()
      .wait();
    console.log("bobOweAlice", bobOweAlice);

    const getBalanceAlice = await aliceInstance.methods
      .read_total_balance(aliceAddress, bobAddress)
      .simulate();
    expect(getBalanceAlice).toBe(100n);

    const bobPayAlice = await bobInstance.methods
      .make_payment(bobAddress, aliceAddress, 1)
      .send()
      .wait();

    const getBalanceAlice2 = await aliceInstance.methods
      .read_total_balance(aliceAddress, bobAddress)
      .simulate();
    console.log("getBalanceAlice2", getBalanceAlice2);
    expect(getBalanceAlice2).toBe(99n);

    const getBobBalance = await bobInstance.methods
      .read_total_balance(bobAddress, aliceAddress)
      .simulate();
    console.log("getBobBalance", getBobBalance);
    expect(getBobBalance).toBe(-99n);
  }, 300_000);

  it("sets up group payments", async () => {
    const setupGroupPayments = await adminInstance.methods
      .setup_group_payments(adminAddress, [aliceAddress, bobAddress], 150)
      .send()
      .wait();

    const aliceBalance = await aliceInstance.methods
      .read_total_balance(aliceAddress, adminAddress)
      .simulate();
    console.log("aliceBalance", aliceBalance);
    expect(aliceBalance).toBe(-80n);

    const bobBalance = await bobInstance.methods
      .read_total_balance(bobAddress, adminAddress)
      .simulate();
    console.log("bobBalance", bobBalance);
    expect(bobBalance).toBe(-50n);

    const adminBalance_alice = await adminInstance.methods
      .read_total_balance(adminAddress, aliceAddress)
      .simulate();
    console.log("adminBalance_alice", adminBalance_alice);
    expect(adminBalance_alice).toBe(80n);

    const adminBalance_bob = await adminInstance.methods
      .read_total_balance(adminAddress, bobAddress)
      .simulate();
    console.log("adminBalance_bob", adminBalance_bob);
    expect(adminBalance_bob).toBe(50n);
  }, 300_000);
});
