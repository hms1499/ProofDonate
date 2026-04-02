# ProofDonate Restructure + Owner Verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure project from Hardhat monorepo to flat Foundry + Next.js, add on-chain verification request flow with admin approval page.

**Architecture:** Two independent top-level folders: `contracts/` (Foundry) and `frontend/` (Next.js). Smart contract adds `requestVerification()` function. Frontend adds `/admin` page for owner to approve requests, updates `/verify` page with request flow. Navbar shows Admin link conditionally.

**Tech Stack:** Foundry (forge, forge-std), OpenZeppelin Contracts, Next.js 14, wagmi v2, RainbowKit, Tailwind CSS, shadcn/ui

---

## File Map

### New files (contracts/)
- `contracts/foundry.toml` - Foundry config
- `contracts/src/ProofDonate.sol` - Main contract (rewritten with requestVerification)
- `contracts/test/ProofDonate.t.sol` - Solidity tests
- `contracts/script/Deploy.s.sol` - Deploy script

### New files (frontend/)
- `frontend/src/app/admin/page.tsx` - Admin approval page

### Modified files (moved from apps/web/ to frontend/)
- `frontend/src/app/verify/page.tsx` - Add request verification flow
- `frontend/src/components/navbar.tsx` - Add Admin link for owner
- `frontend/src/hooks/useProofDonate.ts` - Add requestVerification + owner hooks
- `frontend/src/lib/contracts.ts` - Update ABI with new function/event
- `frontend/src/types/index.ts` - No changes needed
- `frontend/package.json` - Standalone (no monorepo)
- `frontend/tsconfig.json` - Remove extends from root tsconfig

### Deleted
- `apps/` folder entirely
- `turbo.json`, `pnpm-workspace.yaml`
- Root `package.json` monorepo scripts (rewrite as simple README)
- Root `tsconfig.json` (frontend has its own)

---

## Task 1: Clean up monorepo structure and move frontend

**Files:**
- Delete: `apps/contracts/` (entire folder)
- Delete: `turbo.json`, `pnpm-workspace.yaml`
- Move: `apps/web/` -> `frontend/`
- Modify: `frontend/tsconfig.json`
- Modify: `frontend/package.json`
- Rewrite: root `package.json`
- Delete: root `tsconfig.json`

- [ ] **Step 1: Move `apps/web/` to `frontend/`**

```bash
mv apps/web frontend
```

- [ ] **Step 2: Delete old monorepo files**

```bash
rm -rf apps
rm -f turbo.json pnpm-workspace.yaml tsconfig.json
```

- [ ] **Step 3: Update `frontend/tsconfig.json` to be standalone**

Replace the file with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Update `frontend/package.json` name**

Change `"name": "web"` to `"name": "frontend"`.

- [ ] **Step 5: Rewrite root `package.json`**

```json
{
  "name": "proof-donate",
  "version": "0.1.0",
  "description": "ProofDonate - Transparent donation platform on Celo",
  "private": true
}
```

- [ ] **Step 6: Verify frontend still installs and builds**

```bash
cd frontend && pnpm install && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move frontend out of monorepo, remove Hardhat and Turborepo"
```

---

## Task 2: Initialize Foundry project

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/src/.gitkeep` (temporary, replaced in Task 3)
- Create: `contracts/test/.gitkeep` (temporary, replaced in Task 4)
- Create: `contracts/script/.gitkeep` (temporary, replaced in Task 5)

- [ ] **Step 1: Initialize Foundry project**

```bash
cd /Users/vanhuy/Desktop/talent-project
mkdir -p contracts
cd contracts
forge init --no-git --no-commit
```

This creates `src/`, `test/`, `script/`, `lib/`, and `foundry.toml`.

- [ ] **Step 2: Remove default Counter files**

```bash
rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol
```

- [ ] **Step 3: Install OpenZeppelin**

```bash
cd /Users/vanhuy/Desktop/talent-project/contracts
forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit
```

- [ ] **Step 4: Configure remappings in `foundry.toml`**

Replace `contracts/foundry.toml` with:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"

remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"
]

[fmt]
line_length = 100
tab_width = 4
bracket_spacing = false

[rpc_endpoints]
celo_sepolia = "${CELO_SEPOLIA_RPC_URL}"
celo = "${CELO_RPC_URL}"
```

