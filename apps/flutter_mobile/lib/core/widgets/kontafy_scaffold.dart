import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../constants/app_colors.dart';

class KontafyScaffold extends ConsumerWidget {
  final Widget child;

  const KontafyScaffold({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Dashboard', route: '/'),
    (icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Invoices', route: '/invoices'),
    (icon: Icons.people_outline, activeIcon: Icons.people, label: 'Contacts', route: '/contacts'),
    (icon: Icons.account_balance_wallet_outlined, activeIcon: Icons.account_balance_wallet, label: 'Payments', route: '/payments'),
    (icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view, label: 'More', route: '/more'),
  ];

  int _currentIndex(String location) {
    if (location.startsWith('/invoices')) return 1;
    if (location.startsWith('/contacts')) return 2;
    if (location.startsWith('/payments')) return 3;
    if (location.startsWith('/more') ||
        location.startsWith('/settings') ||
        location.startsWith('/profile') ||
        location.startsWith('/inventory') ||
        location.startsWith('/banking') ||
        location.startsWith('/tax') ||
        location.startsWith('/einvoice') ||
        location.startsWith('/budgets') ||
        location.startsWith('/branches') ||
        location.startsWith('/ecommerce') ||
        location.startsWith('/whatsapp') ||
        location.startsWith('/ai') ||
        location.startsWith('/ca-portal') ||
        location.startsWith('/billing') ||
        location.startsWith('/books') ||
        location.startsWith('/reports')) return 4;
    return 0;
  }

  String _fabLabel(String location) {
    if (location.startsWith('/invoices')) return 'New Invoice';
    if (location.startsWith('/contacts')) return 'New Contact';
    if (location.startsWith('/payments')) return 'Record Payment';
    if (location.startsWith('/inventory') || location.startsWith('/products')) return 'Add Product';
    return 'New Invoice';
  }

  IconData _fabIcon(String location) {
    if (location.startsWith('/contacts')) return Icons.person_add_outlined;
    if (location.startsWith('/payments')) return Icons.payment_outlined;
    return Icons.add;
  }

  String _fabRoute(String location) {
    if (location.startsWith('/invoices')) return '/invoices/new';
    if (location.startsWith('/contacts')) return '/contacts/new';
    if (location.startsWith('/payments')) return '/payments/new';
    return '/invoices/new';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final selectedIndex = _currentIndex(location);
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final org = authState.currentOrg;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          org?.name ?? 'Kontafy',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: navigate to notifications
            },
          ),
        ],
      ),
      drawer: _KontafyDrawer(
        userName: user?.name ?? 'User',
        userEmail: user?.email ?? '',
        userInitials: user?.initials ?? 'U',
        orgName: org?.name ?? 'Organization',
        orgLogoUrl: org?.logoUrl,
        onLogout: () {
          ref.read(authProvider.notifier).logout();
          context.go('/login');
        },
      ),
      body: child,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(_fabRoute(location)),
        icon: Icon(_fabIcon(location)),
        label: Text(_fabLabel(location)),
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: (index) {
          final route = _tabs[index].route;
          if (route != location) {
            context.go(route);
          }
        },
        items: _tabs
            .map((t) => BottomNavigationBarItem(
                  icon: Icon(t.icon),
                  activeIcon: Icon(t.activeIcon),
                  label: t.label,
                ))
            .toList(),
      ),
    );
  }
}

class _KontafyDrawer extends StatelessWidget {
  final String userName;
  final String userEmail;
  final String userInitials;
  final String orgName;
  final String? orgLogoUrl;
  final VoidCallback onLogout;

