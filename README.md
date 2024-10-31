# Private Expense Splitting Contract in Aztec

This project is a walk-through for creating an expense splitting contract in Aztec, focusing on private and public contexts, contract deployment, testing with AztecJS and the Testing Execution Environment (TXE), creating notes, and setting up a demo frontend. This project uses Aztec version 0.60.0, which is in pre-release. Future updates may include breaking changes.

## Project Overview

In this tutorial, you’ll learn to:

1. Write contracts with private state in Aztec.
2. Understand and compare design patterns for public and private contexts.
3. Create notes and interact with contract state through notes.
4. Test Aztec contracts using AztecJS and the TXE.
5. Implement a simple frontend using AztecJS.

These contracts are for educational purposes and are not optimized or production-ready.

## Prerequisites

- Aztec Sandbox with PXE, aztec-nargo version 0.60.0

For more background, review Aztec’s documentation at [Aztec Network](https://docs.aztec.network/).

---

## Setup

1. **Install Dependencies**:

   ```bash

   yarn install
   ```

2. **Initialize Project**:

   - Initialize your Aztec project within the `src` folder:

     ```bash

     mkdir src && cd src
     aztec-nargo new --contract circuits
     ```

3. **Generate TypeScript Artifacts**:

   - Compile the Noir contract and generate TypeScript artifacts:

     ```bash

     cd src/circuits
     aztec-nargo compile
     aztec codegen -o src/artifacts target
     ```

4. **Installing the Aztec Sandbox** .

```bash

    bash -i <(curl -s https://install.aztec.network)

```

5. **Running the Aztec Sandbox** (make sure it’s running for contract interaction)

```

    aztec start --sandbox

```

---

## Writing Contracts and Notes

In this tutorial, we’ll create:

- `PrivateGroups`: A contract to manage shared balances, member groups, and payments.
- `NewAddressNote`: A custom note type that includes an Aztec address and encrypted data.

For more information on contract functions and design patterns, refer to the comments within `main.nr` and `NewAddressNote.nr`.

---

## Testing

Two main testing options are available:

### 1. End-to-End Testing with AztecJS

1. **Setup Testing Files**:
   - Add Jest and TypeScript configuration files:
     - `jest.integration.config.json`
     - `tsconfig.json`
2. **Run Tests**:

   ```bash

   yarn test
   ```

### 2. TXE Testing

TXE tests allow direct contract storage access without full protocol checks, ideal for rapid development. Tests are stored within `src/circuits/src/test`.

1. **Run TXE Tests**:

   ```bash

   cd src/circuits
   aztec test --show-output
   ```

---

## Key Concepts

1. **Notes**: In Aztec, notes provide a private, UTXO-like model for transactions, where each note can represent value or arbitrary data, stored in a private, append-only Merkle tree.
2. **Contexts**:
   - **Public Context**: Simpler structure, all data accessible.
   - **Private Context**: Requires encrypted notes for private state, offering higher privacy.
3. **Testing with TXE**: TXE enables faster testing through “cheatcodes” for flexible, isolated testing without full protocol compliance.

## Additional Resources

- **Aztec Documentation**: https://docs.aztec.network/
- **AztecJS API Reference**: Helpful for frontend interactions and contracts.
- This was based on the aztec box. https://docs.aztec.network/guides/developer_guides/local_env/cloning_a_box
