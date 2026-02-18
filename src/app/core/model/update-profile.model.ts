export interface UpdateProfileRequest {
  name?: string;
  userName?: string;
  description?: string;
  privateAccount?: boolean;
  address?: string;
  tags?: string[];
  link?: string;
  referralCode?: string;
    profilePicture?: string;
  
}
