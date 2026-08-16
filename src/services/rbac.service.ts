export type UserRole = 'agency_owner' | 'account_manager' | 'client_viewer';

export interface UserContext {
  userId: string;
  orgId: string;
  role: UserRole;
  assignedClientIds: string[]; // List of client store UUIDs this user can access
}

export class RbacService {
  /**
   * Evaluates whether a user is authorized to access a specific client store
   */
  static canAccessClient(user: UserContext, clientId: string): boolean {
    if (user.role === 'agency_owner') return true; // Owners access everything in their org
    return user.assignedClientIds.includes(clientId);
  }

  /**
   * Filters a list of agency client summaries down to only what the user is assigned to
   */
  static filterClientList<T extends { clientId: string }>(user: UserContext, clients: T[]): T[] {
    if (user.role === 'agency_owner') return clients;
    return clients.filter(c => user.assignedClientIds.includes(c.clientId));
  }
}
