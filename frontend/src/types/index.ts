export interface Campaign {
  creator: `0x${string}`;
  title: string;
  description: string;
  targetAmount: bigint;
  currentAmount: bigint;
  deadline: bigint;
  isActive: boolean;
  milestoneCount: bigint;
  creatorVerified: boolean;
  metadataURI: string;
}

export interface Milestone {
  description: string;
  amount: bigint;
  isReleased: boolean;
}

export interface Donation {
  donor: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}

export interface CampaignMetadata {
  image: string;
  imagePosition?: number;
  website?: string;
  socials?: { twitter?: string; github?: string };
  documents?: string[];
  category?: string;
}
