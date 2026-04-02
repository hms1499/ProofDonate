export const PROOF_DONATE_ABI = [
  {
    inputs: [{ internalType: "address", name: "_cUSD", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
    ],
    name: "CampaignCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "title", type: "string" },
      { indexed: false, internalType: "uint256", name: "targetAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "CampaignCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "donor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "DonationMade",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
    ],
    name: "HumanVerified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "milestoneIndex", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "MilestoneReleased",
    type: "event",
  },
  {
    inputs: [],
    name: "campaignCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_campaignId", type: "uint256" }],
    name: "cancelCampaign",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "uint256", name: "_targetAmount", type: "uint256" },
      { internalType: "string[]", name: "_milestoneDescriptions", type: "string[]" },
      { internalType: "uint256[]", name: "_milestoneAmounts", type: "uint256[]" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "createCampaign",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_campaignId", type: "uint256" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "donate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_campaignId", type: "uint256" }],
    name: "getCampaign",
    outputs: [
      {
        components: [
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "string", name: "title", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "targetAmount", type: "uint256" },
          { internalType: "uint256", name: "currentAmount", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "bool", name: "isActive", type: "bool" },
          { internalType: "uint256", name: "milestoneCount", type: "uint256" },
          { internalType: "bool", name: "creatorVerified", type: "bool" },
        ],
        internalType: "struct ProofDonate.Campaign",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_creator", type: "address" }],
    name: "getCreatorCampaigns",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_campaignId", type: "uint256" }],
    name: "getDonationCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_campaignId", type: "uint256" }],
    name: "getDonations",
    outputs: [
      {
        components: [
          { internalType: "address", name: "donor", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct ProofDonate.Donation[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_campaignId", type: "uint256" }],
    name: "getMilestones",
    outputs: [
      {
        components: [
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bool", name: "isReleased", type: "bool" },
        ],
        internalType: "struct ProofDonate.Milestone[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_campaignId", type: "uint256" },
      { internalType: "uint256", name: "_milestoneIndex", type: "uint256" },
    ],
    name: "releaseMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "verifiedHumans",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "verifyHuman",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Update these after deployment
export const PROOF_DONATE_ADDRESS = (process.env.NEXT_PUBLIC_PROOF_DONATE_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
