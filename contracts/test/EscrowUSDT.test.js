const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EscrowUSDT", function () {
  let usdt, escrow, owner, client, freelancer, arbiter1, arbiter2, arbiter3;
  const USDT = (n) => ethers.parseUnits(n.toString(), 6);

  beforeEach(async function () {
    [owner, client, freelancer, arbiter1, arbiter2, arbiter3] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    const EscrowUSDT = await ethers.getContractFactory("EscrowUSDT");
    escrow = await EscrowUSDT.deploy(await usdt.getAddress(), owner.address);

    // Fund client
    await usdt.mint(client.address, USDT(100000));
    // Register arbiters
    await escrow.registerArbiter(arbiter1.address);
    await escrow.registerArbiter(arbiter2.address);
    await escrow.registerArbiter(arbiter3.address);
  });

  async function createAndFundEscrow() {
    const tx = await escrow.createEscrow(
      0, client.address, freelancer.address,
      ["Setup Terraform", "Deploy Infrastructure"],
      [USDT(3000), USDT(2000)]
    );
    await tx.wait();

    await usdt.connect(client).approve(await escrow.getAddress(), USDT(5000));
    await escrow.connect(client).fundEscrow(0);
    return 0;
  }

  describe("Escrow Creation", function () {
    it("should create escrow with milestones", async function () {
      await escrow.createEscrow(
        0, client.address, freelancer.address,
        ["Milestone 1"], [USDT(1000)]
      );

      const e = await escrow.getEscrow(0);
      expect(e.client).to.equal(client.address);
      expect(e.freelancer).to.equal(freelancer.address);
      expect(e.totalAmount).to.equal(USDT(1000));
      expect(e.status).to.equal(0); // Created
    });

    it("should reject invalid addresses", async function () {
      await expect(
        escrow.createEscrow(0, ethers.ZeroAddress, freelancer.address, ["M1"], [USDT(100)])
      ).to.be.revertedWith("Invalid addresses");
    });

    it("should reject same client and freelancer", async function () {
      await expect(
        escrow.createEscrow(0, client.address, client.address, ["M1"], [USDT(100)])
      ).to.be.revertedWith("Client cannot be freelancer");
    });

    it("should reject empty milestones", async function () {
      await expect(
        escrow.createEscrow(0, client.address, freelancer.address, [], [])
      ).to.be.revertedWith("Need at least 1 milestone");
    });

    it("should reject array length mismatch", async function () {
      await expect(
        escrow.createEscrow(0, client.address, freelancer.address, ["M1", "M2"], [USDT(100)])
      ).to.be.revertedWith("Array length mismatch");
    });

    it("should reject zero milestone amount", async function () {
      await expect(
        escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [0])
      ).to.be.revertedWith("Milestone amount must be > 0");
    });

    it("should emit EscrowCreated event", async function () {
      await expect(
        escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)])
      ).to.emit(escrow, "EscrowCreated")
        .withArgs(0, 0, client.address, freelancer.address, USDT(1000));
    });
  });

  describe("Funding", function () {
    it("should fund escrow with USDT", async function () {
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
      await usdt.connect(client).approve(await escrow.getAddress(), USDT(1000));
      await escrow.connect(client).fundEscrow(0);

      const e = await escrow.getEscrow(0);
      expect(e.status).to.equal(1); // Funded
      expect(await usdt.balanceOf(await escrow.getAddress())).to.equal(USDT(1000));
    });

    it("should reject non-client funding", async function () {
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
      await expect(escrow.connect(freelancer).fundEscrow(0)).to.be.revertedWith("Not the client");
    });

    it("should reject double funding", async function () {
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
      await usdt.connect(client).approve(await escrow.getAddress(), USDT(1000));
      await escrow.connect(client).fundEscrow(0);
      await expect(escrow.connect(client).fundEscrow(0)).to.be.revertedWith("Escrow not in Created state");
    });
  });

  describe("Milestone Workflow", function () {
    it("should complete full milestone flow", async function () {
      await createAndFundEscrow();

      // Start milestone
      await escrow.connect(freelancer).startMilestone(0, 0);
      let m = await escrow.getMilestone(0, 0);
      expect(m.status).to.equal(1); // InProgress

      // Submit milestone
      await escrow.connect(freelancer).submitMilestone(0, 0);
      m = await escrow.getMilestone(0, 0);
      expect(m.status).to.equal(2); // Submitted

      // Approve milestone
      const balBefore = await usdt.balanceOf(freelancer.address);
      await escrow.connect(client).approveMilestone(0, 0);
      const balAfter = await usdt.balanceOf(freelancer.address);

      // 3000 USDT - 2.5% fee = 2925 USDT
      expect(balAfter - balBefore).to.equal(USDT(2925));
    });

    it("should collect platform fee", async function () {
      await createAndFundEscrow();
      await escrow.connect(freelancer).startMilestone(0, 0);
      await escrow.connect(freelancer).submitMilestone(0, 0);

      const feeBefore = await usdt.balanceOf(owner.address);
      await escrow.connect(client).approveMilestone(0, 0);
      const feeAfter = await usdt.balanceOf(owner.address);

      expect(feeAfter - feeBefore).to.equal(USDT(75)); // 2.5% of 3000
    });

    it("should mark escrow completed when all milestones approved", async function () {
      await createAndFundEscrow();

      // Complete both milestones
      for (let i = 0; i < 2; i++) {
        await escrow.connect(freelancer).startMilestone(0, i);
        await escrow.connect(freelancer).submitMilestone(0, i);
        await escrow.connect(client).approveMilestone(0, i);
      }

      const e = await escrow.getEscrow(0);
      expect(e.status).to.equal(4); // Completed (enum index)
    });

    it("should reject start by non-freelancer", async function () {
      await createAndFundEscrow();
      await expect(escrow.connect(client).startMilestone(0, 0))
        .to.be.revertedWith("Not the freelancer");
    });

    it("should reject submit without start", async function () {
      await createAndFundEscrow();
      await expect(escrow.connect(freelancer).submitMilestone(0, 0))
        .to.be.revertedWith("Milestone not in progress");
    });

    it("should reject approve without submit", async function () {
      await createAndFundEscrow();
      await escrow.connect(freelancer).startMilestone(0, 0);
      await expect(escrow.connect(client).approveMilestone(0, 0))
        .to.be.revertedWith("Milestone not submitted");
    });
  });

  describe("Disputes", function () {
    beforeEach(async function () {
      await createAndFundEscrow();
      await escrow.connect(freelancer).startMilestone(0, 0);
      await escrow.connect(freelancer).submitMilestone(0, 0);
    });

    it("should open dispute on submitted milestone", async function () {
      await expect(escrow.connect(client).openDispute(0, 0))
        .to.emit(escrow, "DisputeOpened")
        .withArgs(0, 0, 0);

      const e = await escrow.getEscrow(0);
      expect(e.status).to.equal(4); // Disputed
    });

    it("should resolve dispute in favor of client (refund)", async function () {
      await escrow.connect(client).openDispute(0, 0);
      await escrow.assignArbiters(0, [arbiter1.address, arbiter2.address, arbiter3.address]);

      const balBefore = await usdt.balanceOf(client.address);
      await escrow.connect(arbiter1).voteOnDispute(0, 1); // FavorClient
      await escrow.connect(arbiter2).voteOnDispute(0, 1); // FavorClient

      const balAfter = await usdt.balanceOf(client.address);
      expect(balAfter - balBefore).to.equal(USDT(3000));
    });

    it("should resolve dispute in favor of freelancer", async function () {
      await escrow.connect(freelancer).openDispute(0, 0);
      await escrow.assignArbiters(0, [arbiter1.address, arbiter2.address, arbiter3.address]);

      const balBefore = await usdt.balanceOf(freelancer.address);
      await escrow.connect(arbiter1).voteOnDispute(0, 2); // FavorFreelancer
      await escrow.connect(arbiter2).voteOnDispute(0, 2); // FavorFreelancer

      const balAfter = await usdt.balanceOf(freelancer.address);
      expect(balAfter - balBefore).to.equal(USDT(2925)); // 3000 - 2.5% fee
    });

    it("should reject vote from non-arbiter", async function () {
      await escrow.connect(client).openDispute(0, 0);
      await escrow.assignArbiters(0, [arbiter1.address, arbiter2.address, arbiter3.address]);
      await expect(escrow.connect(client).voteOnDispute(0, 1))
        .to.be.revertedWith("Not an arbiter for this dispute");
    });

    it("should reject double vote", async function () {
      await escrow.connect(client).openDispute(0, 0);
      await escrow.assignArbiters(0, [arbiter1.address, arbiter2.address, arbiter3.address]);
      await escrow.connect(arbiter1).voteOnDispute(0, 1);
      await expect(escrow.connect(arbiter1).voteOnDispute(0, 1))
        .to.be.revertedWith("Already voted");
    });

    it("should reject dispute on non-submitted milestone", async function () {
      await escrow.connect(freelancer).startMilestone(0, 1);
      await expect(escrow.connect(client).openDispute(0, 1))
        .to.be.revertedWith("Milestone not submitted");
    });

    it("should reject non-party opening dispute", async function () {
      await expect(escrow.connect(arbiter1).openDispute(0, 0))
        .to.be.revertedWith("Not a party to this escrow");
    });
  });

  describe("Cancellation", function () {
    it("should cancel unfunded escrow", async function () {
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
      await escrow.connect(client).cancelEscrow(0);
      const e = await escrow.getEscrow(0);
      expect(e.status).to.equal(6); // Cancelled
    });

    it("should cancel funded escrow and refund", async function () {
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
      await usdt.connect(client).approve(await escrow.getAddress(), USDT(1000));
      await escrow.connect(client).fundEscrow(0);

      const balBefore = await usdt.balanceOf(client.address);
      await escrow.connect(client).cancelEscrow(0);
      const balAfter = await usdt.balanceOf(client.address);

      expect(balAfter - balBefore).to.equal(USDT(1000));
    });

    it("should reject cancel of active escrow", async function () {
      await createAndFundEscrow();
      await escrow.connect(freelancer).startMilestone(0, 0);
      await expect(escrow.connect(client).cancelEscrow(0))
        .to.be.revertedWith("Cannot cancel active escrow");
    });
  });

  describe("Circuit Breaker", function () {
    it("should pause all operations", async function () {
      await escrow.triggerCircuitBreaker();
      await expect(
        escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)])
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("should unpause", async function () {
      await escrow.triggerCircuitBreaker();
      await escrow.unpause();
      await escrow.createEscrow(0, client.address, freelancer.address, ["M1"], [USDT(1000)]);
    });

    it("should reject non-owner pause", async function () {
      await expect(escrow.connect(client).triggerCircuitBreaker())
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Admin", function () {
    it("should register and remove arbiters", async function () {
      const addr = ethers.Wallet.createRandom().address;
      await escrow.registerArbiter(addr);
      expect(await escrow.registeredArbiters(addr)).to.be.true;

      await escrow.removeArbiter(addr);
      expect(await escrow.registeredArbiters(addr)).to.be.false;
    });

    it("should update fee recipient", async function () {
      await escrow.setFeeRecipient(client.address);
      expect(await escrow.feeRecipient()).to.equal(client.address);
    });

    it("should reject zero address fee recipient", async function () {
      await expect(escrow.setFeeRecipient(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });
  });

  describe("Views", function () {
    it("should return milestone count", async function () {
      await escrow.createEscrow(
        0, client.address, freelancer.address,
        ["M1", "M2", "M3"], [USDT(100), USDT(200), USDT(300)]
      );
      expect(await escrow.getMilestoneCount(0)).to.equal(3);
    });

    it("should return dispute info", async function () {
      await createAndFundEscrow();
      await escrow.connect(freelancer).startMilestone(0, 0);
      await escrow.connect(freelancer).submitMilestone(0, 0);
      await escrow.connect(client).openDispute(0, 0);

      const d = await escrow.getDispute(0);
      expect(d.escrowId).to.equal(0);
      expect(d.resolved).to.be.false;
    });
  });
});