- [ ] **Step 5: Verify Foundry compiles (empty project)**

```bash
cd /Users/vanhuy/Desktop/talent-project/contracts
forge build
```

Expected: Compilation succeeds (no source files yet, that's OK).

- [ ] **Step 6: Commit**

```bash
cd /Users/vanhuy/Desktop/talent-project
git add contracts/
git commit -m "feat: initialize Foundry project with OpenZeppelin"
```

---

## Task 3: Write ProofDonate smart contract

**Files:**
- Create: `contracts/src/ProofDonate.sol`

- [ ] **Step 1: Write ProofDonate.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProofDonate is ReentrancyGuard {
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
    address public owner;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => Donation[]) internal _donations;
    mapping(address => bool) public verifiedHumans;
    mapping(address => uint256[]) internal _creatorCampaigns;
    mapping(address => bool) public verificationRequested;

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

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }

    // --- Constructor ---
    constructor(address _cUSD) {
        require(_cUSD != address(0), "Invalid cUSD address");
        cUSD = IERC20(_cUSD);
        owner = msg.sender;
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
    ) external returns (uint256) {
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
            milestones[campaignId][i] =
                Milestone({description: _milestoneDescriptions[i], amount: _milestoneAmounts[i], isReleased: false});
        }

        _creatorCampaigns[msg.sender].push(campaignId);

        emit CampaignCreated(campaignId, msg.sender, _title, _targetAmount, _deadline);

        return campaignId;
    }

    // --- Donate ---
    function donate(uint256 _campaignId, uint256 _amount) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        require(block.timestamp <= c.deadline, "Campaign ended");
        require(_amount > 0, "Amount must be > 0");

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
    ) external nonReentrant onlyCampaignCreator(_campaignId) {
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

        require(cUSD.transfer(c.creator, m.amount), "Transfer failed");

        emit MilestoneReleased(_campaignId, _milestoneIndex, m.amount);
    }

    // --- Cancel ---
    function cancelCampaign(uint256 _campaignId) external onlyCampaignCreator(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.isActive, "Campaign not active");
        c.isActive = false;
        emit CampaignCancelled(_campaignId);
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/vanhuy/Desktop/talent-project/contracts
forge build
```

Expected: `Compiler run successful`.

- [ ] **Step 3: Commit**

```bash
git add contracts/src/ProofDonate.sol
git commit -m "feat: add ProofDonate contract with requestVerification"
```

---

## Task 4: Write Solidity tests

**Files:**
- Create: `contracts/test/ProofDonate.t.sol`

- [ ] **Step 1: Write the test file**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProofDonate.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Celo Dollar", "cUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ProofDonateTest is Test {
    ProofDonate public proofDonate;
    MockERC20 public cUSD;

    address public owner = address(this);
    address public creator = address(0x1);
    address public donor1 = address(0x2);
    address public donor2 = address(0x3);
    address public unverified = address(0x4);

    function setUp() public {
        cUSD = new MockERC20();
        proofDonate = new ProofDonate(address(cUSD));

        // Mint cUSD to donors
        cUSD.mint(donor1, 10000 ether);
        cUSD.mint(donor2, 10000 ether);

        // Approve contract to spend donors' cUSD
        vm.prank(donor1);
        cUSD.approve(address(proofDonate), type(uint256).max);
        vm.prank(donor2);
        cUSD.approve(address(proofDonate), type(uint256).max);

        // Verify creator
        proofDonate.verifyHuman(creator);
    }

    // Helper: create a sample campaign as creator
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

    function test_DeploymentSetsCorrectCUSD() public view {
        assertEq(address(proofDonate.cUSD()), address(cUSD));
    }

    function test_DeploymentSetsCorrectOwner() public view {
        assertEq(proofDonate.owner(), owner);
    }

    function test_DeploymentStartsWithZeroCampaigns() public view {
        assertEq(proofDonate.campaignCount(), 0);
    }

    function test_RevertDeployWithZeroAddress() public {
        vm.expectRevert("Invalid cUSD address");
        new ProofDonate(address(0));
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
        // creator is already verified in setUp
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
        vm.expectRevert("Not owner");
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
    // Donations
    // ========================

    function test_AcceptDonation() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 100 ether);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 100 ether);

        ProofDonate.Donation[] memory ds = proofDonate.getDonations(0);
        assertEq(ds.length, 1);
        assertEq(ds[0].amount, 100 ether);
        assertEq(ds[0].donor, donor1);
    }

    function test_MultipleDonations() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 200 ether);
        vm.prank(donor2);
        proofDonate.donate(0, 300 ether);

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
        proofDonate.donate(0, 100 ether);
    }

    function test_RevertDonateAfterDeadline() public {
        _createSampleCampaign();

        vm.warp(block.timestamp + 31 days);

        vm.prank(donor1);
        vm.expectRevert("Campaign ended");
        proofDonate.donate(0, 100 ether);
    }

    function test_RevertDonateZeroAmount() public {
        _createSampleCampaign();

        vm.prank(donor1);
        vm.expectRevert("Amount must be > 0");
        proofDonate.donate(0, 0);
    }

    // ========================
    // Milestone Release
    // ========================

    function test_ReleaseFirstMilestone() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 500 ether);

        uint256 balBefore = cUSD.balanceOf(creator);

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        ProofDonate.Milestone[] memory ms = proofDonate.getMilestones(0);
        assertTrue(ms[0].isReleased);
        assertFalse(ms[1].isReleased);

        assertEq(cUSD.balanceOf(creator) - balBefore, 400 ether);

        ProofDonate.Campaign memory c = proofDonate.getCampaign(0);
        assertEq(c.currentAmount, 100 ether);
    }

    function test_SequentialMilestoneRelease() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 1000 ether);

        // Cannot release milestone 1 before milestone 0
        vm.prank(creator);
        vm.expectRevert("Previous milestone not released");
        proofDonate.releaseMilestone(0, 1);

        // Release sequentially
        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);
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
        proofDonate.donate(0, 500 ether);

        vm.prank(creator);
        proofDonate.releaseMilestone(0, 0);

        vm.prank(creator);
        vm.expectRevert("Already released");
        proofDonate.releaseMilestone(0, 0);
    }

    function test_RevertReleaseInsufficientFunds() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 100 ether);

        vm.prank(creator);
        vm.expectRevert("Insufficient funds");
        proofDonate.releaseMilestone(0, 0);
    }

    function test_RevertReleaseByNonCreator() public {
        _createSampleCampaign();

        vm.prank(donor1);
        proofDonate.donate(0, 500 ether);

        vm.prank(donor1);
        vm.expectRevert("Not campaign creator");
        proofDonate.releaseMilestone(0, 0);
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
}
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/vanhuy/Desktop/talent-project/contracts
forge test -v
```

