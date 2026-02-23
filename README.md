# FreelanceEscrowChain

**Decentralized SRE/DevOps Freelance Marketplace with USDT Escrow & Soulbound Reputation NFTs**

A production-grade Web3 dApp where clients hire SRE/DevOps professionals for cloud audits, Terraform setups, script reviews, and infrastructure consulting — all paid through smart contract escrow with USDT stablecoins on Ethereum/Polygon.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   Home   │  │ Post Job │  │  Browse  │           │
│  │   Page   │  │   Page   │  │   Jobs   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐                          │
│  │Dashboard │  │ Profile  │  Wagmi + RainbowKit      │
│  └──────────┘  └──────────┘                          │
└───────────────────────┬─────────────────────────────┘
                        │ JSON-RPC (Viem)
┌───────────────────────┼─────────────────────────────┐
│              Ethereum / Polygon Testnet              │
│  ┌──────────────────────────────────────────────┐   │
│  │           FreelanceMarket.sol                 │   │
│  │  ┌─────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │  Jobs   │  │   Bids     │  │ Escrow   │  │   │
│  │  │ Posting │  │  System    │  │  Link    │  │   │
│  │  └─────────┘  └────────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│  ┌────────────────┐  ┌────────────────────────┐     │
│  │  EscrowUSDT    │  │   ReputationNFT        │     │
│  │  ┌──────────┐  │  │  ┌─────────────────┐   │     │
│  │  │Milestones│  │  │  │  Soulbound NFT  │   │     │
│  │  │ Deposits │  │  │  │  On-chain SVG   │   │     │
│  │  │ Disputes │  │  │  │  Tier System    │   │     │
│  │  └──────────┘  │  │  └─────────────────┘   │     │
│  └────────────────┘  └────────────────────────┘     │
│  ┌────────────────┐                                  │
│  │   MockUSDT     │  (Test ERC-20, 6 decimals)      │
│  └────────────────┘                                  │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Wallet | RainbowKit 2, Wagmi 2, Viem 2 |
| Smart Contracts | Solidity 0.8.27, OpenZeppelin 5.1 |
| Dev Framework | Hardhat 2.22, Hardhat Toolbox |
| Testing | Chai, Hardhat Network Helpers |
| Deploy | Sepolia, Polygon Mumbai, Vercel |

## Features

### Smart Contracts (4 contracts)
- **MockUSDT**: Test ERC-20 with faucet (10k USDT/hour cooldown)
- **EscrowUSDT**: Milestone-based escrow with dispute resolution (2/3 arbiter vote, 7-day window), circuit breaker (Pausable), 2.5% platform fee
- **ReputationNFT**: Soulbound ERC-721 with on-chain SVG, tier system (Bronze -> Diamond), auto-minted every 5 jobs
- **FreelanceMarket**: Job posting, bidding with milestones, bid acceptance, auto-rejection, completion tracking

### Frontend Pages
- **Home**: Hero section, features, services, featured freelancers
- **Post Job**: Multi-skill selector, budget input, milestone builder
- **Browse Jobs**: Search, filter by skills, job cards with live data
- **Job Detail**: Full job info, bid form with milestones, bid list with accept
- **Dashboard**: Client/freelancer views, escrow tracking, milestone actions (start/submit/approve)
- **Profile**: Reputation stats, NFT gallery, tier progress, job history, USDT balance

