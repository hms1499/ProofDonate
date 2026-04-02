import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther, formatEther } from "viem";

describe("ProofDonate", function () {
  async function deployFixture() {
    const [owner, creator, donor1, donor2, unverified] =
      await hre.viem.getWalletClients();

    // Deploy mock cUSD token
    const cUSD = await hre.viem.deployContract("MockERC20", [
      "Celo Dollar",
      "cUSD",
      18n,
    ]);

    // Deploy ProofDonate
    const proofDonate = await hre.viem.deployContract("ProofDonate", [
      cUSD.address,
    ]);

    // Mint cUSD to donors
    const mintAmount = parseEther("10000");
    await cUSD.write.mint([donor1.account.address, mintAmount]);
    await cUSD.write.mint([donor2.account.address, mintAmount]);

    // Verify creator as human
    await proofDonate.write.verifyHuman([creator.account.address]);

    // Approve proofDonate contract to spend donor's cUSD
    const cUSD1 = await hre.viem.getContractAt("MockERC20", cUSD.address, {
      client: { wallet: donor1 },
    });
    await cUSD1.write.approve([proofDonate.address, mintAmount]);

    const cUSD2 = await hre.viem.getContractAt("MockERC20", cUSD.address, {
      client: { wallet: donor2 },
    });
    await cUSD2.write.approve([proofDonate.address, mintAmount]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      proofDonate,
      cUSD,
      owner,
      creator,
      donor1,
      donor2,
      unverified,
      publicClient,
    };
  }

  async function createSampleCampaign(
    proofDonate: any,
    creator: any,
    deadline?: bigint
  ) {
    const contract = await hre.viem.getContractAt(
      "ProofDonate",
      proofDonate.address,
      { client: { wallet: creator } }
    );

    const futureDeadline =
      deadline ?? BigInt((await time.latest()) + 30 * 24 * 60 * 60); // 30 days

    await contract.write.createCampaign([
      "Help Build a School",
      "Building a school in rural area",
      parseEther("1000"),
      ["Foundation", "Walls", "Roof"],
      [parseEther("400"), parseEther("300"), parseEther("300")],
      futureDeadline,
    ]);

    return { contract, futureDeadline };
  }

  describe("Deployment", function () {
    it("Should set the correct cUSD address", async function () {
      const { proofDonate, cUSD } = await loadFixture(deployFixture);
      const addr = await proofDonate.read.cUSD();
      expect(addr.toLowerCase()).to.equal(cUSD.address.toLowerCase());
    });

    it("Should set the correct owner", async function () {
      const { proofDonate, owner } = await loadFixture(deployFixture);
      const contractOwner = await proofDonate.read.owner();
      expect(contractOwner.toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
    });

    it("Should start with 0 campaigns", async function () {
      const { proofDonate } = await loadFixture(deployFixture);
      expect(await proofDonate.read.campaignCount()).to.equal(0n);
    });
  });

  describe("Humanity Verification", function () {
    it("Should allow owner to verify a human", async function () {
      const { proofDonate, donor1 } = await loadFixture(deployFixture);
      await proofDonate.write.verifyHuman([donor1.account.address]);
      expect(
        await proofDonate.read.verifiedHumans([donor1.account.address])
      ).to.be.true;
    });

    it("Should reject non-owner verification", async function () {
      const { proofDonate, donor1, donor2 } =
        await loadFixture(deployFixture);
      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await expect(
        contract.write.verifyHuman([donor2.account.address])
      ).to.be.rejected;
    });

    it("Should reject zero address", async function () {
      const { proofDonate } = await loadFixture(deployFixture);
      await expect(
        proofDonate.write.verifyHuman([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejected;
    });

    it("Should emit HumanVerified event", async function () {
      const { proofDonate, donor1, publicClient } =
        await loadFixture(deployFixture);
      const hash = await proofDonate.write.verifyHuman([
        donor1.account.address,
      ]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign successfully", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      expect(await proofDonate.read.campaignCount()).to.equal(1n);

      const campaign = await proofDonate.read.getCampaign([0n]);
      expect(campaign.creator.toLowerCase()).to.equal(
        creator.account.address.toLowerCase()
      );
      expect(campaign.title).to.equal("Help Build a School");
      expect(campaign.targetAmount).to.equal(parseEther("1000"));
      expect(campaign.isActive).to.be.true;
      expect(campaign.creatorVerified).to.be.true;
      expect(campaign.milestoneCount).to.equal(3n);
    });

    it("Should store milestones correctly", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const ms = await proofDonate.read.getMilestones([0n]);
      expect(ms.length).to.equal(3);
      expect(ms[0].description).to.equal("Foundation");
      expect(ms[0].amount).to.equal(parseEther("400"));
      expect(ms[0].isReleased).to.be.false;
      expect(ms[1].description).to.equal("Walls");
      expect(ms[2].description).to.equal("Roof");
    });

    it("Should track creator campaigns", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const ids = await proofDonate.read.getCreatorCampaigns([
        creator.account.address,
      ]);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(0n);
    });

    it("Should reject unverified creator", async function () {
      const { proofDonate, unverified } = await loadFixture(deployFixture);
      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: unverified } }
      );

      await expect(
        contract.write.createCampaign([
          "Test",
          "Test desc",
          parseEther("100"),
          ["M1"],
          [parseEther("100")],
          BigInt((await time.latest()) + 86400),
        ])
      ).to.be.rejectedWith("Must verify humanity first");
    });

    it("Should reject mismatched milestone sums", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );

      await expect(
        contract.write.createCampaign([
          "Test",
          "Test desc",
          parseEther("1000"),
          ["M1", "M2"],
          [parseEther("400"), parseEther("500")],
          BigInt((await time.latest()) + 86400),
        ])
      ).to.be.rejectedWith("Milestones must sum to target");
    });

    it("Should reject past deadline", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );

      await expect(
        contract.write.createCampaign([
          "Test",
          "Test desc",
          parseEther("100"),
          ["M1"],
          [parseEther("100")],
          1n, // past timestamp
        ])
      ).to.be.rejectedWith("Deadline must be in future");
    });

    it("Should reject zero milestones", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );

      await expect(
        contract.write.createCampaign([
          "Test",
          "Test desc",
          parseEther("100"),
          [],
          [],
          BigInt((await time.latest()) + 86400),
        ])
      ).to.be.rejectedWith("1-10 milestones required");
    });
  });

  describe("Donations", function () {
    it("Should accept a donation", async function () {
      const { proofDonate, creator, donor1, cUSD } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );

      await contract.write.donate([0n, parseEther("100")]);

      const campaign = await proofDonate.read.getCampaign([0n]);
      expect(campaign.currentAmount).to.equal(parseEther("100"));

      const donations = await proofDonate.read.getDonations([0n]);
      expect(donations.length).to.equal(1);
      expect(donations[0].amount).to.equal(parseEther("100"));
      expect(donations[0].donor.toLowerCase()).to.equal(
        donor1.account.address.toLowerCase()
      );
    });

    it("Should accept multiple donations", async function () {
      const { proofDonate, creator, donor1, donor2 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const c1 = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      const c2 = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor2 } }
      );

      await c1.write.donate([0n, parseEther("200")]);
      await c2.write.donate([0n, parseEther("300")]);

      const campaign = await proofDonate.read.getCampaign([0n]);
      expect(campaign.currentAmount).to.equal(parseEther("500"));
      expect(await proofDonate.read.getDonationCount([0n])).to.equal(2n);
    });

    it("Should reject donation to inactive campaign", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      // Cancel campaign
      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );
      await creatorContract.write.cancelCampaign([0n]);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await expect(
        donorContract.write.donate([0n, parseEther("100")])
      ).to.be.rejectedWith("Campaign not active");
    });

    it("Should reject donation after deadline", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      const deadline = BigInt((await time.latest()) + 86400); // 1 day
      await createSampleCampaign(proofDonate, creator, deadline);

      // Fast forward past deadline
      await time.increase(86401);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await expect(
        donorContract.write.donate([0n, parseEther("100")])
      ).to.be.rejectedWith("Campaign ended");
    });

    it("Should reject zero amount donation", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const contract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await expect(contract.write.donate([0n, 0n])).to.be.rejectedWith(
        "Amount must be > 0"
      );
    });
  });

  describe("Milestone Release", function () {
    it("Should release first milestone", async function () {
      const { proofDonate, creator, donor1, cUSD } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      // Donate enough for first milestone (400 cUSD)
      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await donorContract.write.donate([0n, parseEther("500")]);

      // Get creator balance before
      const balBefore = await cUSD.read.balanceOf([creator.account.address]);

      // Release first milestone
      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );
      await creatorContract.write.releaseMilestone([0n, 0n]);

      // Check milestone is released
      const ms = await proofDonate.read.getMilestones([0n]);
      expect(ms[0].isReleased).to.be.true;
      expect(ms[1].isReleased).to.be.false;

      // Check creator received funds
      const balAfter = await cUSD.read.balanceOf([creator.account.address]);
      expect(balAfter - balBefore).to.equal(parseEther("400"));

      // Check campaign currentAmount decreased
      const campaign = await proofDonate.read.getCampaign([0n]);
      expect(campaign.currentAmount).to.equal(parseEther("100")); // 500 - 400
    });

    it("Should enforce sequential milestone release", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await donorContract.write.donate([0n, parseEther("1000")]);

      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );

      // Try to release second milestone before first
      await expect(
        creatorContract.write.releaseMilestone([0n, 1n])
      ).to.be.rejectedWith("Previous milestone not released");

      // Release first, then second should work
      await creatorContract.write.releaseMilestone([0n, 0n]);
      await creatorContract.write.releaseMilestone([0n, 1n]);

      const ms = await proofDonate.read.getMilestones([0n]);
      expect(ms[0].isReleased).to.be.true;
      expect(ms[1].isReleased).to.be.true;
      expect(ms[2].isReleased).to.be.false;
    });

    it("Should reject double release", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await donorContract.write.donate([0n, parseEther("500")]);

      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );
      await creatorContract.write.releaseMilestone([0n, 0n]);

      await expect(
        creatorContract.write.releaseMilestone([0n, 0n])
      ).to.be.rejectedWith("Already released");
    });

    it("Should reject release with insufficient funds", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      // Donate less than first milestone amount
      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await donorContract.write.donate([0n, parseEther("100")]);

      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );
      await expect(
        creatorContract.write.releaseMilestone([0n, 0n])
      ).to.be.rejectedWith("Insufficient funds");
    });

    it("Should reject release by non-creator", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await donorContract.write.donate([0n, parseEther("500")]);

      await expect(
        donorContract.write.releaseMilestone([0n, 0n])
      ).to.be.rejectedWith("Not campaign creator");
    });
  });

  describe("Campaign Cancellation", function () {
    it("Should cancel campaign", async function () {
      const { proofDonate, creator } = await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const creatorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: creator } }
      );
      await creatorContract.write.cancelCampaign([0n]);

      const campaign = await proofDonate.read.getCampaign([0n]);
      expect(campaign.isActive).to.be.false;
    });

    it("Should reject cancel by non-creator", async function () {
      const { proofDonate, creator, donor1 } =
        await loadFixture(deployFixture);
      await createSampleCampaign(proofDonate, creator);

      const donorContract = await hre.viem.getContractAt(
        "ProofDonate",
        proofDonate.address,
        { client: { wallet: donor1 } }
      );
      await expect(
        donorContract.write.cancelCampaign([0n])
      ).to.be.rejectedWith("Not campaign creator");
    });
  });
});
