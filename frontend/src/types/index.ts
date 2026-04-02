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
