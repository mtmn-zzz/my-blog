export type User = {
  id: number;
  username: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
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
