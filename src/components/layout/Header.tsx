import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  X,
  Grid3X3,
  UserPlus,
  CreditCard,
  Menu,
  Command,
  UsersRound,
  Clock,
  Timer,
  CalendarCheck,
  Check,
  CheckCheck,
  Megaphone,
  FileText,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebarStore } from '@/stores/sidebar.store';
import { cn } from '@/lib/utils';
import { notificationService, type Notification } from '@/services/notification.service';

// Breadcrumb configuration
const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  create: 'Create',
  edit: 'Edit',
  departments: 'Departments',
  positions: 'Positions',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  performance: 'Performance',
  contracts: 'Contracts',
  requests: 'Requests',
  users: 'User Management',
  settings: 'Settings',
  profile: 'Profile',
  movement: 'Movement',
  'org-chart': 'Org Chart',
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isCollapsed, isOpen, setOpen } = useSidebarStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const response = await notificationService.getMyNotifications({ limit: 10 });
      setNotifications(response.data);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications, fetchNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification);
    if (notification.link) {
      navigate(notification.link);
      setShowNotifications(false);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement_new':
      case 'announcement_urgent':
        return <Megaphone className="h-4 w-4 text-orange-500" />;
      case 'leave_request_submitted':
      case 'leave_approval_pending':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'leave_request_approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'leave_request_rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'document_uploaded':
      case 'document_verified':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'document_expiring':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Generate breadcrumbs from pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    const isId = /^\d+$/.test(segment);
    const label = isId ? 'Detail' : breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    return { path, label, isLast };
  });

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (showSearchModal && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchModal]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (user?.employee?.name) {
      const names = user.employee.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    return user?.employee?.name || user?.email?.split('@')[0] || 'User';
  };

  const getPrimaryRole = () => {
    return user?.roles?.[0] || 'Employee';
  };

  const userRoles = user?.roles || ['Employee'];
  const isCEO = userRoles.some(r => ['Group CEO', 'CEO'].includes(r));
  const isHR = userRoles.some(r => ['HR Manager', 'HR Staff'].includes(r));
  const isManager = userRoles.includes('Manager') && !isHR && !isCEO;
  const isSuperAdmin = userRoles.includes('Super Admin');
  const isEmployee = !isSuperAdmin && !isHR && !isManager && !isCEO;

  // Different quick actions based on role
  const quickActions = isEmployee
    ? [
        { icon: Clock, label: 'Attendance', path: '/attendance', color: 'blue' },
        { icon: CalendarCheck, label: 'My Leave', path: '/my-leave', color: 'green' },
      ]
    : isManager
    ? [
        { icon: UsersRound, label: 'My Team', path: '/my-team', color: 'blue' },
        { icon: CalendarCheck, label: 'Leave Approval', path: '/leave-approval', color: 'green' },
      ]
    : isCEO
    ? [
        { icon: Home, label: 'Dashboard', path: '/ceo', color: 'blue' },
        { icon: CreditCard, label: 'Payroll Report', path: '/ceo/payroll-report', color: 'green' },
      ]
    : [
        { icon: UserPlus, label: 'Add Employee', path: '/employees/create', color: 'blue' },
        { icon: CreditCard, label: 'Payroll', path: '/payroll', color: 'green' },
      ];

  return (
    <>
      <header
        className={cn(
          'fixed right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 transition-all duration-300',
          // Mobile: full width (left-0), Desktop: account for sidebar
          'left-0 lg:left-[280px]',
          isCollapsed && 'lg:left-20'
        )}
      >
        {/* Left: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setOpen(!isOpen)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            {location.pathname === '/dashboard' ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-900 font-semibold text-base">Dashboard</span>
              </div>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Dashboard</span>
                </Link>
                {breadcrumbs.slice(1).map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    {crumb.isLast ? (
                      <span className="text-gray-900 font-semibold">{crumb.label}</span>
                    ) : (
                      <Link
                        to={crumb.path}
                        className="text-gray-600 hover:text-blue-600 font-medium transition"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Desktop Search Trigger */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-[280px] lg:w-[320px] hover:border-blue-300 hover:bg-white transition cursor-pointer group"
          >
            <Search className="h-4 w-4 text-gray-400 mr-3 group-hover:text-blue-500" />
            <span className="flex-1 text-left text-sm text-gray-400">Search employees, documents...</span>
            <kbd className="hidden xl:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded group-hover:border-blue-200">
              <Command className="inline h-3 w-3" />K
            </kbd>
          </button>

          {/* Mobile Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="md:hidden p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowQuickActions(false);
                setShowDropdown(false);
              }}
              className="relative p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-gray-500">Loading...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={cn(
                              'w-full p-4 text-left hover:bg-gray-50 transition flex gap-3',
                              !notification.is_read && 'bg-blue-50/50'
                            )}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm truncate',
                                notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-100">
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="relative hidden md:block">
            <button
              onClick={() => {
                setShowQuickActions(!showQuickActions);
                setShowNotifications(false);
                setShowDropdown(false);
              }}
              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>

            {showQuickActions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowQuickActions(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => (
                      <Link
                        key={action.path}
                        to={action.path}
                        onClick={() => setShowQuickActions(false)}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-xl transition',
                          action.color === 'blue' && 'hover:bg-blue-50',
                          action.color === 'green' && 'hover:bg-green-50'
                        )}
                      >
                        <action.icon
                          className={cn(
                            'h-6 w-6 mb-2',
                            action.color === 'blue' && 'text-blue-600',
                            action.color === 'green' && 'text-green-600'
                          )}
                        />
                        <span className="text-xs font-medium text-gray-700">{action.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
                setShowQuickActions(false);
              }}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-xl p-1.5 pr-2 md:pr-3 transition"
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=3b82f6&color=ffffff`}
                alt={getDisplayName()}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-blue-500 shadow-lg"
              />
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform duration-200 hidden md:block',
                  showDropdown && 'rotate-180'
                )}
              />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User info in dropdown */}
                  <div className="px-4 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate('/profile');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-t border-gray-100"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Profile
                    </button>
                  </div>

                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {showSearchModal && (
        <SearchModal onClose={() => setShowSearchModal(false)} searchInputRef={searchInputRef} isManager={isManager} isEmployee={isEmployee} isCEO={isCEO} />
      )}
    </>
  );
}

