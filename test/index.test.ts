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
    console.log("getMembers", getMembers);
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
    console.log("getMembersAlice", getMembersAlice);
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
    console.log("getMembersBob", getMembersBob);
    expect(getMembersBob).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("gets the admin from storage", async () => {
    adminInstance = await PrivateGroupsContract.at(
      private_group_contract.address,
      adminWallet
    );
    let getAdmin = await adminInstance.methods.get_admin().simulate();
    console.log("getAdmin", getAdmin);
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
      .set_balance(adminAddress, aliceAddress, 50)
      .send()
      .wait();
    console.log("setBalance", setBalance);

    const make_payment = aliceInstance.methods
      .make_payment(aliceAddress, adminAddress, 20)
      .send()
      .wait();
    console.log("make_payment", make_payment);

    const incoming_notes_filter = {
      contractAddress: private_group_contract.address,
      owner: adminAddress,
    };

    const admin_notes = await pxe.getIncomingNotes(incoming_notes_filter);
    console.log("admin_notes", admin_notes);

    const test_admin_balance = await adminInstance.methods
      .read_balance(adminAddress, aliceAddress)
      .simulate();
    console.log("test_admin_balance", test_admin_balance);
    expect(test_admin_balance).toBe(30n);

    const test_alice_balance = await aliceInstance.methods
      .read_balance(aliceAddress, adminAddress)
      .simulate();
    console.log("test_alice_balance", test_alice_balance);
    expect(test_alice_balance).toBe(-30n);

    // const getBalanceAlice = await aliceInstance.methods
    //   .read_balance(aliceAddress, adminAddress)
    //   .simulate();
    // console.log("getBalanceAlice", getBalanceAlice);
    // expect(getBalanceAlice).toBe(30n);

    // //alice now pays the admin 50
    // const makePayment = await aliceInstance.methods
    //   .set_balance(aliceAddress, adminAddress, 20)
    //   .send()
    //   .wait();
    // console.log("makePayment", makePayment);

    // const getBalanceAlice2 = await aliceInstance.methods
    //   .read_balance(aliceAddress, adminAddress)
    //   .simulate();
    // console.log("getBalanceAlice2", getBalanceAlice2);
    // expect(getBalanceAlice2).toBe(-30n);

    // const getBalanceAdmin2 = await adminInstance.methods
    //   .read_balance(adminAddress, aliceAddress)
    //   .simulate();
    // console.log("getBalanceAdmin2", getBalanceAdmin2);
    // expect(getBalanceAdmin2).toBe(30n);
  }, 300_000);

  // it("payments between alice and bob", async () => {
  //   const bobOweAlice = await aliceInstance.methods
  //     .set_balance(aliceAddress, bobAddress, 100)
  //     .send()
  //     .wait();
  //   console.log("bobOweAlice", bobOweAlice);

  //   const getBalanceAlice = await aliceInstance.methods
  //     .read_balance(aliceAddress, bobAddress)
  //     .simulate();
  //   expect(getBalanceAlice).toBe(100n);

  //   const bobPayAlice = await bobInstance.methods
  //     .make_payment(bobAddress, aliceAddress, 1)
  //     .send()
  //     .wait();
  //   console.log("bobPayAlice", bobPayAlice);

  //   const getBalanceAlice2 = await aliceInstance.methods
  //     .read_balance(aliceAddress, bobAddress)
  //     .simulate();
  //   console.log("getBalanceAlice2", getBalanceAlice2);
  //   expect(getBalanceAlice2).toBe(99n);

  //   const getBobBalance = await bobInstance.methods
  //     .read_balance(bobAddress, aliceAddress)
  //     .simulate();
  //   console.log("getBobBalance", getBobBalance);
  //   expect(getBobBalance).toBe(-99n);
  // }, 300_000);

  // it("sets up group payments", async () => {
  //   const setupGroupPayments = await adminInstance.methods
  //     .setup_group_payments(adminAddress, [aliceAddress, bobAddress], 150)
  //     .send()
  //     .wait();
  //   console.log("setupGroupPayments", setupGroupPayments);

  //   const aliceBalance = await aliceInstance.methods
  //     .read_balance(aliceAddress, adminAddress)
  //     .simulate();
  //   console.log("aliceBalance", aliceBalance);
  //   expect(aliceBalance).toBe(150n);

  //   const bobBalance = await bobInstance.methods
  //     .read_balance(bobAddress, adminAddress)
  //     .simulate();
  //   console.log("bobBalance", bobBalance);
  //   expect(bobBalance).toBe(50n);

  //   const adminBalance_alice = await adminInstance.methods
  //     .read_balance(adminAddress, aliceAddress)
  //     .simulate();
  //   console.log("adminBalance_alice", adminBalance_alice);
  //   expect(adminBalance_alice).toBe(150n);

  //   const adminBalance_bob = await adminInstance.methods
  //     .read_balance(adminAddress, bobAddress)
  //     .simulate();
  //   console.log("adminBalance_bob", adminBalance_bob);
  //   expect(adminBalance_bob).toBe(50n);
  // }, 300_000);
});
