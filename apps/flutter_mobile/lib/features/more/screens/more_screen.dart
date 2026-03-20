import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/providers/auth_provider.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final org = authState.currentOrg;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // User card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.navy,
                  backgroundImage: user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty
                      ? NetworkImage(user.avatarUrl!)
                      : null,
                  child: user?.avatarUrl == null || user!.avatarUrl!.isEmpty
                      ? Text(
                          user?.initials ?? 'U',
                          style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.bold, fontSize: 18),
                        )
                      : null,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'User',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        org?.name ?? 'Organization',
                        style: TextStyle(color: AppColors.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => context.push('/profile'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Modules
        _SectionHeader(title: 'Modules'),
        Card(
          child: Column(
            children: [
              _MoreTile(icon: Icons.inventory_2_outlined, label: 'Inventory', onTap: () => context.push('/inventory/products')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.account_balance_outlined, label: 'Banking', onTap: () => context.push('/banking/accounts')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.menu_book_outlined, label: 'Books', onTap: () => context.push('/books/accounts')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.bar_chart_outlined, label: 'Reports', onTap: () => context.push('/reports')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.calculate_outlined, label: 'Tax & GST', onTap: () => context.push('/tax/gst')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.verified_outlined, label: 'E-Invoice', onTap: () => context.push('/einvoice/generate')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.savings_outlined, label: 'Budgets', onTap: () => context.push('/budgets')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.business_outlined, label: 'Branches', onTap: () => context.push('/branches')),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Tools
        _SectionHeader(title: 'Tools'),
        Card(
          child: Column(
            children: [
              _MoreTile(icon: Icons.shopping_bag_outlined, label: 'E-Commerce', onTap: () => context.push('/ecommerce')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.chat_outlined, label: 'WhatsApp', onTap: () => context.push('/whatsapp')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.auto_awesome_outlined, label: 'AI Insights', onTap: () => context.push('/ai')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.assignment_ind_outlined, label: 'CA Portal', onTap: () => context.push('/ca-portal')),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Account
        _SectionHeader(title: 'Account'),
        Card(
          child: Column(
            children: [
              _MoreTile(icon: Icons.settings_outlined, label: 'Settings', onTap: () => context.push('/settings')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.credit_card_outlined, label: 'Billing', onTap: () => context.push('/billing')),
              const Divider(height: 1, indent: 60),
              _MoreTile(icon: Icons.person_outline, label: 'Profile', onTap: () => context.push('/profile')),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Logout
        OutlinedButton.icon(
          onPressed: () {
            ref.read(authProvider.notifier).logout();
            context.go('/login');
          },
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Logout'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.red,
            side: BorderSide(color: AppColors.red.withOpacity(0.3)),
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.muted,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _MoreTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.navy.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 20, color: AppColors.navy),
      ),
      title: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.muted, size: 20),
      onTap: onTap,
    );
  }
}
