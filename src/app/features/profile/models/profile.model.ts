export interface SubscriptionPlanFeature {
  language: number;
  name: string;
  description: string;
  includes: string[];
  _id: string;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  annualPrice: number;
  currency: string;
  subscriptionType: number;
  status: boolean;
  isDeleted: boolean;
  includes: string[];
  features: SubscriptionPlanFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUser {
  _id: string;

  phone: string;
  countryCode: string;

  name: string;
  userName: string;
  email: string;
  gender: number;

  privateAccount: boolean;

  walletBalance: number;

  // ✅ ADD THESE OPTIONAL FIELDS
  description?: string;
  link?: string;
  address?: string;
  tags?: string[];
  referralCode?: string;
  profilePicture?: string;

  createdAt: string;
  updatedAt: string;

  subscriptionPlan: SubscriptionPlan | null;
}