Expected: All tests pass (should show ~25 passing tests).

- [ ] **Step 3: Commit**

```bash
git add contracts/test/ProofDonate.t.sol
git commit -m "test: add comprehensive Solidity tests for ProofDonate"
```

---

## Task 5: Write deploy script

**Files:**
- Create: `contracts/script/Deploy.s.sol`

- [ ] **Step 1: Write the deploy script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ProofDonate.sol";

contract DeployProofDonate is Script {
    function run() external {
        // cUSD address on Celo mainnet
        address cUSD_MAINNET = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
        // cUSD address on Celo Sepolia testnet
        address cUSD_SEPOLIA = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

        // Use Sepolia by default, override with env var for mainnet
        address cUSD = block.chainid == 42220 ? cUSD_MAINNET : cUSD_SEPOLIA;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ProofDonate proofDonate = new ProofDonate(cUSD);

        vm.stopBroadcast();

        console.log("ProofDonate deployed at:", address(proofDonate));
        console.log("cUSD address:", cUSD);
        console.log("Owner:", proofDonate.owner());
    }
}
```

- [ ] **Step 2: Verify script compiles**

```bash
cd /Users/vanhuy/Desktop/talent-project/contracts
forge build
```

Expected: Compilation succeeds.

- [ ] **Step 3: Create `.env.example`**

Create `contracts/.env.example`:

```
PRIVATE_KEY=your_private_key_here
CELO_SEPOLIA_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_RPC_URL=https://forno.celo.org
```

- [ ] **Step 4: Add `.gitignore` for contracts**

Create `contracts/.gitignore`:

```
# Compiler output
out/
cache/

