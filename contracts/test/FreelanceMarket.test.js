const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreelanceMarket", function () {
  let usdt, escrow, nft, market;
  let owner, client, freelancer1, freelancer2;
  const USDT = (n) => ethers.parseUnits(n.toString(), 6);

  beforeEach(async function () {
    [owner, client, freelancer1, freelancer2] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    const EscrowUSDT = await ethers.getContractFactory("EscrowUSDT");
    escrow = await EscrowUSDT.deploy(await usdt.getAddress(), owner.address);

    const ReputationNFT = await ethers.getContractFactory("ReputationNFT");
    nft = await ReputationNFT.deploy();

    const FreelanceMarket = await ethers.getContractFactory("FreelanceMarket");
    market = await FreelanceMarket.deploy(
      await usdt.getAddress(),
      await escrow.getAddress(),
      await nft.getAddress()
    );

    // Authorize market as NFT minter
    await nft.authorizeMinter(await market.getAddress());

    // Fund client
    await usdt.mint(client.address, USDT(100000));
  });

  describe("Job Posting", function () {
    it("should post a job", async function () {
      await market.connect(client).postJob(
        "Terraform AWS Setup",
        "ipfs://QmDescription",
        ["Terraform", "AWS", "IaC"],
        USDT(5000)
      );

      const job = await market.getJob(0);
      expect(job.client).to.equal(client.address);
      expect(job.title).to.equal("Terraform AWS Setup");
      expect(job.budget).to.equal(USDT(5000));
      expect(job.status).to.equal(0); // Open
    });

    it("should emit JobPosted event", async function () {
      await expect(
        market.connect(client).postJob("K8s Audit", "ipfs://Qm", ["Kubernetes"], USDT(3000))
      ).to.emit(market, "JobPosted")
        .withArgs(0, client.address, "K8s Audit", USDT(3000));
    });

    it("should track client jobs", async function () {
      await market.connect(client).postJob("Job 1", "desc", ["Skill"], USDT(1000));
      await market.connect(client).postJob("Job 2", "desc", ["Skill"], USDT(2000));
      const jobIds = await market.getClientJobIds(client.address);
      expect(jobIds.length).to.equal(2);
    });

    it("should reject empty title", async function () {
      await expect(
        market.connect(client).postJob("", "desc", ["Skill"], USDT(1000))
      ).to.be.revertedWith("Title required");
    });

    it("should reject zero budget", async function () {
      await expect(
        market.connect(client).postJob("Job", "desc", ["Skill"], 0)
      ).to.be.revertedWith("Budget must be > 0");
    });

    it("should reject empty skills", async function () {
      await expect(
        market.connect(client).postJob("Job", "desc", [], USDT(1000))
      ).to.be.revertedWith("1-10 skills required");
    });

    it("should return job skills", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS", "Docker"], USDT(1000));
      const skills = await market.getJobSkills(0);
      expect(skills).to.deep.equal(["AWS", "Docker"]);
    });
  });

  describe("Bidding", function () {
    beforeEach(async function () {
      await market.connect(client).postJob(
        "Cloud Audit", "ipfs://Qm", ["AWS", "Security"], USDT(5000)
      );
    });

    it("should place a bid with milestones", async function () {
      await market.connect(freelancer1).placeBid(
        0, USDT(4500), "ipfs://QmProposal", 14,
        ["Assessment", "Report"], [USDT(2000), USDT(2500)]
      );

      const bid = await market.getBid(0);
      expect(bid.freelancer).to.equal(freelancer1.address);
      expect(bid.amount).to.equal(USDT(4500));
      expect(bid.status).to.equal(0); // Pending
    });

    it("should track bid milestones", async function () {
      await market.connect(freelancer1).placeBid(
        0, USDT(4500), "proposal", 14,
        ["Phase 1", "Phase 2"], [USDT(2000), USDT(2500)]
      );
      const m = await market.getBidMilestones(0);
      expect(m.descriptions).to.deep.equal(["Phase 1", "Phase 2"]);
    });

    it("should reject client bidding own job", async function () {
      await expect(
        market.connect(client).placeBid(0, USDT(4000), "p", 10, ["M1"], [USDT(4000)])
      ).to.be.revertedWith("Client cannot bid own job");
    });

    it("should reject mismatched milestone amounts", async function () {
      await expect(
        market.connect(freelancer1).placeBid(
          0, USDT(5000), "p", 14,
          ["M1", "M2"], [USDT(2000), USDT(2000)]
        )
      ).to.be.revertedWith("Milestone amounts must equal bid amount");
    });

    it("should reject bid on non-existent job", async function () {
      await expect(
        market.connect(freelancer1).placeBid(99, USDT(1000), "p", 7, ["M1"], [USDT(1000)])
      ).to.be.revertedWith("Job does not exist");
    });

    it("should track freelancer bids", async function () {
      await market.connect(freelancer1).placeBid(0, USDT(4500), "p", 14, ["M1"], [USDT(4500)]);
      const bidIds = await market.getFreelancerBidIds(freelancer1.address);
      expect(bidIds.length).to.equal(1);
    });
  });

  describe("Bid Acceptance", function () {
    beforeEach(async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(freelancer1).placeBid(
        0, USDT(4500), "proposal", 14,
        ["Phase 1", "Phase 2"], [USDT(2000), USDT(2500)]
      );
      await market.connect(freelancer2).placeBid(
        0, USDT(4800), "proposal2", 10,
        ["All-in-one"], [USDT(4800)]
      );
    });

    it("should accept bid and create escrow", async function () {
      await usdt.connect(client).approve(await market.getAddress(), USDT(4500));
      await market.connect(client).acceptBid(0);

      const job = await market.getJob(0);
      expect(job.status).to.equal(1); // InProgress
      expect(job.freelancer).to.equal(freelancer1.address);
    });

    it("should reject other bids automatically", async function () {
      await usdt.connect(client).approve(await market.getAddress(), USDT(4500));
      await market.connect(client).acceptBid(0);

      const bid2 = await market.getBid(1);
      expect(bid2.status).to.equal(2); // Rejected
    });

    it("should reject non-client acceptance", async function () {
      await expect(market.connect(freelancer1).acceptBid(0))
        .to.be.revertedWith("Only client can accept");
    });

    it("should track freelancer jobs", async function () {
      await usdt.connect(client).approve(await market.getAddress(), USDT(4500));
      await market.connect(client).acceptBid(0);
      const jobIds = await market.getFreelancerJobIds(freelancer1.address);
      expect(jobIds.length).to.equal(1);
    });
  });

  describe("Job Completion", function () {
    it("should complete job and record reputation", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(freelancer1).placeBid(
        0, USDT(4500), "p", 14, ["M1"], [USDT(4500)]
      );
      await usdt.connect(client).approve(await market.getAddress(), USDT(4500));
      await market.connect(client).acceptBid(0);

      await market.connect(client).completeJob(0);

      const job = await market.getJob(0);
      expect(job.status).to.equal(2); // Completed

      const stats = await nft.getFreelancerStats(freelancer1.address);
      expect(stats.completedJobs).to.equal(1);
    });

    it("should reject non-client completion", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(1000));
      await expect(market.connect(freelancer1).completeJob(0))
        .to.be.revertedWith("Only client can complete");
    });
  });

  describe("Job Cancellation", function () {
    it("should cancel open job", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(client).cancelJob(0);
      const job = await market.getJob(0);
      expect(job.status).to.equal(3); // Cancelled
    });

    it("should reject cancel of in-progress job", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(freelancer1).placeBid(0, USDT(4500), "p", 14, ["M1"], [USDT(4500)]);
      await usdt.connect(client).approve(await market.getAddress(), USDT(4500));
      await market.connect(client).acceptBid(0);

      await expect(market.connect(client).cancelJob(0))
        .to.be.revertedWith("Can only cancel open jobs");
    });
  });

  describe("Bid Withdrawal", function () {
    it("should allow freelancer to withdraw bid", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(freelancer1).placeBid(0, USDT(4500), "p", 14, ["M1"], [USDT(4500)]);
      await market.connect(freelancer1).withdrawBid(0);

      const bid = await market.getBid(0);
      expect(bid.status).to.equal(3); // Withdrawn
    });

    it("should reject non-bidder withdrawal", async function () {
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(5000));
      await market.connect(freelancer1).placeBid(0, USDT(4500), "p", 14, ["M1"], [USDT(4500)]);
      await expect(market.connect(freelancer2).withdrawBid(0))
        .to.be.revertedWith("Only bidder can withdraw");
    });
  });

  describe("Pause", function () {
    it("should pause and unpause", async function () {
      await market.pause();
      await expect(
        market.connect(client).postJob("Job", "desc", ["AWS"], USDT(1000))
      ).to.be.revertedWithCustomError(market, "EnforcedPause");

      await market.unpause();
      await market.connect(client).postJob("Job", "desc", ["AWS"], USDT(1000));
    });
  });
});
