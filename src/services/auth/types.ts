export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  providers: string[];
  isDevelopmentAdmin: boolean;
}
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
