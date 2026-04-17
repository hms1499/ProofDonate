// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProofDonateV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock cUSD", "cUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ProofDonateV2Test is Test {
    error OwnableUnauthorizedAccount(address account);

    ProofDonateV2 public proofDonate;
    MockERC20 public token;

    address public owner = address(this);
    address public creator = address(0x1);
    address public donor1 = address(0x2);
    address public donor2 = address(0x3);
    address public unverified = address(0x4);

    uint256 public constant MIN_DONATION = 0.2 ether; // 0.2 cUSD (18 decimals)

    function setUp() public {
        token = new MockERC20();
        proofDonate = new ProofDonateV2(address(token), 200, MIN_DONATION); // 2% fee, 0.2 min

        // Mint tokens to donors
        token.mint(donor1, 10000 ether);
        token.mint(donor2, 10000 ether);

        // Approve contract to spend tokens
        vm.prank(donor1);
        token.approve(address(proofDonate), type(uint256).max);
        vm.prank(donor2);
        token.approve(address(proofDonate), type(uint256).max);

        proofDonate.verifyHuman(creator);
    }

    function _createSampleCampaign() internal returns (uint256) {
        string[] memory descs = new string[](3);
        descs[0] = "Foundation";
        descs[1] = "Walls";
        descs[2] = "Roof";

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 400 ether;
        amounts[1] = 300 ether;
        amounts[2] = 300 ether;

        vm.prank(creator);
        return proofDonate.createCampaign(
            "Help Build a School",
            "Building a school in rural area",
            "ipfs://QmTestMetadata123",
            1000 ether,
            descs,
            amounts,
            block.timestamp + 30 days
        );
    }

    // --- Constructor tests ---

    function test_constructor_setsToken() public view {
        assertEq(address(proofDonate.donationToken()), address(token));
    }

    function test_constructor_setsDecimals() public view {
        assertEq(proofDonate.donationTokenDecimals(), 18);
    }

    function test_constructor_setsMinDonation() public view {
        assertEq(proofDonate.minDonation(), MIN_DONATION);
    }

    function test_constructor_revertsZeroAddress() public {
        vm.expectRevert("Invalid token address");
        new ProofDonateV2(address(0), 200, MIN_DONATION);
    }

    function test_constructor_revertsHighFee() public {
        vm.expectRevert("Fee too high");
        new ProofDonateV2(address(token), 1001, MIN_DONATION);
    }

    // --- Donate tests ---

    function test_donate_transfersTokens() public {
        uint256 campaignId = _createSampleCampaign();
        uint256 donorBalanceBefore = token.balanceOf(donor1);

        vm.prank(donor1);
        proofDonate.donate(campaignId, 10 ether);

        assertEq(token.balanceOf(donor1), donorBalanceBefore - 10 ether);
        assertEq(token.balanceOf(address(proofDonate)), 10 ether);
    }

    function test_donate_updatesCampaignAmount() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(campaignId, 10 ether);

        ProofDonateV2.Campaign memory c = proofDonate.getCampaign(campaignId);
        assertEq(c.currentAmount, 10 ether);
    }

    function test_donate_recordsDonation() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(campaignId, 10 ether);

        assertEq(proofDonate.getDonationCount(campaignId), 1);
        assertEq(proofDonate.donorContributions(campaignId, donor1), 10 ether);
    }

    function test_donate_revertsBelowMinimum() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Below minimum donation");
        proofDonate.donate(campaignId, 0.1 ether); // below 0.2 min
    }

    function test_donate_revertsExceedsTarget() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Exceeds target amount");
        proofDonate.donate(campaignId, 1001 ether);
    }

    function test_donate_revertsInactiveCampaign() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(creator);
        proofDonate.cancelCampaign(campaignId);

        vm.prank(donor1);
        vm.expectRevert("Campaign not active");
        proofDonate.donate(campaignId, 10 ether);
    }

    function test_donate_revertsAfterDeadline() public {
        uint256 campaignId = _createSampleCampaign();

        vm.warp(block.timestamp + 31 days);

        vm.prank(donor1);
        vm.expectRevert("Campaign ended");
        proofDonate.donate(campaignId, 10 ether);
    }

    // --- Milestone release tests ---

    function test_releaseMilestone_transfersTokens() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(campaignId, 400 ether);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(campaignId, 0);

        vm.warp(block.timestamp + 3 days + 1);

        uint256 creatorBalanceBefore = token.balanceOf(creator);
        uint256 ownerBalanceBefore = token.balanceOf(owner);

        vm.prank(creator);
        proofDonate.releaseMilestone(campaignId, 0);

        // 400 cUSD * 2% = 8 cUSD fee, 392 cUSD to creator
        assertEq(token.balanceOf(creator), creatorBalanceBefore + 392 ether);
        assertEq(token.balanceOf(owner), ownerBalanceBefore + 8 ether);
    }

    // --- Refund tests ---

    function test_refund_transfersTokens() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(campaignId, 100 ether);

        vm.prank(creator);
        proofDonate.cancelCampaign(campaignId);

        uint256 balanceBefore = token.balanceOf(donor1);

        vm.prank(donor1);
        proofDonate.claimRefund(campaignId);

        assertEq(token.balanceOf(donor1), balanceBefore + 100 ether);
    }

    function test_refund_afterPartialRelease() public {
        uint256 campaignId = _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(campaignId, 500 ether);
        vm.prank(donor2);
        proofDonate.donate(campaignId, 500 ether);

        // Release first milestone (400 cUSD)
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(campaignId, 0);
        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(campaignId, 0);

        // Cancel campaign
        vm.prank(creator);
        proofDonate.cancelCampaign(campaignId);

        // Donor1 donated 500 of 1000 total (50%), remaining is 600, should get 300
        uint256 balanceBefore = token.balanceOf(donor1);
        vm.prank(donor1);
        proofDonate.claimRefund(campaignId);
        assertEq(token.balanceOf(donor1), balanceBefore + 300 ether);
    }

    // --- Update min donation ---

    function test_updateMinDonation() public {
        proofDonate.updateMinDonation(1 ether);
        assertEq(proofDonate.minDonation(), 1 ether);
    }

    function test_updateMinDonation_revertsNonOwner() public {
        vm.prank(donor1);
        vm.expectRevert(abi.encodeWithSelector(OwnableUnauthorizedAccount.selector, donor1));
        proofDonate.updateMinDonation(1 ether);
    }

    // --- Verification tests ---

    function test_createCampaign_revertsUnverified() public {
        string[] memory descs = new string[](1);
        descs[0] = "Milestone 1";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.prank(unverified);
        vm.expectRevert("Must verify humanity first");
        proofDonate.createCampaign("Test", "Desc", "ipfs://test", 100 ether, descs, amounts, block.timestamp + 30 days);
    }
}