// Search Modal Component
function SearchModal({
  onClose,
  searchInputRef,
  isManager,
  isEmployee,
  isCEO,
}: {
  onClose: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isManager: boolean;
  isEmployee: boolean;
  isCEO: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filters = isEmployee
    ? [
        { id: 'all', label: 'All', color: 'blue' },
        { id: 'attendance', label: 'Attendance', color: 'green' },
        { id: 'leave', label: 'Leave', color: 'orange' },
        { id: 'requests', label: 'Requests', color: 'purple' },
      ]
    : isManager
    ? [
        { id: 'all', label: 'All', color: 'blue' },
        { id: 'team', label: 'Team', color: 'blue' },
        { id: 'attendance', label: 'Attendance', color: 'green' },
        { id: 'leave', label: 'Leave', color: 'orange' },
      ]
    : isCEO
    ? [
        { id: 'all', label: 'All', color: 'blue' },
        { id: 'reports', label: 'Reports', color: 'green' },
        { id: 'payroll', label: 'Payroll', color: 'orange' },
        { id: 'approvals', label: 'Approvals', color: 'purple' },
      ]
    : [
        { id: 'all', label: 'All', color: 'blue' },
        { id: 'employees', label: 'Employees', color: 'blue' },
        { id: 'payroll', label: 'Payroll', color: 'green' },
        { id: 'leave', label: 'Leave', color: 'orange' },
        { id: 'departments', label: 'Departments', color: 'purple' },
      ];

  const quickNav = isEmployee
    ? [
        { title: 'Dashboard', path: '/dashboard', icon: Home, color: 'blue' },
        { title: 'My Attendance', path: '/attendance', icon: Clock, color: 'green' },
        { title: 'My Leave', path: '/my-leave', icon: CalendarCheck, color: 'orange' },
        { title: 'My Requests', path: '/requests', icon: Bell, color: 'purple' },
        { title: 'Profile', path: '/profile', icon: User, color: 'gray' },
      ]
    : isManager
    ? [
        { title: 'Dashboard', path: '/dashboard', icon: Home, color: 'blue' },
        { title: 'My Team', path: '/my-team', icon: UsersRound, color: 'indigo' },
        { title: 'Attendance', path: '/team-attendance', icon: Clock, color: 'green' },
        { title: 'Overtime', path: '/team-overtime', icon: Timer, color: 'orange' },
        { title: 'Leave Approval', path: '/leave-approval', icon: CalendarCheck, color: 'purple' },
      ]
    : isCEO
    ? [
        { title: 'Dashboard', path: '/ceo', icon: Home, color: 'blue' },
        { title: 'Leadership Team', path: '/ceo/leadership-team', icon: UsersRound, color: 'indigo' },
        { title: 'Financial Overview', path: '/ceo/financial-overview', icon: CreditCard, color: 'green' },
        { title: 'Payroll Report', path: '/ceo/payroll-report', icon: CreditCard, color: 'orange' },
        { title: 'Approvals', path: '/ceo/approvals', icon: CalendarCheck, color: 'purple' },
        { title: 'Settings', path: '/settings', icon: Settings, color: 'gray' },
      ]
    : [
        { title: 'Dashboard', path: '/dashboard', icon: Home, color: 'blue' },
        { title: 'Employees', path: '/employees', icon: User, color: 'indigo' },
        { title: 'Payroll', path: '/payroll', icon: CreditCard, color: 'green' },
        { title: 'Leave', path: '/leave', icon: Bell, color: 'orange' },
        { title: 'Settings', path: '/settings', icon: Settings, color: 'gray' },
      ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-[101] animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees, payroll, leave, documents..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50 overflow-x-auto">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap',
                  filterType === filter.id
                    ? filter.color === 'blue'
                      ? 'bg-blue-100 text-blue-700'
                      : filter.color === 'green'
                      ? 'bg-green-100 text-green-700'
                      : filter.color === 'orange'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Results / Quick Nav */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!query ? (
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Quick Navigation
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {quickNav.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group text-left"
                    >
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center',
                          item.color === 'blue' && 'bg-blue-100',
                          item.color === 'indigo' && 'bg-indigo-100',
                          item.color === 'green' && 'bg-green-100',
                          item.color === 'orange' && 'bg-orange-100',
                          item.color === 'purple' && 'bg-purple-100',
                          item.color === 'gray' && 'bg-gray-100'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-4 w-4',
                            item.color === 'blue' && 'text-blue-600',
                            item.color === 'indigo' && 'text-indigo-600',
                            item.color === 'green' && 'text-green-600',
                            item.color === 'orange' && 'text-orange-600',
                            item.color === 'purple' && 'text-purple-600',
                            item.color === 'gray' && 'text-gray-600'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  No results for "{query}"
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try different keywords or change the filter
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">
                  ↵
                </kbd>{' '}
                to open
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">
                  ESC
                </kbd>{' '}
                to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
