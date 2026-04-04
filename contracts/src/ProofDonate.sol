// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ProofDonate is ReentrancyGuard, Ownable2Step, Pausable {
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
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    // --- State ---
    IERC20 public immutable cUSD;
    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => Donation[]) internal _donations;
    mapping(address => bool) public verifiedHumans;
    mapping(address => uint256[]) internal _creatorCampaigns;
    mapping(address => bool) public verificationRequested;

    uint256 public platformFeeBps; // basis points, e.g. 200 = 2%
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max

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
    event HumanVerified(address indexed user);
    event CampaignCancelled(uint256 indexed campaignId);
    event VerificationRequested(address indexed user);
    event PlatformFeeUpdated(uint256 newFeeBps);

    // --- Modifiers ---
    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }

    // --- Constructor ---
    constructor(address _cUSD, uint256 _feeBps) Ownable(msg.sender) {
        require(_cUSD != address(0), "Invalid cUSD address");
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        cUSD = IERC20(_cUSD);
        platformFeeBps = _feeBps;
    }

    function updatePlatformFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(_newFeeBps);
    }

    // --- Verification ---
    function requestVerification() external {
        require(!verifiedHumans[msg.sender], "Already verified");
        require(!verificationRequested[msg.sender], "Already requested");
        verificationRequested[msg.sender] = true;
        emit VerificationRequested(msg.sender);
    }

    function verifyHuman(address _user) external onlyOwner {
        require(_user != address(0), "Invalid address");
        verifiedHumans[_user] = true;
        emit HumanVerified(_user);
    }

    // --- Campaign ---
    function createCampaign(
        string calldata _title,
        string calldata _description,
        uint256 _targetAmount,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneAmounts,
        uint256 _deadline
    ) external whenNotPaused returns (uint256) {
        require(verifiedHumans[msg.sender], "Must verify humanity first");
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
        require(_amount > 0, "Amount must be > 0");
        require(c.currentAmount + _amount <= c.targetAmount, "Exceeds target amount");

        require(cUSD.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        c.currentAmount += _amount;

        _donations[_campaignId].push(
            Donation({donor: msg.sender, amount: _amount, timestamp: block.timestamp})
        );

        emit DonationMade(_campaignId, msg.sender, _amount);
    }

    // --- Milestone Release ---
    function releaseMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex
    ) external nonReentrant whenNotPaused onlyCampaignCreator(_campaignId) {
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

        m.isReleased = true;
        c.currentAmount -= m.amount;

        uint256 fee = (m.amount * platformFeeBps) / 10000;
        uint256 creatorAmount = m.amount - fee;

        if (fee > 0) {
            require(cUSD.transfer(owner(), fee), "Fee transfer failed");
        }
        require(cUSD.transfer(c.creator, creatorAmount), "Transfer failed");

        emit MilestoneReleased(_campaignId, _milestoneIndex, m.amount);
    }

    // --- Cancel ---
    function cancelCampaign(uint256 _campaignId) external onlyCampaignCreator(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        c.isActive = false;
        emit CampaignCancelled(_campaignId);
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
}
