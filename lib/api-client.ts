import { retryAsync, logger } from './error-handler'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    return retryAsync(async () => {
      logger.debug(`API Request: ${config.method || 'GET'} ${url}`)
      
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        logger.error(`API Error: ${config.method || 'GET'} ${url}`, error, { status: response.status, errorData })
        throw error
      }

      const data = await response.json()
      logger.debug(`API Response: ${config.method || 'GET'} ${url}`, data)
      return data
    })
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Players API
  async getPlayers(params?: {
    search?: string
    position?: string
    location?: string
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; totalPages: number }> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.position) searchParams.set('position', params.position)
    if (params?.location) searchParams.set('location', params.location)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
    
    const query = searchParams.toString()
    return this.get(`/players${query ? `?${query}` : ''}`)
  }

  async updatePlayer(data: any) {
    return this.put('/players', data)
  }

  // Teams API
  async getTeams(params?: {
    search?: string
    location?: string
    userTeamsOnly?: boolean
  }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.location) searchParams.set('location', params.location)
    if (params?.userTeamsOnly) searchParams.set('userTeamsOnly', 'true')
    
    const query = searchParams.toString()
    return this.get(`/teams${query ? `?${query}` : ''}`)
  }

  async getTeam(id: string) {
    return this.get(`/teams/${id}`)
  }

  async createTeam(data: any) {
    return this.post('/teams', data)
  }

  async updateTeam(id: string, data: any) {
    return this.put(`/teams/${id}`, data)
  }

  async deleteTeam(id: string) {
    return this.delete(`/teams/${id}`)
  }

  // Team Members API
  async addTeamMember(teamId: string, userId: string, position?: string) {
    return this.post(`/teams/${teamId}/members`, { userId, position })
  }

  async removeTeamMember(teamId: string, userId: string) {
    return this.delete(`/teams/${teamId}/members/${userId}`)
  }

  async updateTeamMember(teamId: string, userId: string, data: any) {
    return this.put(`/teams/${teamId}/members/${userId}`, data)
  }

  // Matches API
  async getMatches(params?: {
    teamId?: string
    status?: string
    date?: string
    sport?: string
    ageGroup?: string
    latitude?: number
    longitude?: number
    radius?: number // km
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.teamId) searchParams.set('teamId', params.teamId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.date) searchParams.set('date', params.date)
    if (params?.sport) searchParams.set('sport', params.sport)
    if (params?.ageGroup) searchParams.set('ageGroup', params.ageGroup)
    if (params?.latitude !== undefined) searchParams.set('latitude', String(params.latitude))
    if (params?.longitude !== undefined) searchParams.set('longitude', String(params.longitude))
    if (params?.radius !== undefined) searchParams.set('radius', String(params.radius))
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
    
    const query = searchParams.toString()
    return this.get(`/matches${query ? `?${query}` : ''}`)
  }

  async createMatch(data: any) {
    return this.post('/matches', data)
  }

  async updateMatch(id: string, data: any) {
    return this.put(`/matches/${id}`, data)
  }

  // Leagues API
  async getLeagues(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; totalPages: number }> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
    
    const query = searchParams.toString()
    return this.get(`/leagues${query ? `?${query}` : ''}`)
  }

  async createLeague(data: any) {
    return this.post('/leagues', data);
  }

  // Invites API
  async sendTeamInvite(data: {
    teamId: string
    toUserId: string
    message?: string
  }) {
    return this.post('/invites/team', data)
  }

  async respondToTeamInvite(inviteId: string, status: 'ACCEPTED' | 'DECLINED') {
    return this.put(`/invites/team/${inviteId}`, { status })
  }

  async sendMatchRequest(data: {
    fromTeamId: string
    toTeamId: string
    proposedDate: string
    proposedLocation: string
    message?: string
  }) {
    return this.post('/invites/match', data)
  }

  async getMatchRequests(teamId?: string) {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.get(`/invites/match${query}`);
  }

  // Friends API
  async getFriends() {
    return this.get('/friends');
  }

  async sendFriendRequest(toUserId: number) {
    return this.post('/friends/requests', { toUserId });
  }

  async getFriendRequests() {
    return this.get('/friends/requests');
  }

  async updateFriendshipStatus(friendshipId: string, status: 'accepted' | 'declined') {
    return this.put(`/friends/${friendshipId}`, { status });
  }

  async getFriendshipStatus(targetUserId: number): Promise<'not_friends' | 'friends' | 'pending_sent' | 'pending_received'> {
    return this.get(`/friends/status/${targetUserId}`);
  }

  // Player Ratings API
  async submitPlayerRating(playerId: number, rating: number, review?: string) {
    return this.post(`/players/${playerId}/ratings`, { rating, review });
  }

  // Notifications API
  async getNotifications() {
    return this.get('/notifications')
  }

  async markNotificationRead(id: string) {
    return this.put(`/notifications/${id}`, { isRead: true })
  }

  async markAllNotificationsRead() {
    return this.put('/notifications/mark-all-read', {});
  }

  // Pickup Games API
  async getPickupGames(params?: {
    location?: string
    sport?: string
    date?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.location) searchParams.set('location', params.location)
    if (params?.sport) searchParams.set('sport', params.sport)
    if (params?.date) searchParams.set('date', params.date)
    
    const query = searchParams.toString()
    return this.get(`/pickup-games${query ? `?${query}` : ''}`)
  }

  async createPickupGame(data: any) {
    return this.post('/pickup-games', data)
  }

  async joinPickupGame(id: string) {
    return this.post(`/pickup-games/${id}/join`)
  }

  // File Upload API
  async uploadFile(file: File, type: 'avatar' | 'team-logo' | 'image') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    return fetch('/api/upload', {
      method: 'POST',
      body: formData,
    }).then(res => res.json())
  }

  // Auth API
  async registerUser(data: any) {
    return this.post('/auth/register', data)
  }
}

export const apiClient = new ApiClient()

// React hooks for data fetching
export const useApiData = <T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}