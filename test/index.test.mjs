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
} from "@aztec/aztec.js";
import {
  PrivateGroupsContractArtifact,
  PrivateGroupsContract,
} from "../src/contracts/src/artifacts/PrivateGroups";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";


const setupSandbox = async () => {
  const { PXE_URL = "http://localhost:8080" } = process.env;
  const pxe = createPXEClient(PXE_URL);
  await waitForPXE(pxe);
  return pxe;
};

// const createSchnorrAccount = async (pxe) => {
//   const secret = Fr.random();
//   const signingPrivateKey = GrumpkinScalar.random();
//   const wallet = getSchnorrAccount(pxe, secret, signingPrivateKey).waitSetup();
//   return wallet;
// };
const createSchnorrAccount = async (pxe) => {
  const secret = Fr.random();
  const signingPrivateKey = GrumpkinScalar.random();
  const wallet = getSchnorrAccount(pxe, secret, signingPrivateKey).waitSetup();
  return wallet;
};

describe("PrivateGroups", () => {
  // let pxe: PXE;
  // let wallets: AccountWallet[] = [];
  // let accounts: CompleteAddress[] = [];
  // let addresses: string[] = [];
  // let logger: DebugLogger;
  let pxe;
  let wallets;
  let accounts;
  let addresses;
  let logger;
  let private_group_contract;
  beforeAll(async () => {
    logger = createDebugLogger("aztec:PrivateGroups");
    logger.info("Aztec-PrivateGroups tests running");

    // Setup PXE
    pxe = await setupSandbox();
    const GroupsArtifact = PrivateGroupsContractArtifact;
    console.log("GroupsArtifact");

    // Create admin, Alice, and Bob wallets
    const adminWallet = await createSchnorrAccount(pxe);
    const aliceWallet = await createSchnorrAccount(pxe);
    const bobWallet = await createSchnorrAccount(pxe);
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

    // Deploy contract with admin addressconst 
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;
    console.log("addresses", addresses);

    private_group_contract = await Contract.deploy(
      adminWallet,
      GroupsArtifact,
      [adminAddress, [adminAddress, aliceAddress, bobAddress]]
    ).send().deployed();
    console.log("contract deployed");
  });

  it("Deploys the contract", async () => {
    const salt = Fr.random();
    const GroupsArtifact = PrivateGroupsContractArtifact;

    // Extract the wallets
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;
    // const group_members = [adminAddress, aliceAddress, bobAddress];

    // Deploy contract with admin address
    const private_group_contract = await Contract.deploy(
      adminWallet,
      GroupsArtifact,
      [adminAddress, [adminAddress, aliceAddress, bobAddress]]
    ).send().deployed();

    console.log("contract deployed");
    console.log("private_group_contract", private_group_contract);

    // Expect the transaction to be pending
    expect(private_group_contract).toBeDefined();

    // Wait for the transaction to be mined

    // Ensure contract was deployed
    //TODO:: this might be different for the private contracts, where do u check where it has been deployed. 
    console.log("getting contract instance");
    expect(await pxe.getContractInstance(private_group_contract.address)).toBeDefined();
    console.log("contract instance gotten");
    expect(
      await pxe.isContractPubliclyDeployed(private_group_contract.address)
    ).toBeTruthy();
    console.log("contract instance is publicly deployed");

  }, 300_000);

  it("should have added all members to group", async () => {

    //make an instance for the admin
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const adminInstance = await PrivateGroupsContract.at(private_group_contract.address, adminWallet);

    //assume we are impersonating the admin
    let getMembers = await adminInstance.methods.get_group_members(adminAddress).simulate();
    console.log("getMembers", getMembers);
    expect(getMembers).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("get the admin from storage", async () => {

    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const adminInstance = await PrivateGroupsContract.at(private_group_contract.address, adminWallet);
    let getAdmin = await adminInstance.methods.get_admin().simulate();
    expect(getAdmin).toEqual(adminAddress);

  }, 300_000);

  it("gets group member from alice instance", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const aliceInstance = await PrivateGroupsContract.at(private_group_contract.address, aliceWallet);
    let getMembers = await aliceInstance.methods.get_group_members(aliceAddress).simulate();
    expect(getMembers).toEqual([adminAddress, aliceAddress, bobAddress]);
  }, 300_000);

  it("returns default value for unauthorized access by bob instance for alice address", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
  
    const bobInstance = await PrivateGroupsContract.at(private_group_contract.address, bobWallet);
    
    // Simulate the call and expect default (unauthorized) result
    const getMembers = await bobInstance.methods.get_group_members(aliceAddress).simulate();
  
    // Check that the result matches the unauthorized access pattern (0x00... addresses)
    // const expectedUnauthorizedValue = [
    //   { type: "AztecAddress", value: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    //   { type: "AztecAddress", value: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    //   { type: "AztecAddress", value: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    // ];
  
    getMembers.forEach(memberAddress => {
      expect(memberAddress.asBuffer.every(byte => byte === 0)).toBe(true);
    });
  }, 300_000);

  it("sets the balance for admin and alice, credit for admin, debt for alice", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const adminInstance = await PrivateGroupsContract.at(private_group_contract.address, adminWallet);
    
    const setBalance = await adminInstance.methods.set_balance(adminAddress, aliceAddress, 100).send().wait();
    console.log("setBalance", setBalance);

    const getBalance = await adminInstance.methods.read_balance_credit(adminAddress, aliceAddress).simulate();
    console.log("getBalance", getBalance);
    expect(getBalance).toBe(100n);

    const aliceInstance = await PrivateGroupsContract.at(private_group_contract.address, aliceWallet);
    const getBalanceAlice = await aliceInstance.methods.read_balance_debt(aliceAddress, adminAddress).simulate();
    console.log("getBalanceAlice", getBalanceAlice);
    expect(getBalanceAlice).toBe(100n);

    //alice now pays the admin 50
    const makePayment = await aliceInstance.methods.set_balance(aliceAddress, adminAddress, 20).send().wait();
    console.log("makePayment", makePayment);

    const admin_alice_credit = await adminInstance.methods.read_balance_credit(adminAddress, aliceAddress).simulate();
    console.log("admin_alice_credit", admin_alice_credit);


    const admin_alice_debt = await adminInstance.methods.read_balance_debt(adminAddress, aliceAddress).simulate();
    console.log("admin_alice_debt", admin_alice_debt);

    // const admin_alice_balance = await adminInstance.methods.read_total_balance(adminAddress, aliceAddress).simulate();
    // console.log("admin_alice_balance", admin_alice_balance);


    const getBalanceAlice2 = await aliceInstance.methods.read_balance_debt(aliceAddress, adminAddress).simulate();
    console.log("getBalanceAlice2", getBalanceAlice2);
    expect(getBalanceAlice2).toBe(100n);

    const getBalanceAdmin2 = await adminInstance.methods.read_balance_credit(adminAddress, aliceAddress).simulate();
    console.log("getBalanceAdmin2", getBalanceAdmin2);
    expect(getBalanceAdmin2).toBe(100n);
  }, 300_000);

  it("payments between alice and bob", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const aliceInstance = await PrivateGroupsContract.at(private_group_contract.address, aliceWallet);
    const bobInstance = await PrivateGroupsContract.at(private_group_contract.address, bobWallet);

    const bobOweAlice = await aliceInstance.methods.set_balance(aliceAddress, bobAddress, 100).send().wait();
    console.log("bobOweAlice", bobOweAlice);

    const getBalanceAlice = await aliceInstance.methods.read_balance_credit(aliceAddress, bobAddress).simulate();
    console.log("getBalanceAlice", getBalanceAlice);
    expect(getBalanceAlice).toBe(100n);

    const getBalanceBob = await bobInstance.methods.read_balance_debt(bobAddress, aliceAddress).simulate();
    console.log("getBalanceBob", getBalanceBob);
    expect(getBalanceBob).toBe(100n);

    const bobPayAlice = await bobInstance.methods.make_payment(bobAddress, aliceAddress, 100).send().wait();
    console.log("bobPayAlice", bobPayAlice);

    const getBalanceAlice2 = await aliceInstance.methods.read_balance_credit(aliceAddress, bobAddress).simulate();
    console.log("getBalanceAlice2", getBalanceAlice2);
    expect(getBalanceAlice2).toBe(0n);

    const getBalanceBob2 = await bobInstance.methods.read_balance_debt(bobAddress, aliceAddress).simulate();
    console.log("getBalanceBob2", getBalanceBob2);
    expect(getBalanceBob2).toBe(0n);

    const bobCredit = await bobInstance.methods.read_balance_credit(bobAddress, aliceAddress).simulate();
    console.log("bobCredit", bobCredit);
    
  }, 300_000);

  it("sets up group payments", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const adminInstance = await PrivateGroupsContract.at(private_group_contract.address, adminWallet);
    const aliceInstance = await PrivateGroupsContract.at(private_group_contract.address, aliceWallet);
    const bobInstance = await PrivateGroupsContract.at(private_group_contract.address, bobWallet);

    const setupGroupPayments = await adminInstance.methods.setup_group_payments(adminAddress, [aliceAddress, bobAddress], 150).send().wait();
    console.log("setupGroupPayments", setupGroupPayments);

    const aliceBalance = await aliceInstance.methods.read_balance_debt(aliceAddress, adminAddress).simulate();
    console.log("aliceBalance", aliceBalance);
    expect(aliceBalance).toBe(150n);

    const bobBalance = await bobInstance.methods.read_balance_debt(bobAddress, adminAddress).simulate();
    console.log("bobBalance", bobBalance);
    expect(bobBalance).toBe(50n);

    const adminBalance_alice = await adminInstance.methods.read_balance_credit(adminAddress, aliceAddress).simulate();
    console.log("adminBalance_alice", adminBalance_alice);
    expect(adminBalance_alice).toBe(150n);

    const adminBalance_bob = await adminInstance.methods.read_balance_credit(adminAddress, bobAddress).simulate();
    console.log("adminBalance_bob", adminBalance_bob);
    expect(adminBalance_bob).toBe(50n);
  }, 300_000);

  it("reads balances correctly", async () => {
    const [adminWallet, aliceWallet, bobWallet] = wallets;
    const adminAddress = adminWallet.getCompleteAddress().address;
    const aliceAddress = aliceWallet.getCompleteAddress().address;
    const bobAddress = bobWallet.getCompleteAddress().address;

    const adminInstance = await PrivateGroupsContract.at(private_group_contract.address, adminWallet);
    const aliceInstance = await PrivateGroupsContract.at(private_group_contract.address, aliceWallet);
    const bobInstance = await PrivateGroupsContract.at(private_group_contract.address, bobWallet);

    //pay admin 100
    const alicePayAdmin = await aliceInstance.methods.set_balance(aliceAddress, adminAddress, 100).send().wait();
    console.log("alicePayAdmin", alicePayAdmin);

    const read_admin_alice_credit = await adminInstance.methods.read_balance_credit(adminAddress, aliceAddress).simulate();
    console.log("read_admin_alice_credit", read_admin_alice_credit);
    expect(read_admin_alice_credit).toBe(150n);

    const read_admin_alice_debt = await adminInstance.methods.read_balance_debt(adminAddress, aliceAddress).simulate();
    console.log("read_admin_alice_debt", read_admin_alice_debt);
    expect(read_admin_alice_debt).toBe(120n);
  
    expect(read_admin_alice_credit - read_admin_alice_debt).toBe(30n);

    const aliceBalanceAdmin_credit = await aliceInstance.methods.read_balance_credit(aliceAddress, adminAddress).simulate();
    console.log("aliceBalanceAdmin_credit", aliceBalanceAdmin_credit);
    expect(aliceBalanceAdmin_credit).toBe(120n);
    const aliceBalanceAdmin_debt = await aliceInstance.methods.read_balance_debt(aliceAddress, adminAddress).simulate();
    console.log("aliceBalanceAdmin_debt", aliceBalanceAdmin_debt);
    expect(aliceBalanceAdmin_debt).toBe(150n);
    console.log("aliceBalanceAdmin_credit - aliceBalanceAdmin_debt", aliceBalanceAdmin_credit - aliceBalanceAdmin_debt);
    expect(aliceBalanceAdmin_credit - aliceBalanceAdmin_debt).toBe(-30n);

    const adminBalanceBob_credit = await adminInstance.methods.read_balance_credit(adminAddress, bobAddress).simulate();
    console.log("adminBalanceBob_credit", adminBalanceBob_credit);
    expect(adminBalanceBob_credit).toBe(50n);
    const adminBalanceBob_debt = await adminInstance.methods.read_balance_debt(adminAddress, bobAddress).simulate();
    console.log("adminBalanceBob_debt", adminBalanceBob_debt);
    expect(adminBalanceBob_debt).toBe(0n);
    console.log("adminBalanceBob_credit - adminBalanceBob_debt", adminBalanceBob_credit - adminBalanceBob_debt);
    expect(adminBalanceBob_credit - adminBalanceBob_debt).toBe(50n);

    const bobBalanceAdmin_credit = await bobInstance.methods.read_balance_credit(bobAddress, adminAddress).simulate();
    console.log("bobBalanceAdmin_credit", bobBalanceAdmin_credit);
    expect(bobBalanceAdmin_credit).toBe(0n);
    const bobBalanceAdmin_debt = await bobInstance.methods.read_balance_debt(bobAddress, adminAddress).simulate();
    console.log("bobBalanceAdmin_debt", bobBalanceAdmin_debt);
    expect(bobBalanceAdmin_debt).toBe(50n);
    console.log("bobBalanceAdmin_credit - bobBalanceAdmin_debt", bobBalanceAdmin_credit - bobBalanceAdmin_debt);
    expect(bobBalanceAdmin_credit - bobBalanceAdmin_debt).toBe(-50n);

    const bobBalanceAlice_credit = await bobInstance.methods.read_balance_credit(bobAddress, aliceAddress).simulate();
    console.log("bobBalanceAlice_credit", bobBalanceAlice_credit);
    expect(bobBalanceAlice_credit).toBe(0n);
    const bobBalanceAlice_debt = await bobInstance.methods.read_balance_debt(bobAddress, aliceAddress).simulate();
    console.log("bobBalanceAlice_debt", bobBalanceAlice_debt);
    expect(bobBalanceAlice_debt).toBe(0n);
    console.log("bobBalanceAlice_credit - bobBalanceAlice_debt", bobBalanceAlice_credit - bobBalanceAlice_debt);
    expect(bobBalanceAlice_credit - bobBalanceAlice_debt).toBe(0n);
  }, 300_000);




  
});