# Environment
.env

# Dependencies (optional - can include lib/ if you prefer)
```

- [ ] **Step 5: Commit**

```bash
git add contracts/script/Deploy.s.sol contracts/.env.example contracts/.gitignore
git commit -m "feat: add Foundry deploy script and config"
```

---

## Task 6: Update frontend ABI and hooks for new contract

**Files:**
- Modify: `frontend/src/lib/contracts.ts`
- Modify: `frontend/src/hooks/useProofDonate.ts`

- [ ] **Step 1: Add new ABI entries to `frontend/src/lib/contracts.ts`**

Add these two entries to the `PROOF_DONATE_ABI` array, after the existing `verifyHuman` entry:

```typescript
  {
    inputs: [],
    name: "requestVerification",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "verificationRequested",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
    ],
    name: "VerificationRequested",
    type: "event",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
```

- [ ] **Step 2: Add new hooks to `frontend/src/hooks/useProofDonate.ts`**

Add these hooks at the end of the file, before the closing:

```typescript
export function useRequestVerification() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const requestVerification = () => {
    writeContract({
      ...contractConfig,
      functionName: "requestVerification",
    });
  };

  return { requestVerification, isPending, isConfirming, isSuccess, hash, error };
}

export function useVerificationRequested(address: `0x${string}` | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "verificationRequested",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useContractOwner() {
  return useReadContract({
    ...contractConfig,
    functionName: "owner",
  });
}

export function useVerifyHuman() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const verifyHuman = (userAddress: `0x${string}`) => {
    writeContract({
      ...contractConfig,
      functionName: "verifyHuman",
      args: [userAddress],
    });
  };

  return { verifyHuman, isPending, isConfirming, isSuccess, hash, error };
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/vanhuy/Desktop/talent-project
git add frontend/src/lib/contracts.ts frontend/src/hooks/useProofDonate.ts
git commit -m "feat: add ABI entries and hooks for verification request flow"
```

---

## Task 7: Update `/verify` page with request flow

**Files:**
- Modify: `frontend/src/app/verify/page.tsx`

- [ ] **Step 1: Rewrite the verify page**

Replace the entire content of `frontend/src/app/verify/page.tsx` with:

```tsx
"use client";

import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useIsVerified,
  useVerificationRequested,
  useRequestVerification,
} from "@/hooks/useProofDonate";
import { CheckCircle, ShieldCheck, Loader2, Clock } from "lucide-react";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isLoadingVerified } = useIsVerified(address);
  const { data: hasRequested, isLoading: isLoadingRequested } =
    useVerificationRequested(address);
  const {
    requestVerification,
    isPending,
    isConfirming,
    isSuccess: requestSuccess,
  } = useRequestVerification();

  if (!isConnected) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Proof of Humanity</h1>
        <p className="text-muted-foreground">
          Connect your wallet to verify your identity.
        </p>
      </div>
    );
  }

  if (isLoadingVerified || isLoadingRequested) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  // State 3: Already verified
  if (isVerified) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">You are Verified!</h1>
        <p className="text-muted-foreground">
          Your humanity has been verified. You can now create campaigns.
        </p>
      </div>
    );
  }

  // State 2: Already requested, waiting for approval
  if (hasRequested || requestSuccess) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verification Pending</h1>
        <p className="text-muted-foreground mb-4">
          Your request has been submitted. Please wait for the admin to approve.
        </p>
        <p className="text-sm text-muted-foreground">
          Your address: <code className="text-xs">{address}</code>
        </p>
      </div>
    );
  }

  // State 1: Not requested yet
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Proof of Humanity
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verify Your Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            To create campaigns on ProofDonate, you need to verify your
            identity. This prevents scam campaigns and builds trust with
            donors.
          </p>

          <div className="p-4 rounded-lg border bg-secondary/30">
            <h3 className="font-medium mb-1">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click the button below to submit your verification request</li>
              <li>The admin will review and approve your request</li>
              <li>Once approved, you can create campaigns</li>
            </ol>
          </div>

          <Button
            onClick={requestVerification}
            disabled={isPending || isConfirming}
            className="w-full"
            size="lg"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Verification"
            )}
          </Button>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              <strong>Your address:</strong>{" "}
              <code className="text-xs">{address}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/verify/page.tsx
