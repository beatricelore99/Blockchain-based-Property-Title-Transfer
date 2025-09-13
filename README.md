# 🏠 Blockchain-based Property Title Transfer

Welcome to a revolutionary way to handle real estate property transfers on the blockchain! This project automates property title transfers using the Stacks blockchain and Clarity smart contracts, eliminating the need for expensive notaries, reducing fees, and ensuring transparent, immutable records to prevent fraud.

## ✨ Features

🔒 Secure registration of property titles as NFTs  
💸 Automated escrow for safe fund transfers during sales  
⏱️ Instant verification of ownership and transfer history  
📜 Immutable audit trail for all transactions  
🚫 Built-in dispute resolution mechanisms  
💰 Integration for handling liens, mortgages, and tax payments  
🔑 KYC-compliant user verification to comply with regulations  
📉 Reduces traditional notary and legal fees by up to 80%  

## 🛠 How It Works

**For Property Owners/Sellers**  
- Register your property with details like address, legal description, and proof documents (hashed for privacy).  
- Create a transfer request when selling, specifying the buyer and sale price.  
- Funds are held in escrow until all conditions (e.g., inspections, verifications) are met.  
- Once approved, the title NFT transfers automatically, updating ownership instantly.  

**For Buyers**  
- Verify the property's ownership and history using public queries.  
- Deposit funds into escrow and fulfill any required conditions (e.g., mortgage approval).  
- Receive the title NFT upon successful transfer, with all records logged immutably.  

**For Verifiers/Authorities**  
- Query the blockchain for ownership details, liens, or disputes.  
- Use built-in tools to resolve issues or enforce regulations without intermediaries.  

This system solves the real-world problem of cumbersome, costly property transfers by leveraging blockchain for efficiency, security, and cost savings.

## 📑 Smart Contracts

This project involves 8 Clarity smart contracts, each handling a specific aspect of the property transfer process for modularity and security:

1. **PropertyRegistry.clar** - Registers new properties with unique IDs, stores hashed legal documents, and issues ownership NFTs.  
2. **OwnershipNFT.clar** - Manages NFT-based titles, including minting, burning, and transferring ownership tokens.  
3. **TransferRequest.clar** - Handles creation and approval of transfer requests between sellers and buyers.  
4. **EscrowManager.clar** - Secures funds in escrow during transfers, releasing them only when conditions are met.  
5. **VerificationOracle.clar** - Integrates off-chain verifications (e.g., identity checks or document hashes) via trusted oracles.  
6. **DisputeResolution.clar** - Allows filing and resolving disputes with voting or arbitration mechanisms.  
7. **LienAndMortgage.clar** - Tracks liens, mortgages, and releases them upon payment or transfer completion.  
8. **AuditHistory.clar** - Logs all transactions and changes for immutable auditing and compliance reporting.  

These contracts interact seamlessly, ensuring a robust, decentralized solution for property title management.