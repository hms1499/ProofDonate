// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProofDonate.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProofDonateTest is Test {
    error OwnableUnauthorizedAccount(address account);

    ProofDonate public proofDonate;

    address public owner = address(this);
    address public creator = address(0x1);
    address public donor1 = address(0x2);
    address public donor2 = address(0x3);
    address public unverified = address(0x4);

    function setUp() public {
        proofDonate = new ProofDonate(200); // 2% fee

        // Fund test accounts with native CELO
        vm.deal(donor1, 10000 ether);
        vm.deal(donor2, 10000 ether);

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
            1000 ether,
            descs,
            amounts,
            block.timestamp + 30 days
        );
    }

    // ========================
    // Deployment
    // ========================

    function test_DeploymentSetsCorrectOwner() public view {
        assertEq(proofDonate.owner(), owner);
    }

    function test_DeploymentStartsWithZeroCampaigns() public view {
        assertEq(proofDonate.campaignCount(), 0);
    }

    function test_RevertDeployWithFeeTooHigh() public {
        vm.expectRevert("Fee too high");
        new ProofDonate(1001);
    }

    // ========================
    // Verification Request
    // ========================

    function test_RequestVerification() public {
        vm.prank(donor1);
        proofDonate.requestVerification();
        assertTrue(proofDonate.verificationRequested(donor1));
    }

    function test_RequestVerificationEmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit ProofDonate.VerificationRequested(donor1);
        vm.prank(donor1);
        proofDonate.requestVerification();
    }

    function test_RevertRequestIfAlreadyVerified() public {
        vm.prank(creator);
        vm.expectRevert("Already verified");
        proofDonate.requestVerification();
    }

    function test_RevertRequestIfAlreadyRequested() public {
        vm.prank(donor1);
        proofDonate.requestVerification();

        vm.prank(donor1);
        vm.expectRevert("Already requested");
        proofDonate.requestVerification();
    }

    // ========================
    // Humanity Verification (owner approve)
    // ========================

    function test_OwnerCanVerifyHuman() public {
        proofDonate.verifyHuman(donor1);
        assertTrue(proofDonate.verifiedHumans(donor1));
    }

    function test_RevertNonOwnerVerify() public {
        vm.prank(donor1);
        vm.expectRevert(abi.encodeWithSelector(OwnableUnauthorizedAccount.selector, donor1));
        proofDonate.verifyHuman(donor2);
    }

    function test_RevertVerifyZeroAddress() public {
        vm.expectRevert("Invalid address");
        proofDonate.verifyHuman(address(0));
    }

    // ========================
    // Campaign Creation
    // ========================

    function test_CreateCampaign() public {
        uint256 id = _createSampleCampaign();
        assertEq(id, 0);
        assertEq(proofDonate.campaignCount(), 1);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.creator, creator);
        assertEq(c.title, "Help Build a School");
        assertEq(c.targetAmount, 1000 ether);
        assertTrue(c.isActive);
        assertTrue(c.creatorVerified);
        assertEq(c.milestoneCount, 3);
    }

    function test_MilestonesStoredCorrectly() public {
        _createSampleCampaign();
        ProofDonate.Milestone[] memory ms = proofDonate.getMilestones(0);
        assertEq(ms.length, 3);
        assertEq(ms[0].description, "Foundation");
        assertEq(ms[0].amount, 400 ether);
        assertFalse(ms[0].isReleased);
    }

    function test_CreatorCampaignsTracked() public {
        _createSampleCampaign();
        uint256[] memory ids = proofDonate.getCreatorCampaigns(creator);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    function test_RevertUnverifiedCreator() public {
        string[] memory descs = new string[](1);
        descs[0] = "M1";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.prank(unverified);
        vm.expectRevert("Must verify humanity first");
        proofDonate.createCampaign("Test", "Desc", 100 ether, descs, amounts, block.timestamp + 1 days);
    }

    function test_RevertMismatchedMilestoneSums() public {
        string[] memory descs = new string[](2);
        descs[0] = "M1";
        descs[1] = "M2";
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 ether;
        amounts[1] = 500 ether;

        vm.prank(creator);
        vm.expectRevert("Milestones must sum to target");
        proofDonate.createCampaign("Test", "Desc", 1000 ether, descs, amounts, block.timestamp + 1 days);
    }

    function test_RevertPastDeadline() public {
        string[] memory descs = new string[](1);
        descs[0] = "M1";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.prank(creator);
        vm.expectRevert("Deadline must be in future");
        proofDonate.createCampaign("Test", "Desc", 100 ether, descs, amounts, 1);
    }

    function test_RevertZeroMilestones() public {
        string[] memory descs = new string[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(creator);
        vm.expectRevert("1-10 milestones required");
        proofDonate.createCampaign("Test", "Desc", 100 ether, descs, amounts, block.timestamp + 1 days);
    }

    // ========================
    // Donations (Native CELO)
    // ========================

    function test_AcceptDonation() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 100 ether}(0);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 100 ether);

        ProofDonate.Donation[] memory ds = proofDonate.getDonations(0);
        assertEq(ds.length, 1);
        assertEq(ds[0].amount, 100 ether);
        assertEq(ds[0].donor, donor1);
    }

    function test_MinimumDonation() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 0.02 ether}(0);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 0.02 ether);
    }

    function test_RevertDonationBelowMinimum() public {
        _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Below minimum donation");
        proofDonate.donate{value: 0.01 ether}(0);
    }

    function test_MultipleDonations() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 200 ether}(0);
        vm.prank(donor2);
        proofDonate.donate{value: 300 ether}(0);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 500 ether);
        assertEq(proofDonate.getDonationCount(0), 2);
    }

    function test_RevertDonateInactiveCampaign() public {
        _createSampleCampaign();

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        vm.prank(donor1);
        vm.expectRevert("Campaign not active");
        proofDonate.donate{value: 100 ether}(0);
    }

    function test_RevertDonateAfterDeadline() public {
        _createSampleCampaign();

        vm.warp(block.timestamp + 31 days);

        vm.prank(donor1);
        vm.expectRevert("Campaign ended");
        proofDonate.donate{value: 100 ether}(0);
    }

    function test_RevertDonateZeroAmount() public {
        _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Below minimum donation");
        proofDonate.donate{value: 0}(0);
    }

    // ========================
    // Milestone Release
    // ========================

    function test_ReleaseFirstMilestone() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        vm.warp(block.timestamp + 3 days + 1);

        uint256 balBefore = creator.balance;

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        ProofDonate.Milestone[] memory ms = proofDonate.getMilestones(0);
        assertTrue(ms[0].isReleased);
        assertFalse(ms[1].isReleased);

        // 400 ether - 2% fee (8 ether) = 392 ether
        assertEq(creator.balance - balBefore, 392 ether);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 100 ether);
    }

    function test_SequentialMilestoneRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        // Cannot request milestone 1 before milestone 0 is released
        vm.prank(creator);
        vm.expectRevert("Previous milestone not released");
        proofDonate.requestMilestoneRelease(0, 1);

        // Release milestone 0
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        skip(3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        // Now release milestone 1
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 1);
        skip(3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 1);

        ProofDonate.Milestone[] memory ms = proofDonate.getMilestones(0);
        assertTrue(ms[0].isReleased);
        assertTrue(ms[1].isReleased);
        assertFalse(ms[2].isReleased);
    }

    function test_RevertDoubleRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        vm.prank(creator);
        vm.expectRevert("Already released");
        proofDonate.releaseMilestone(0, 0);
    }

    function test_RevertReleaseInsufficientFunds() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 100 ether}(0);

        vm.prank(creator);
        vm.expectRevert("Insufficient funds");
        proofDonate.requestMilestoneRelease(0, 0);
    }

    function test_RevertReleaseByNonCreator() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(donor1);
        vm.expectRevert("Not campaign creator");
        proofDonate.requestMilestoneRelease(0, 0);
    }

    // ========================
    // Campaign Cancellation
    // ========================

    function test_CancelCampaign() public {
        _createSampleCampaign();

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertFalse(c.isActive);
    }

    function test_RevertCancelByNonCreator() public {
        _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Not campaign creator");
        proofDonate.cancelCampaign(0);
    }

    // ========================
    // Ownable2Step
    // ========================

    function test_OwnerIsDeployer() public view {
        assertEq(proofDonate.owner(), owner);
    }

    function test_TransferOwnership2Step() public {
        proofDonate.transferOwnership(creator);
        assertEq(proofDonate.owner(), owner);

        vm.prank(creator);
        proofDonate.acceptOwnership();
        assertEq(proofDonate.owner(), creator);
    }

    function test_RevertAcceptOwnershipByNonPending() public {
        proofDonate.transferOwnership(creator);

        vm.prank(donor1);
        vm.expectRevert();
        proofDonate.acceptOwnership();
    }

    // ========================
    // Pausable
    // ========================

    function test_OwnerCanPause() public {
        proofDonate.pause();
        assertTrue(proofDonate.paused());
    }

    function test_OwnerCanUnpause() public {
        proofDonate.pause();
        proofDonate.unpause();
        assertFalse(proofDonate.paused());
    }

    function test_RevertDonateWhenPaused() public {
        _createSampleCampaign();
        proofDonate.pause();

        vm.prank(donor1);
        vm.expectRevert();
        proofDonate.donate{value: 100 ether}(0);
    }

    function test_RevertCreateCampaignWhenPaused() public {
        proofDonate.pause();

        string[] memory descs = new string[](1);
        descs[0] = "M1";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.prank(creator);
        vm.expectRevert();
        proofDonate.createCampaign("Test", "Desc", 100 ether, descs, amounts, block.timestamp + 1 days);
    }

    function test_RevertNonOwnerPause() public {
        vm.prank(donor1);
        vm.expectRevert();
        proofDonate.pause();
    }

    // ========================
    // Donation Cap
    // ========================

    function test_RevertDonateOverTarget() public {
        _createSampleCampaign(); // target = 1000 ether

        vm.prank(donor1);
        vm.expectRevert("Exceeds target amount");
        proofDonate.donate{value: 1001 ether}(0);
    }

    function test_DonateExactlyTarget() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 1000 ether);
    }

    function test_RevertDonateWhenAlreadyFull() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(donor2);
        vm.expectRevert("Exceeds target amount");
        proofDonate.donate{value: 1 ether}(0);
    }

    // ========================
    // Platform Fee
    // ========================

    function test_PlatformFeeIs2Percent() public view {
        assertEq(proofDonate.platformFeeBps(), 200);
    }

    function test_FeeDeductedOnMilestoneRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        vm.warp(block.timestamp + 3 days + 1);

        uint256 creatorBalBefore = creator.balance;
        uint256 treasuryBalBefore = owner.balance;

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        assertEq(creator.balance - creatorBalBefore, 392 ether);
        assertEq(owner.balance - treasuryBalBefore, 8 ether);
    }

    function test_FeeCollectedAcrossMultipleMilestones() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        uint256 ownerBalBefore = owner.balance;

        // Release milestone 0
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        skip(3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        // Release milestone 1
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 1);
        skip(3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 1);

        assertEq(owner.balance - ownerBalBefore, 14 ether);
    }

    function test_OwnerCanUpdateFee() public {
        proofDonate.updatePlatformFee(500); // 5%
        assertEq(proofDonate.platformFeeBps(), 500);
    }

    function test_RevertFeeAboveMax() public {
        vm.expectRevert("Fee too high");
        proofDonate.updatePlatformFee(1001); // > 10%
    }

    // ========================
    // Milestone Timelock
    // ========================

    function test_MilestoneTimelockDuration() public view {
        assertEq(proofDonate.MILESTONE_TIMELOCK(), 3 days);
    }

    function test_RequestMilestoneRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);

        assertGt(proofDonate.milestoneReleaseTime(0, 0), 0);
    }

    function test_RevertReleaseBeforeTimelock() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);

        // Try to release immediately
        vm.prank(creator);
        vm.expectRevert("Timelock not expired");
        proofDonate.releaseMilestone(0, 0);
    }

    function test_ReleaseAfterTimelock() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);

        vm.warp(block.timestamp + 3 days + 1);

        uint256 creatorBalBefore = creator.balance;

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        // 400 ether - 2% fee = 392 ether
        assertEq(creator.balance - creatorBalBefore, 392 ether);
    }

    function test_RevertRequestReleaseByNonCreator() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        vm.prank(donor1);
        vm.expectRevert("Not campaign creator");
        proofDonate.requestMilestoneRelease(0, 0);
    }

    // ========================
    // Refund Mechanism
    // ========================

    function test_ClaimRefundAfterCancel() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        uint256 balBefore = donor1.balance;

        vm.prank(donor1);
        proofDonate.claimRefund(0);

        assertEq(donor1.balance - balBefore, 500 ether);
    }

    function test_ClaimRefundAfterExpiry() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        // Warp past deadline
        vm.warp(block.timestamp + 31 days);

        uint256 balBefore = donor1.balance;

        vm.prank(donor1);
        proofDonate.claimRefund(0);

        assertEq(donor1.balance - balBefore, 500 ether);
    }

    function test_PartialRefundAfterMilestoneRelease() public {
        _createSampleCampaign(); // 3 milestones: 400, 300, 300

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        // Release first milestone (400 ether)
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);
        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        // Cancel campaign
        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        // Donor should get back remaining: 1000 - 400 = 600 ether
        uint256 balBefore = donor1.balance;

        vm.prank(donor1);
        proofDonate.claimRefund(0);

        assertEq(donor1.balance - balBefore, 600 ether);
    }

    function test_MultipleDonorsRefund() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 300 ether}(0);
        vm.prank(donor2);
        proofDonate.donate{value: 200 ether}(0);

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        uint256 bal1Before = donor1.balance;
        uint256 bal2Before = donor2.balance;

        vm.prank(donor1);
        proofDonate.claimRefund(0);
        vm.prank(donor2);
        proofDonate.claimRefund(0);

        // Proportional refund: donor1 gets 300, donor2 gets 200
        assertEq(donor1.balance - bal1Before, 300 ether);
        assertEq(donor2.balance - bal2Before, 200 ether);
    }

    function test_RevertRefundActiveCampaign() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 100 ether}(0);

        vm.prank(donor1);
        vm.expectRevert("Campaign still active");
        proofDonate.claimRefund(0);
    }

    function test_RevertDoubleRefund() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        vm.prank(donor1);
        proofDonate.claimRefund(0);

        vm.prank(donor1);
        vm.expectRevert("Already refunded");
        proofDonate.claimRefund(0);
    }

    // ========================
    // Cancel + Timelock Interaction
    // ========================

    function test_CancelBlocksPendingMilestoneRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 1000 ether}(0);

        // Request milestone release
        vm.prank(creator);
        proofDonate.requestMilestoneRelease(0, 0);

        // Cancel campaign
        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        // Try to release after timelock - should fail because cancelled
        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(creator);
        vm.expectRevert("Campaign not active");
        proofDonate.releaseMilestone(0, 0);
    }

    function test_RevertRefundNonDonor() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate{value: 500 ether}(0);

        vm.prank(creator);
        proofDonate.cancelCampaign(0);

        vm.prank(unverified); // never donated
        vm.expectRevert("No donation found");
        proofDonate.claimRefund(0);
    }

    // ========================
    // Min Donation Constant
    // ========================

    function test_MinDonationIs0Point02Ether() public view {
        assertEq(proofDonate.MIN_DONATION(), 0.02 ether);
    }

    // ========================
    // Receive function
    // ========================

    function test_ContractCanReceiveEther() public {
        (bool success,) = address(proofDonate).call{value: 1 ether}("");
        assertTrue(success);
    }

    receive() external payable {}
}
