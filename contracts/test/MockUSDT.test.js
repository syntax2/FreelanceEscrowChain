const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MockUSDT", function () {
  let usdt, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
  });

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      expect(await usdt.name()).to.equal("Mock USDT");
      expect(await usdt.symbol()).to.equal("mUSDT");
    });

    it("should have 6 decimals", async function () {
      expect(await usdt.decimals()).to.equal(6);
    });

    it("should mint 1M tokens to deployer", async function () {
      const expected = ethers.parseUnits("1000000", 6);
      expect(await usdt.balanceOf(owner.address)).to.equal(expected);
    });
  });

  describe("Faucet", function () {
    it("should allow claiming 10k USDT", async function () {
      await usdt.connect(user1).faucet();
      const expected = ethers.parseUnits("10000", 6);
      expect(await usdt.balanceOf(user1.address)).to.equal(expected);
    });

    it("should enforce cooldown", async function () {
      await usdt.connect(user1).faucet();
      await expect(usdt.connect(user1).faucet()).to.be.revertedWith("Faucet: cooldown active");
    });

    it("should allow claiming after cooldown", async function () {
      await usdt.connect(user1).faucet();
      await time.increase(3601);
      await usdt.connect(user1).faucet();
      const expected = ethers.parseUnits("20000", 6);
      expect(await usdt.balanceOf(user1.address)).to.equal(expected);
    });
  });

  describe("Owner Mint", function () {
    it("should allow owner to mint", async function () {
      const amount = ethers.parseUnits("5000", 6);
      await usdt.mint(user1.address, amount);
      expect(await usdt.balanceOf(user1.address)).to.equal(amount);
    });

    it("should reject non-owner mint", async function () {
      const amount = ethers.parseUnits("5000", 6);
      await expect(usdt.connect(user1).mint(user2.address, amount))
        .to.be.revertedWithCustomError(usdt, "OwnableUnauthorizedAccount");
    });
  });
});
