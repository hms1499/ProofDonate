// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract ProofDonateV2 is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    // --- Structs ---
    struct Milestone {
        string description;
        uint256 amount;
        bool isReleased;
    }

    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        bool isActive;
        uint256 milestoneCount;
        bool creatorVerified;
        string metadataURI;
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    // --- State ---
    IERC20 public immutable donationToken;
    uint8 public immutable donationTokenDecimals;

    uint256 public campaignCount;
    uint256 public minDonation;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => Donation[]) internal _donations;
    mapping(address => bool) public verifiedHumans;
    mapping(address => uint256[]) internal _creatorCampaigns;
    mapping(address => bool) public verificationRequested;

    address[] internal _pendingUsers;
    mapping(address => uint256) internal _pendingUserIndex;

    uint256 public platformFeeBps;
    uint256 public constant MAX_FEE_BPS = 1000;

    uint256 public constant MILESTONE_TIMELOCK = 3 days;

    mapping(uint256 => mapping(uint256 => uint256)) public milestoneReleaseTime;

    mapping(uint256 => mapping(address => uint256)) public donorContributions;
    mapping(uint256 => mapping(address => bool)) public hasRefunded;
    mapping(uint256 => uint256) public totalReleased;

    mapping(uint256 => uint256) public refundSnapshotAmount;
    mapping(uint256 => uint256) public refundSnapshotTotal;

    // --- Events ---
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 targetAmount,
        uint256 deadline
    );
    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event MilestoneReleased(uint256 indexed campaignId, uint256 milestoneIndex, uint256 amount);
    event MilestoneReleaseRequested(
        uint256 indexed campaignId, uint256 milestoneIndex, uint256 releaseTime
    );
    event HumanVerified(address indexed user);
    event CampaignCancelled(uint256 indexed campaignId);
    event VerificationRequested(address indexed user);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event MetadataUpdated(uint256 indexed campaignId, string metadataURI);
    event MinDonationUpdated(uint256 newMinDonation);

    // --- Modifiers ---
    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }

    // --- Constructor ---
    constructor(address _donationToken, uint256 _feeBps, uint256 _minDonation) Ownable(msg.sender) {
        require(_donationToken != address(0), "Invalid token address");
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");

        donationToken = IERC20(_donationToken);
        donationTokenDecimals = IERC20Metadata(_donationToken).decimals();
        platformFeeBps = _feeBps;
        minDonation = _minDonation;
    }

    // --- Admin ---
    function updatePlatformFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(_newFeeBps);
    }

    function updateMinDonation(uint256 _newMinDonation) external onlyOwner {
        minDonation = _newMinDonation;
        emit MinDonationUpdated(_newMinDonation);
    }

    // --- Verification ---
    function requestVerification() external {
        require(!verifiedHumans[msg.sender], "Already verified");
        require(!verificationRequested[msg.sender], "Already requested");
        verificationRequested[msg.sender] = true;
        _pendingUsers.push(msg.sender);
        _pendingUserIndex[msg.sender] = _pendingUsers.length;
        emit VerificationRequested(msg.sender);
    }

    function verifyHuman(address _user) external onlyOwner {
        require(_user != address(0), "Invalid address");
        verifiedHumans[_user] = true;

        uint256 idx = _pendingUserIndex[_user];
        if (idx > 0) {
            uint256 lastIdx = _pendingUsers.length;
            if (idx != lastIdx) {
                address lastUser = _pendingUsers[lastIdx - 1];
                _pendingUsers[idx - 1] = lastUser;
                _pendingUserIndex[lastUser] = idx;
            }
            _pendingUsers.pop();
            delete _pendingUserIndex[_user];
            delete verificationRequested[_user];
        }

        emit HumanVerified(_user);
    }

    // --- Campaign ---
    function createCampaign(
        string calldata _title,
        string calldata _description,
        string calldata _metadataURI,
        uint256 _targetAmount,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneAmounts,
        uint256 _deadline
    ) external whenNotPaused returns (uint256) {
        require(verifiedHumans[msg.sender], "Must verify humanity first");
        require(bytes(_metadataURI).length > 0, "Metadata URI required");
        require(_targetAmount > 0, "Target must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(
            _milestoneDescriptions.length == _milestoneAmounts.length, "Milestone arrays mismatch"
        );
        require(
            _milestoneDescriptions.length > 0 && _milestoneDescriptions.length <= 10,
            "1-10 milestones required"
        );

        uint256 totalMilestoneAmount;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            totalMilestoneAmount += _milestoneAmounts[i];
        }
        require(totalMilestoneAmount == _targetAmount, "Milestones must sum to target");

        uint256 campaignId = campaignCount++;

        Campaign storage c = campaigns[campaignId];
        c.creator = msg.sender;
        c.title = _title;
        c.description = _description;
        c.targetAmount = _targetAmount;
        c.deadline = _deadline;
        c.isActive = true;
        c.milestoneCount = _milestoneDescriptions.length;
        c.creatorVerified = true;
        c.metadataURI = _metadataURI;

        for (uint256 i = 0; i < _milestoneDescriptions.length; i++) {
            milestones[campaignId][i] = Milestone({
                description: _milestoneDescriptions[i],
                amount: _milestoneAmounts[i],
                isReleased: false
            });
        }

        _creatorCampaigns[msg.sender].push(campaignId);

        emit CampaignCreated(campaignId, msg.sender, _title, _targetAmount, _deadline);

        return campaignId;
    }

    // --- Donate ---
    function donate(uint256 _campaignId, uint256 _amount) external nonReentrant whenNotPaused {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        require(block.timestamp <= c.deadline, "Campaign ended");
        require(_amount >= minDonation, "Below minimum donation");
        require(c.currentAmount + _amount <= c.targetAmount, "Exceeds target amount");

        donationToken.safeTransferFrom(msg.sender, address(this), _amount);

        c.currentAmount += _amount;
        donorContributions[_campaignId][msg.sender] += _amount;

        _donations[_campaignId].push(
            Donation({donor: msg.sender, amount: _amount, timestamp: block.timestamp})
        );

        emit DonationMade(_campaignId, msg.sender, _amount);
    }

    // --- Milestone Release Request ---
    function requestMilestoneRelease(uint256 _campaignId, uint256 _milestoneIndex)
        external
        whenNotPaused
        onlyCampaignCreator(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        require(_milestoneIndex < c.milestoneCount, "Invalid milestone index");

        Milestone storage m = milestones[_campaignId][_milestoneIndex];
        require(!m.isReleased, "Already released");

        if (_milestoneIndex > 0) {
            require(
                milestones[_campaignId][_milestoneIndex - 1].isReleased,
                "Previous milestone not released"
            );
        }

        require(c.currentAmount >= m.amount, "Insufficient funds");
        require(milestoneReleaseTime[_campaignId][_milestoneIndex] == 0, "Already requested");

        uint256 releaseTime = block.timestamp + MILESTONE_TIMELOCK;
        milestoneReleaseTime[_campaignId][_milestoneIndex] = releaseTime;

        emit MilestoneReleaseRequested(_campaignId, _milestoneIndex, releaseTime);
    }

    // --- Milestone Release ---
    function releaseMilestone(uint256 _campaignId, uint256 _milestoneIndex)
        external
        nonReentrant
        whenNotPaused
        onlyCampaignCreator(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        require(_milestoneIndex < c.milestoneCount, "Invalid milestone index");

        Milestone storage m = milestones[_campaignId][_milestoneIndex];
        require(!m.isReleased, "Already released");

        if (_milestoneIndex > 0) {
            require(
                milestones[_campaignId][_milestoneIndex - 1].isReleased,
                "Previous milestone not released"
            );
        }

        require(c.currentAmount >= m.amount, "Insufficient funds");

        uint256 releaseTime = milestoneReleaseTime[_campaignId][_milestoneIndex];
        require(releaseTime > 0, "Release not requested");
        require(block.timestamp >= releaseTime, "Timelock not expired");

        m.isReleased = true;
        c.currentAmount -= m.amount;
        totalReleased[_campaignId] += m.amount;

        uint256 fee = (m.amount * platformFeeBps) / 10000;
        uint256 creatorAmount = m.amount - fee;

        if (fee > 0) {
            donationToken.safeTransfer(owner(), fee);
        }
        donationToken.safeTransfer(c.creator, creatorAmount);

        emit MilestoneReleased(_campaignId, _milestoneIndex, m.amount);
    }

    // --- Cancel ---
    function cancelCampaign(uint256 _campaignId) external onlyCampaignCreator(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");

        for (uint256 i = 0; i < c.milestoneCount; i++) {
            uint256 rt = milestoneReleaseTime[_campaignId][i];
            if (rt > 0 && !milestones[_campaignId][i].isReleased) {
                revert("Cannot cancel: milestone release pending");
            }
        }

        c.isActive = false;
        _snapshotRefund(_campaignId, c);

        emit CampaignCancelled(_campaignId);
    }

    // --- Update Metadata ---
    function updateMetadataURI(uint256 _campaignId, string calldata _metadataURI)
        external
        onlyCampaignCreator(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        require(c.currentAmount == 0, "Cannot update after donations");
        require(bytes(_metadataURI).length > 0, "Metadata URI required");
        c.metadataURI = _metadataURI;
        emit MetadataUpdated(_campaignId, _metadataURI);
    }

    // --- Internal ---
    function _snapshotRefund(uint256 _campaignId, Campaign storage c) internal {
        if (refundSnapshotAmount[_campaignId] == 0 && c.currentAmount > 0) {
            refundSnapshotAmount[_campaignId] = c.currentAmount;
            refundSnapshotTotal[_campaignId] = c.currentAmount + totalReleased[_campaignId];
        }
    }

    // --- Refund ---
    function claimRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];

        bool isExpired = block.timestamp > c.deadline;
        bool isCancelled = !c.isActive;
        require(isExpired || isCancelled, "Campaign still active");

        require(!hasRefunded[_campaignId][msg.sender], "Already refunded");

        uint256 donated = donorContributions[_campaignId][msg.sender];
        require(donated > 0, "No donation found");

        if (refundSnapshotAmount[_campaignId] == 0 && c.currentAmount > 0) {
            refundSnapshotAmount[_campaignId] = c.currentAmount;
            refundSnapshotTotal[_campaignId] = c.currentAmount + totalReleased[_campaignId];
        }

        uint256 snapshotAmount = refundSnapshotAmount[_campaignId];
        uint256 snapshotTotal = refundSnapshotTotal[_campaignId];

        require(snapshotTotal > 0 && snapshotAmount > 0, "No funds to refund");

        uint256 refundAmount = (donated * snapshotAmount) / snapshotTotal;
        require(refundAmount > 0, "Refund amount is zero");

        hasRefunded[_campaignId][msg.sender] = true;
        c.currentAmount -= refundAmount;

        donationToken.safeTransfer(msg.sender, refundAmount);

        emit RefundClaimed(_campaignId, msg.sender, refundAmount);
    }

    // --- Pausable ---
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- View Functions ---
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getMilestones(uint256 _campaignId) external view returns (Milestone[] memory) {
        uint256 count = campaigns[_campaignId].milestoneCount;
        Milestone[] memory result = new Milestone[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = milestones[_campaignId][i];
        }
        return result;
    }

    function getDonations(uint256 _campaignId) external view returns (Donation[] memory) {
        return _donations[_campaignId];
    }

    function getDonationCount(uint256 _campaignId) external view returns (uint256) {
        return _donations[_campaignId].length;
    }

    function getCreatorCampaigns(address _creator) external view returns (uint256[] memory) {
        return _creatorCampaigns[_creator];
    }

    function getPendingUsers() external view returns (address[] memory) {
        return _pendingUsers;
    }
}
