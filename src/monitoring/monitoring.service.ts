import { Injectable, Logger } from '@nestjs/common';

export interface UserActivity {
  userId: string;
  userRole: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  sessionId: string;
  lastSeen: Date;
  currentPage?: string;
  ipAddress?: string;
  userAgent?: string;
  activities: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'page_load' | 'api_call' | 'crud_operation' | 'error';
  action: string;
  details: any;
  page?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private userSessions = new Map<string, UserActivity>();
  private activityLogs: ActivityLog[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 activities
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  // Track user session activity
  trackUserSession(
    userId: string, 
    sessionId: string,
    userInfo: {
      role: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    },
    ipAddress?: string,
    userAgent?: string
  ): void {
    const existingUser = this.userSessions.get(userId);
    
    const userActivity: UserActivity = {
      userId,
      userRole: userInfo.role,
      userEmail: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      sessionId,
      lastSeen: new Date(),
      ipAddress,
      userAgent,
      activities: existingUser?.activities || [],
    };

    this.userSessions.set(userId, userActivity);
    this.logger.log(`User session tracked: ${userId} (${userInfo.role})`);
  }

  // Track page navigation
  trackPageLoad(userId: string, page: string, additionalInfo?: any): void {
    const user = this.userSessions.get(userId);
    if (user) {
      user.currentPage = page;
      user.lastSeen = new Date();
      
      this.addActivity(userId, {
        type: 'page_load',
        action: `Page loaded: ${page}`,
        details: additionalInfo,
        page,
      });
    }
  }

  // Track API calls
  trackApiCall(
    userId: string,
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    error?: string,
    additionalInfo?: any
  ): void {
    this.addActivity(userId, {
      type: 'api_call',
      action: `${method} ${endpoint}`,
      details: additionalInfo,
      endpoint,
      method,
      statusCode,
      responseTime,
      error,
    });

    // Update last seen
    const user = this.userSessions.get(userId);
    if (user) {
      user.lastSeen = new Date();
    }
  }

  // Track CRUD operations
  trackCrudOperation(
    userId: string,
    operation: 'create' | 'read' | 'update' | 'delete' | 'list',
    entity: string,
    entityId?: string,
    duration?: number,
    error?: string,
    additionalInfo?: any
  ): void {
    this.addActivity(userId, {
      type: 'crud_operation',
      action: `${operation.toUpperCase()} ${entity}${entityId ? ` (${entityId})` : ''}`,
      details: {
        operation,
        entity,
        entityId,
        duration,
        ...additionalInfo,
      },
      responseTime: duration,
      error,
    });
  }

  // Track errors
  trackError(
    userId: string,
    error: string,
    page?: string,
    additionalInfo?: any
  ): void {
    this.addActivity(userId, {
      type: 'error',
      action: `Error: ${error}`,
      details: additionalInfo,
      page,
      error,
    });
  }

  // Get active users (seen in last 30 minutes)
  getActiveUsers(): UserActivity[] {
    const now = new Date();
    const activeUsers = Array.from(this.userSessions.values()).filter(
      user => now.getTime() - user.lastSeen.getTime() < this.SESSION_TIMEOUT
    );

    return activeUsers.map(user => ({
      ...user,
      activities: user.activities.slice(-50), // Last 50 activities per user
    }));
  }

  // Get user activity by ID
  getUserActivity(userId: string): UserActivity | null {
    return this.userSessions.get(userId) || null;
  }

  // Get recent activities across all users
  getRecentActivities(limit: number = 100): ActivityLog[] {
    return this.activityLogs
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get activities by type
  getActivitiesByType(
    type: 'page_load' | 'api_call' | 'crud_operation' | 'error',
    limit: number = 50
  ): ActivityLog[] {
    return this.activityLogs
      .filter(log => log.type === type)
      .slice(-limit)
      .reverse();
  }

  // Get statistics
  getStatistics() {
    const activeUsers = this.getActiveUsers();
    const recentLogs = this.getRecentActivities(100);
    
    const stats = {
      activeUsers: activeUsers.length,
      totalSessions: this.userSessions.size,
      totalActivities: this.activityLogs.length,
      recentActivities: {
        pageLoads: recentLogs.filter(log => log.type === 'page_load').length,
        apiCalls: recentLogs.filter(log => log.type === 'api_call').length,
        crudOperations: recentLogs.filter(log => log.type === 'crud_operation').length,
        errors: recentLogs.filter(log => log.type === 'error').length,
      },
      usersByRole: this.getUsersByRole(activeUsers),
      averageResponseTime: this.getAverageResponseTime(recentLogs),
      errorRate: this.getErrorRate(recentLogs),
    };

    return stats;
  }

  // Private helper methods
  private addActivity(userId: string, activity: Partial<ActivityLog>): void {
    const activityLog: ActivityLog = {
      id: this.generateActivityId(),
      timestamp: new Date(),
      type: activity.type!,
      action: activity.action!,
      details: activity.details,
      page: activity.page,
      endpoint: activity.endpoint,
      method: activity.method,
      statusCode: activity.statusCode,
      responseTime: activity.responseTime,
      error: activity.error,
    };

    // Add to global activities
    this.activityLogs.push(activityLog);
    
    // Limit global logs
    if (this.activityLogs.length > this.MAX_LOGS) {
      this.activityLogs = this.activityLogs.slice(-this.MAX_LOGS);
    }

    // Add to user activities
    const user = this.userSessions.get(userId);
    if (user) {
      user.activities.push(activityLog);
      
      // Limit user activities to 100
      if (user.activities.length > 100) {
        user.activities = user.activities.slice(-100);
      }
    }
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [userId, user] of this.userSessions.entries()) {
      if (now.getTime() - user.lastSeen.getTime() > this.SESSION_TIMEOUT) {
        this.userSessions.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive sessions`);
    }
  }

  private generateActivityId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private getUsersByRole(users: UserActivity[]) {
    return users.reduce((acc, user) => {
      acc[user.userRole] = (acc[user.userRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getAverageResponseTime(logs: ActivityLog[]): number {
    const logsWithTime = logs.filter(log => log.responseTime);
    if (logsWithTime.length === 0) return 0;
    
    const total = logsWithTime.reduce((sum, log) => sum + (log.responseTime || 0), 0);
    return Math.round(total / logsWithTime.length);
  }

  private getErrorRate(logs: ActivityLog[]): number {
    if (logs.length === 0) return 0;
    
    const errors = logs.filter(log => log.type === 'error' || log.statusCode! >= 400).length;
    return Math.round((errors / logs.length) * 100);
  }
}