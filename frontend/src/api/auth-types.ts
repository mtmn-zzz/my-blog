export type User = {
  id: number;
  username: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  has_password?: boolean;
};

export type ProfileUpdate = {
  nickname?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type RegisterResponse = {
  message: string;
  user: User;
};
