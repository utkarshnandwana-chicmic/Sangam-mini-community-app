export enum Gender {
  Male = 1,
  Female = 2,
  Other = 3
}


export interface RegisterRequest {
  // ===== REQUIRED =====
  email: string;
  name: string;
  password: string;
  gender: Gender;
  userName: string;

  // ===== OPTIONAL =====
    profilePicture?: string;
  dob?: string;                
  latestUpdates?: boolean;
  languagePreference?: number;
  description?: string;
  privateAccount?: boolean;
  deviceToken?: string;
  deviceVoipToken?: string;
  address?: string;
  tags?: string[];
  link?: string;
  referralCode?: string;
}
