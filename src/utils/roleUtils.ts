export const ROLE_NAMES = {
  0: 'BA',
  1: 'Client', 
  2: 'Developer'
} as const;

export const ROLE_NUMBERS = {
  'BA': 0,
  'Client': 1,
  'Developer': 2
} as const;

export type Role = 0 | 1 | 2;

export const getRoleName = (role: number): string => {
  return ROLE_NAMES[role as Role] || 'Unknown';
};

export const getRoleNumber = (roleName: string): number => {
  return ROLE_NUMBERS[roleName as keyof typeof ROLE_NUMBERS] || 0;
};

export const isValidRole = (role: number): boolean => {
  return [0, 1, 2].includes(role);
};
