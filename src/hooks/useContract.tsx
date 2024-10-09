// useContract.js
import { useState } from 'react';
import { AccountWalletWithSecretKey, Contract, Fr, loadContractArtifact, NoirCompiledContract } from '@aztec/aztec.js';
import { toast } from 'react-toastify';
import PrivateGroupsContractJson from '../contracts/target/private_groups-PrivateGroups.json' assert { type: 'json' };

export function useContract(adminWallet: AccountWalletWithSecretKey, groupMembers: AccountWalletWithSecretKey[]) {
  const [wait, setWait] = useState(false);
  const [contract, setContract] = useState<Contract | undefined>();
  const [walletInstances, setWalletInstances] = useState<Contract[]>([]);

  const deploy = async () => {
    setWait(true);
    console.log("groupMembers", groupMembers.map(member => member.getAddress()));

    try {
      const PrivateGroupContractArtifact = loadContractArtifact(PrivateGroupsContractJson as unknown as NoirCompiledContract);
      const tx = await Contract.deploy(
        adminWallet,
        PrivateGroupContractArtifact,
        [adminWallet.getAddress(), groupMembers.map(member => member.getAddress())]
      ).send();

      const contract = await toast.promise(tx.deployed(), {
        pending: 'Deploying contract...',
        success: {
          render: ({ data }) => `Address: ${data.address}`,
        },
        error: 'Error deploying contract',
      });

      setContract(contract);
      console.log("Contract deployed at:", contract.address);

      // Create instances only for each group member
      const instances = await Promise.all(
        groupMembers.map(async (wallet: AccountWalletWithSecretKey) => {
          console.log("Creating instance for wallet:", wallet.getAddress());
          return await Contract.at(contract.address, PrivateGroupContractArtifact, wallet);
        })
      );

      setWalletInstances(instances);
      console.log("All instances created for group members:", instances);
      return instances;
    } catch (error) {
      console.error("Error deploying contract:", error);
      toast.error("Error deploying contract");
      return [];
    } finally {
      setWait(false);
    }
  };

  return { deploy, contract, wait, walletInstances };
}