git commit -m "feat: update verify page with request verification flow"
```

---

## Task 8: Create `/admin` page

**Files:**
- Create: `frontend/src/app/admin/page.tsx`

- [ ] **Step 1: Create the admin page**

Create `frontend/src/app/admin/page.tsx`:

```tsx
"use client";

import { useAccount, useWatchContractEvent } from "wagmi";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useContractOwner,
  useVerifyHuman,
  useIsVerified,
} from "@/hooks/useProofDonate";
import { PROOF_DONATE_ABI, PROOF_DONATE_ADDRESS } from "@/lib/contracts";
import { truncateAddress } from "@/lib/app-utils";
import { ShieldAlert, Loader2, CheckCircle, UserCheck } from "lucide-react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";

function PendingRequestRow({ address: userAddress }: { address: `0x${string}` }) {
  const { data: isVerified, isLoading } = useIsVerified(userAddress);
  const { verifyHuman, isPending, isConfirming, isSuccess } = useVerifyHuman();

  // Hide if already verified
  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (isVerified || isSuccess) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <code className="text-sm">{truncateAddress(userAddress)}</code>
        </div>
        <span className="text-sm text-green-600 font-medium">Approved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <code className="text-sm">{truncateAddress(userAddress)}</code>
      <Button
        size="sm"
        onClick={() => verifyHuman(userAddress)}
        disabled={isPending || isConfirming}
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Approving...
          </>
        ) : (
          <>
            <UserCheck className="mr-1 h-3 w-3" />
            Approve
          </>
        )}
      </Button>
    </div>
  );
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: ownerAddress, isLoading: isLoadingOwner } = useContractOwner();
  const publicClient = usePublicClient();
  const [pendingAddresses, setPendingAddresses] = useState<`0x${string}`[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const isOwner =
    address && ownerAddress
      ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
      : false;

  // Fetch VerificationRequested events
  useEffect(() => {
    async function fetchRequests() {
      if (!publicClient || !isOwner) return;

      try {
        const logs = await publicClient.getLogs({
          address: PROOF_DONATE_ADDRESS,
          event: parseAbiItem("event VerificationRequested(address indexed user)"),
          fromBlock: 0n,
        });

        const addresses = logs.map(
          (log) => log.args.user as `0x${string}`
        );

        // Deduplicate
        const unique = [...new Set(addresses.map((a) => a.toLowerCase()))].map(
          (a) => a as `0x${string}`
        );

        setPendingAddresses(unique);
      } catch (error) {
        console.error("Failed to fetch verification requests:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchRequests();
  }, [publicClient, isOwner]);

  if (!isConnected) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        <p className="text-muted-foreground">
          Connect your wallet to access the admin panel.
        </p>
      </div>
    );
  }

  if (isLoadingOwner) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          Only the contract owner can access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading requests...
              </p>
            </div>
          ) : pendingAddresses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No verification requests yet.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingAddresses.map((addr) => (
                <PendingRequestRow key={addr} address={addr} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/page.tsx
git commit -m "feat: add admin page for approving verification requests"
```

---

## Task 9: Update Navbar to show Admin link for owner

**Files:**
- Modify: `frontend/src/components/navbar.tsx`

- [ ] **Step 1: Rewrite `frontend/src/components/navbar.tsx`**

Replace the entire content with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ConnectButton } from "@/components/connect-button";
import { useContractOwner } from "@/hooks/useProofDonate";

const baseNavLinks = [
  { name: "Home", href: "/" },
  { name: "Create", href: "/campaign/create" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Verify", href: "/verify" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { data: ownerAddress } = useContractOwner();

  const isOwner =
    address && ownerAddress
      ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
      : false;

  const navLinks = isOwner
    ? [...baseNavLinks, { name: "Admin", href: "/admin" }]
    : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex items-center gap-2 mb-8">
                <span className="font-bold text-lg">ProofDonate</span>
              </div>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-base font-medium transition-colors hover:text-primary ${
                      pathname === link.href
                        ? "text-foreground"
                        : "text-foreground/70"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="font-bold text-xl">ProofDonate</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href
                  ? "text-foreground"
                  : "text-foreground/70"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/navbar.tsx
git commit -m "feat: show Admin nav link for contract owner"
```

---

## Task 10: Verify frontend builds and final cleanup

**Files:**
- Verify: `frontend/` builds successfully

- [ ] **Step 1: Install dependencies and build**

```bash
cd /Users/vanhuy/Desktop/talent-project/frontend
pnpm install
pnpm build
```

Expected: Build succeeds. There may be warnings about the contract address being `0x000...000` (placeholder) - that's expected until deployment.

- [ ] **Step 2: Update root README.md**

Replace `README.md` at project root with:

```markdown
# ProofDonate

Transparent donation platform on Celo blockchain with milestone-based fund release and verified creators.

## Project Structure

```
contracts/   - Smart contracts (Foundry)
frontend/    - Web application (Next.js)
```

## Quick Start

### Contracts

```bash
cd contracts
forge build        # Compile
forge test         # Run tests
```

### Frontend

```bash
cd frontend
pnpm install       # Install dependencies
pnpm dev           # Start dev server at http://localhost:3000
```

## Deploy Contract

```bash
cd contracts
cp .env.example .env
# Edit .env with your private key

# Deploy to Celo Sepolia testnet
forge script script/Deploy.s.sol --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast

# After deploy, update frontend/src/lib/contracts.ts with the contract address
```

## Tech Stack

- **Contracts**: Solidity, Foundry, OpenZeppelin
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Wallet**: RainbowKit, wagmi, viem
- **Blockchain**: Celo (cUSD stablecoin)
```

- [ ] **Step 3: Final commit**

```bash
cd /Users/vanhuy/Desktop/talent-project
git add README.md
git commit -m "docs: update README for new project structure"
```

---

## Summary of all commits

| # | Commit message |
|---|----------------|
| 1 | `refactor: move frontend out of monorepo, remove Hardhat and Turborepo` |
| 2 | `feat: initialize Foundry project with OpenZeppelin` |
| 3 | `feat: add ProofDonate contract with requestVerification` |
| 4 | `test: add comprehensive Solidity tests for ProofDonate` |
| 5 | `feat: add Foundry deploy script and config` |
| 6 | `feat: add ABI entries and hooks for verification request flow` |
| 7 | `feat: update verify page with request verification flow` |
| 8 | `feat: add admin page for approving verification requests` |
| 9 | `feat: show Admin nav link for contract owner` |
| 10 | `docs: update README for new project structure` |