  const _KontafyDrawer({
    required this.userName,
    required this.userEmail,
    required this.userInitials,
    required this.orgName,
    this.orgLogoUrl,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.white,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              decoration: const BoxDecoration(
                color: AppColors.navy,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (orgLogoUrl != null && orgLogoUrl!.isNotEmpty)
                        CircleAvatar(
                          radius: 22,
                          backgroundImage: NetworkImage(orgLogoUrl!),
                        )
                      else
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppColors.navyLight,
                          child: Text(
                            userInitials,
                            style: const TextStyle(
                              color: AppColors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              orgName,
                              style: const TextStyle(
                                color: AppColors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              userEmail,
                              style: TextStyle(
                                color: AppColors.white.withOpacity(0.7),
                                fontSize: 13,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Navigation items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _DrawerItem(
                    icon: Icons.dashboard_outlined,
                    label: 'Dashboard',
                    onTap: () => _navigate(context, '/'),
                  ),
                  // Invoicing
                  _DrawerExpansion(
                    icon: Icons.receipt_long_outlined,
                    label: 'Invoicing',
                    children: [
                      _DrawerSubItem(label: 'Sales Invoices', onTap: () => _navigate(context, '/invoices')),
                      _DrawerSubItem(label: 'Purchases', onTap: () => _navigate(context, '/purchases')),
                      _DrawerSubItem(label: 'Quotations', onTap: () => _navigate(context, '/quotations')),
                      _DrawerSubItem(label: 'Purchase Orders', onTap: () => _navigate(context, '/purchase-orders')),
                      _DrawerSubItem(label: 'Credit Notes', onTap: () => _navigate(context, '/credit-notes')),
                      _DrawerSubItem(label: 'Debit Notes', onTap: () => _navigate(context, '/debit-notes')),
                      _DrawerSubItem(label: 'Proforma', onTap: () => _navigate(context, '/proforma')),
                      _DrawerSubItem(label: 'Delivery Challans', onTap: () => _navigate(context, '/delivery-challans')),
                      _DrawerSubItem(label: 'Recurring', onTap: () => _navigate(context, '/recurring')),
                    ],
                  ),
                  // Books
                  _DrawerExpansion(
                    icon: Icons.menu_book_outlined,
                    label: 'Books',
                    children: [
                      _DrawerSubItem(label: 'Chart of Accounts', onTap: () => _navigate(context, '/books/accounts')),
                      _DrawerSubItem(label: 'Journal', onTap: () => _navigate(context, '/books/journal')),
                      _DrawerSubItem(label: 'Ledger', onTap: () => _navigate(context, '/books/ledger')),
                    ],
                  ),
                  // Reports
                  _DrawerExpansion(
                    icon: Icons.bar_chart_outlined,
                    label: 'Reports',
                    children: [
                      _DrawerSubItem(label: 'Profit & Loss', onTap: () => _navigate(context, '/reports/profit-loss')),
                      _DrawerSubItem(label: 'Balance Sheet', onTap: () => _navigate(context, '/reports/balance-sheet')),
                      _DrawerSubItem(label: 'Cash Flow', onTap: () => _navigate(context, '/reports/cash-flow')),
                      _DrawerSubItem(label: 'Trial Balance', onTap: () => _navigate(context, '/reports/trial-balance')),
                      _DrawerSubItem(label: 'Aging Report', onTap: () => _navigate(context, '/reports/aging')),
                      _DrawerSubItem(label: 'Tax Summary', onTap: () => _navigate(context, '/reports/tax-summary')),
                      _DrawerSubItem(label: 'Expense Report', onTap: () => _navigate(context, '/reports/expenses')),
                    ],
                  ),
                  _DrawerItem(
                    icon: Icons.people_outline,
                    label: 'Contacts',
                    onTap: () => _navigate(context, '/contacts'),
                  ),
                  // Payments
                  _DrawerExpansion(
                    icon: Icons.account_balance_wallet_outlined,
                    label: 'Payments',
                    children: [
                      _DrawerSubItem(label: 'Received', onTap: () => _navigate(context, '/payments?tab=received')),
                      _DrawerSubItem(label: 'Made', onTap: () => _navigate(context, '/payments?tab=made')),
                    ],
                  ),
                  // Inventory
                  _DrawerExpansion(
                    icon: Icons.inventory_2_outlined,
                    label: 'Inventory',
                    children: [
                      _DrawerSubItem(label: 'Products', onTap: () => _navigate(context, '/inventory/products')),
                      _DrawerSubItem(label: 'Warehouses', onTap: () => _navigate(context, '/inventory/warehouses')),
                      _DrawerSubItem(label: 'Movements', onTap: () => _navigate(context, '/inventory/movements')),
                      _DrawerSubItem(label: 'Adjustments', onTap: () => _navigate(context, '/inventory/adjustments')),
                    ],
                  ),
                  // Banking
                  _DrawerExpansion(
                    icon: Icons.account_balance_outlined,
                    label: 'Banking',
                    children: [
                      _DrawerSubItem(label: 'Accounts', onTap: () => _navigate(context, '/banking/accounts')),
                      _DrawerSubItem(label: 'Reconciliation', onTap: () => _navigate(context, '/banking/reconciliation')),
                    ],
                  ),
                  // Tax & GST
                  _DrawerExpansion(
                    icon: Icons.calculate_outlined,
                    label: 'Tax & GST',
                    children: [
                      _DrawerSubItem(label: 'GST Returns', onTap: () => _navigate(context, '/tax/gst')),
                      _DrawerSubItem(label: 'TDS', onTap: () => _navigate(context, '/tax/tds')),
                      _DrawerSubItem(label: 'Tax Settings', onTap: () => _navigate(context, '/tax/settings')),
                    ],
                  ),
                  // E-Invoice
                  _DrawerExpansion(
                    icon: Icons.verified_outlined,
                    label: 'E-Invoice',
                    children: [
                      _DrawerSubItem(label: 'Generate', onTap: () => _navigate(context, '/einvoice/generate')),
                      _DrawerSubItem(label: 'E-Way Bill', onTap: () => _navigate(context, '/einvoice/eway')),
                    ],
                  ),
                  _DrawerItem(
                    icon: Icons.savings_outlined,
                    label: 'Budgets',
                    onTap: () => _navigate(context, '/budgets'),
                  ),
                  _DrawerItem(
                    icon: Icons.business_outlined,
                    label: 'Branches',
                    onTap: () => _navigate(context, '/branches'),
                  ),
                  _DrawerItem(
                    icon: Icons.shopping_bag_outlined,
                    label: 'E-Commerce',
                    onTap: () => _navigate(context, '/ecommerce'),
                  ),
                  _DrawerItem(
                    icon: Icons.chat_outlined,
                    label: 'WhatsApp',
                    onTap: () => _navigate(context, '/whatsapp'),
                  ),
                  _DrawerItem(
                    icon: Icons.auto_awesome_outlined,
                    label: 'AI Insights',
                    onTap: () => _navigate(context, '/ai'),
                  ),
                  _DrawerItem(
                    icon: Icons.assignment_ind_outlined,
                    label: 'CA Portal',
                    onTap: () => _navigate(context, '/ca-portal'),
                  ),
                  const Divider(height: 1),
                  _DrawerItem(
                    icon: Icons.settings_outlined,
                    label: 'Settings',
                    onTap: () => _navigate(context, '/settings'),
                  ),
                  _DrawerItem(
                    icon: Icons.credit_card_outlined,
                    label: 'Billing',
                    onTap: () => _navigate(context, '/billing'),
                  ),
                  _DrawerItem(
                    icon: Icons.person_outline,
                    label: 'Profile',
                    onTap: () => _navigate(context, '/profile'),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: OutlinedButton.icon(
                      onPressed: onLogout,
                      icon: const Icon(Icons.logout, size: 18),
                      label: const Text('Logout'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: BorderSide(color: AppColors.red.withOpacity(0.3)),
                        minimumSize: const Size(double.infinity, 44),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, String route) {
    Navigator.of(context).pop(); // close drawer
    context.go(route);
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22, color: AppColors.inkLight),
      title: Text(
        label,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),
      dense: true,
      visualDensity: const VisualDensity(vertical: -2),
      onTap: onTap,
    );
  }
}

class _DrawerExpansion extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Widget> children;

  const _DrawerExpansion({
    required this.icon,
    required this.label,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      leading: Icon(icon, size: 22, color: AppColors.inkLight),
      title: Text(
        label,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),
      dense: true,
      visualDensity: const VisualDensity(vertical: -2),
      tilePadding: const EdgeInsets.symmetric(horizontal: 16),
      childrenPadding: const EdgeInsets.only(left: 24),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}

class _DrawerSubItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _DrawerSubItem({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(
        label,
        style: const TextStyle(fontSize: 13, color: AppColors.inkLight),
      ),
      dense: true,
      visualDensity: const VisualDensity(vertical: -3),
      contentPadding: const EdgeInsets.only(left: 36),
      onTap: onTap,
    );
  }
}
