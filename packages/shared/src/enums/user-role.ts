export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  MANAGER = 'manager',
  AGENT = 'agent',
  CLIENT = 'client',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.EDITOR]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.AGENT]: 40,
  [UserRole.CLIENT]: 20,
};
