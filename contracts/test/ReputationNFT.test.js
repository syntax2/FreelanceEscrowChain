const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationNFT", function () {
  let nft, owner, freelancer, minter, other;

  beforeEach(async function () {
    [owner, freelancer, minter, other] = await ethers.getSigners();
    const ReputationNFT = await ethers.getContractFactory("ReputationNFT");
    nft = await ReputationNFT.deploy();
    await nft.authorizeMinter(minter.address);
  });

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      expect(await nft.name()).to.equal("FreelanceEscrowChain Reputation");
      expect(await nft.symbol()).to.equal("FECR");
    });
  });

  describe("Minter Authorization", function () {
    it("should authorize minter", async function () {
      expect(await nft.authorizedMinters(minter.address)).to.be.true;
    });

    it("should revoke minter", async function () {
      await nft.revokeMinter(minter.address);
      expect(await nft.authorizedMinters(minter.address)).to.be.false;
    });

    it("should reject unauthorized minter", async function () {
      await expect(
        nft.connect(other).recordCompletedJob(freelancer.address, "Job", 1000)
      ).to.be.revertedWith("Not authorized");
    });

    it("should reject non-owner authorization", async function () {
      await expect(nft.connect(other).authorizeMinter(other.address))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  describe("Job Recording", function () {
    it("should record completed job", async function () {
      await nft.connect(minter).recordCompletedJob(freelancer.address, "Terraform Setup", 5000);
      const stats = await nft.getFreelancerStats(freelancer.address);
      expect(stats.completedJobs).to.equal(1);
      expect(stats.totalEarned).to.equal(5000);
    });

    it("should emit JobRecorded event", async function () {
      await expect(nft.connect(minter).recordCompletedJob(freelancer.address, "K8s Audit", 3000))
        .to.emit(nft, "JobRecorded")
        .withArgs(freelancer.address, "K8s Audit", 3000);
    });

    it("should track job titles", async function () {
      await nft.connect(minter).recordCompletedJob(freelancer.address, "Job 1", 1000);
      await nft.connect(minter).recordCompletedJob(freelancer.address, "Job 2", 2000);
      const titles = await nft.getFreelancerJobTitles(freelancer.address);
      expect(titles).to.deep.equal(["Job 1", "Job 2"]);
    });

    it("should reject zero address freelancer", async function () {
      await expect(
        nft.connect(minter).recordCompletedJob(ethers.ZeroAddress, "Job", 1000)
      ).to.be.revertedWith("Invalid freelancer");
    });
  });

  describe("NFT Minting", function () {
    it("should mint NFT after 5 completed jobs", async function () {
      for (let i = 0; i < 5; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      expect(await nft.balanceOf(freelancer.address)).to.equal(1);
    });

    it("should mint second NFT after 10 jobs", async function () {
      for (let i = 0; i < 10; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      expect(await nft.balanceOf(freelancer.address)).to.equal(2);
    });

    it("should not mint before 5 jobs", async function () {
      for (let i = 0; i < 4; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      expect(await nft.balanceOf(freelancer.address)).to.equal(0);
    });

    it("should emit ReputationMinted event", async function () {
      for (let i = 0; i < 4; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      await expect(nft.connect(minter).recordCompletedJob(freelancer.address, "Job 5", 1000))
        .to.emit(nft, "ReputationMinted")
        .withArgs(freelancer.address, 0, "Bronze SRE", 5);
    });

    it("should generate on-chain SVG token URI", async function () {
      for (let i = 0; i < 5; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000000);
      }
      const uri = await nft.tokenURI(0);
      expect(uri).to.include("data:application/json;base64,");
    });

    it("should track token IDs per freelancer", async function () {
      for (let i = 0; i < 5; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      const stats = await nft.getFreelancerStats(freelancer.address);
      expect(stats.tokenIds.length).to.equal(1);
      expect(stats.tokenIds[0]).to.equal(0);
    });
  });

  describe("Soulbound", function () {
    beforeEach(async function () {
      for (let i = 0; i < 5; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
    });

    it("should prevent transfers", async function () {
      await expect(
        nft.connect(freelancer).transferFrom(freelancer.address, other.address, 0)
      ).to.be.revertedWith("Soulbound: transfers disabled");
    });

    it("should prevent safe transfers", async function () {
      await expect(
        nft.connect(freelancer)["safeTransferFrom(address,address,uint256)"](
          freelancer.address, other.address, 0
        )
      ).to.be.revertedWith("Soulbound: transfers disabled");
    });
  });

  describe("Tiers", function () {
    it("should assign Bronze tier at 5 jobs", async function () {
      for (let i = 0; i < 5; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      const uri = await nft.tokenURI(0);
      const json = JSON.parse(
        Buffer.from(uri.split("base64,")[1], "base64").toString()
      );
      expect(json.attributes[0].value).to.equal("Bronze SRE");
    });

    it("should assign Silver tier at 10 jobs", async function () {
      for (let i = 0; i < 10; i++) {
        await nft.connect(minter).recordCompletedJob(freelancer.address, `Job ${i + 1}`, 1000);
      }
      // Token 1 (minted at job 10) should be Silver
      const uri = await nft.tokenURI(1);
      const json = JSON.parse(
        Buffer.from(uri.split("base64,")[1], "base64").toString()
      );
      expect(json.attributes[0].value).to.equal("Silver SRE");
    });
  });
});
