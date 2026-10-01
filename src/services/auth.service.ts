import { userApi } from '@/api/user.api'
import type { User } from '@/types'
import { USER_STORAGE_KEY } from '@/utils/storage-keys'

// ----------------------------------------------------------------
// AUTH SERVICE (Keycloak Integration)
// ----------------------------------------------------------------
export class AuthService {
  /**
   * Fetch current user from backend API
   * Backend validates Keycloak token and returns user info
   */
  static async fetchMe(): Promise<User> {
    const { data: user } = await userApi.getMe()
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    return user
  }

  /**
   * Get stored user from localStorage
   */
  static getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_STORAGE_KEY)
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr) as User
    } catch {
      // Corrupt stored user: treat as "no stored user"; ``fetchMe`` reloads it.
      return null
    }
  }

  /**
   * Clear stored user data
   */
  static clearStoredUser(): void {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
}