### Security & SRE
- **Circuit Breaker**: `Pausable` on all contracts for emergency stops
- **ReentrancyGuard**: On all fund-movement functions
- **SafeERC20**: For all token transfers
- **Soulbound NFTs**: Non-transferable reputation tokens
- **Multi-sig Disputes**: 2/3 arbiter voting system
- **Gas Optimization**: `viaIR` compiler, optimized storage patterns

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Sepolia ETH for gas ([faucet](https://sepoliafaucet.com))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/FreelanceEscrowChain.git
cd FreelanceEscrowChain

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Contracts
cp contracts/.env.example contracts/.env
# Edit contracts/.env with your Alchemy key and deployer private key

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with contract addresses after deployment
```

### 3. Compile & Test Contracts

```bash
cd contracts
npx hardhat compile
npx hardhat test
npx hardhat coverage
```

### 4. Deploy to Testnet

```bash
# Start local node (for development)
npx hardhat node

# Deploy to local
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Mumbai
npx hardhat run scripts/deploy.js --network mumbai
```

After deployment, copy the contract addresses from the console output to your frontend `.env.local`.

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
Client posts job -> Freelancer browses -> Places bid with milestones
  -> Client reviews bids -> Accepts bid -> USDT deposited to escrow
  -> Freelancer starts milestone -> Submits work -> Client approves
  -> Funds released (minus 2.5% fee) -> Repeat for all milestones
  -> Job completed -> Reputation recorded -> NFT minted every 5 jobs
```

### Dispute Flow
```
Either party opens dispute -> Owner assigns 3 registered arbiters
  -> Arbiters vote (FavorClient or FavorFreelancer)
  -> 2/3 majority -> Funds distributed accordingly
```

---

## Testing

```bash
cd contracts
npx hardhat test
```

Test suite covers:
- **MockUSDT**: deployment, faucet, cooldown, owner mint
- **EscrowUSDT**: creation, funding, milestone lifecycle, disputes, cancellation, circuit breaker, admin
- **ReputationNFT**: authorization, job recording, NFT minting at threshold, soulbound transfers, tiers, on-chain SVG
- **FreelanceMarket**: job posting, bidding, acceptance, completion, cancellation, withdrawal, pause

### Slither Security Analysis

```bash
pip install slither-analyzer
cd contracts
slither . --config-file slither.config.json
```

Known findings (by design):
- `centralization-risk`: Owner controls circuit breaker and arbiter registration (intentional admin controls)
- `reentrancy`: All fund movements protected by `ReentrancyGuard`
- `timestamp`: Dispute deadlines use `block.timestamp` (acceptable for 7-day windows)

---

## Deployment

### Vercel (Frontend)

```bash
cd frontend
npx vercel
```

Or connect your GitHub repo to Vercel and set environment variables in the Vercel dashboard.

### Contract Verification

Contracts are automatically verified on Etherscan/Polygonscan during deployment if API keys are configured.

---

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| MockUSDT | *Deploy and update* |
| EscrowUSDT | *Deploy and update* |
| ReputationNFT | *Deploy and update* |
| FreelanceMarket | *Deploy and update* |

---

## Test USDT Faucet

After deployment, users can claim 10,000 mUSDT per hour by:
1. Connecting wallet on the dApp
2. Clicking "Claim 10k mUSDT" button (available on Dashboard and Profile)
3. Or calling `faucet()` directly on the MockUSDT contract

---

## Monitoring & Observability

### Tenderly Integration
1. Create a Tenderly project at [tenderly.co](https://tenderly.co)
2. Import deployed contracts
3. Set up alerts for:
   - Escrow funded events
   - Dispute opened events
   - Circuit breaker triggers
   - Large USDT transfers

### On-chain Events
All contracts emit comprehensive events for indexing:
- `EscrowCreated`, `EscrowFunded`, `MilestoneApproved`, `FundsReleased`
- `DisputeOpened`, `DisputeVoted`, `DisputeResolved`
- `JobPosted`, `BidPlaced`, `BidAccepted`, `JobCompleted`
- `ReputationMinted`, `JobRecorded`

---

## Project Structure

```
FreelanceEscrowChain/
├── contracts/
│   ├── contracts/
│   │   ├── MockUSDT.sol
│   │   ├── EscrowUSDT.sol
│   │   ├── ReputationNFT.sol
│   │   └── FreelanceMarket.sol
│   ├── test/
│   │   ├── MockUSDT.test.js
│   │   ├── EscrowUSDT.test.js
│   │   ├── ReputationNFT.test.js
│   │   └── FreelanceMarket.test.js
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── providers.tsx
│   │   │   ├── globals.css
│   │   │   ├── post-job/page.tsx
│   │   │   ├── jobs/page.tsx
│   │   │   ├── jobs/[id]/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── FaucetButton.tsx
│   │   └── config/
│   │       ├── abis.ts
│   │       ├── contracts.ts
│   │       └── wagmi.ts
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── README.md
```

---

## License

MIT
