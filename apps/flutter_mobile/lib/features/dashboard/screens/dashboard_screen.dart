import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../widgets/stat_card.dart';

// Dashboard data model
class _DashboardStats {
  final num totalRevenue;
  final num outstandingReceivables;
  final num totalExpenses;
  final num netProfit;
  final List<Map<String, dynamic>> recentInvoices;

  _DashboardStats({
    required this.totalRevenue,
    required this.outstandingReceivables,
    required this.totalExpenses,
    required this.netProfit,
    required this.recentInvoices,
  });

  factory _DashboardStats.fromJson(Map<String, dynamic> json) {
    return _DashboardStats(
      totalRevenue: json['totalRevenue'] ?? json['total_revenue'] ?? 0,
      outstandingReceivables: json['outstandingReceivables'] ?? json['outstanding_receivables'] ?? 0,
      totalExpenses: json['totalExpenses'] ?? json['total_expenses'] ?? 0,
      netProfit: json['netProfit'] ?? json['net_profit'] ?? 0,
      recentInvoices: List<Map<String, dynamic>>.from(json['recentInvoices'] ?? json['recent_invoices'] ?? []),
    );
  }
}

// Dashboard provider
final dashboardStatsProvider = FutureProvider.autoDispose<_DashboardStats>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(Endpoints.dashboardStats);
  final data = res['data'] ?? res;
  return _DashboardStats.fromJson(data);
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardStatsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(dashboardStatsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // KPI Cards
          statsAsync.when(
            data: (stats) => _buildStatsGrid(stats),
            loading: () => _buildShimmerGrid(),
            error: (e, _) => _buildStatsGrid(_DashboardStats(
              totalRevenue: 0,
              outstandingReceivables: 0,
              totalExpenses: 0,
              netProfit: 0,
              recentInvoices: [],
            )),
          ),
          const SizedBox(height: 20),

          // Quick Actions
          Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.receipt_long_outlined,
                  label: 'New Invoice',
                  color: AppColors.navy,
                  onTap: () => context.push('/invoices/new'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.person_add_outlined,
                  label: 'New Contact',
                  color: AppColors.green,
                  onTap: () => context.push('/contacts/new'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionButton(
                  icon: Icons.payment_outlined,
                  label: 'Record Payment',
                  color: AppColors.purple,
                  onTap: () => context.push('/payments/new'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Invoices
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Invoices',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ink,
                ),
              ),
              TextButton(
                onPressed: () => context.go('/invoices'),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          statsAsync.when(
            data: (stats) => _buildRecentInvoices(context, stats.recentInvoices),
            loading: () => _buildInvoiceShimmers(),
            error: (e, _) => Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(Icons.cloud_off_outlined, size: 40, color: AppColors.muted),
                    const SizedBox(height: 8),
                    Text(
                      'Unable to load data',
                      style: TextStyle(color: AppColors.muted, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => ref.invalidate(dashboardStatsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(_DashboardStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.35,
      children: [
        StatCard(
          title: 'Total Revenue',
          value: abbreviateINR(stats.totalRevenue),
          icon: Icons.trending_up,
          color: AppColors.green,
          subtitle: 'This financial year',
        ),
        StatCard(
          title: 'Outstanding',
          value: abbreviateINR(stats.outstandingReceivables),
          icon: Icons.account_balance_wallet_outlined,
          color: AppColors.amber,
          subtitle: 'Receivables',
        ),
        StatCard(
          title: 'Total Expenses',
          value: abbreviateINR(stats.totalExpenses),
          icon: Icons.receipt_outlined,
          color: AppColors.red,
          subtitle: 'This financial year',
        ),
        StatCard(
          title: 'Net Profit',
          value: abbreviateINR(stats.netProfit),
          icon: Icons.savings_outlined,
          color: AppColors.blue,
          subtitle: 'Revenue - Expenses',
        ),
      ],
    );
  }

  Widget _buildShimmerGrid() {
    return Shimmer.fromColors(
      baseColor: AppColors.borderLight,
      highlightColor: AppColors.white,
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.35,
        children: List.generate(
          4,
          (_) => Card(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRecentInvoices(BuildContext context, List<Map<String, dynamic>> invoices) {
    if (invoices.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(Icons.receipt_long_outlined, size: 40, color: AppColors.muted),
              const SizedBox(height: 8),
              Text(
                'No invoices yet',
                style: TextStyle(color: AppColors.muted, fontSize: 14),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => context.push('/invoices/new'),
                child: const Text('Create First Invoice'),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Column(
        children: invoices.take(5).map((inv) {
          final number = inv['invoiceNumber'] ?? inv['invoice_number'] ?? inv['number'] ?? '-';
          final customer = inv['customerName'] ?? inv['customer_name'] ?? inv['contact']?['name'] ?? '-';
          final amount = inv['total'] ?? inv['amount'] ?? 0;
          final status = inv['status'] ?? 'draft';
          final date = inv['date'] ?? inv['invoiceDate'] ?? inv['invoice_date'] ?? '';

          return ListTile(
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    '#$number',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
                Text(
                  formatINR(amount),
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
              ],
            ),
            subtitle: Row(
              children: [
                Expanded(
                  child: Text(
                    customer,
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(status: status),
              ],
            ),
            trailing: Text(
              formatDateShort(date),
              style: TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            onTap: () {
              final id = inv['id'];
              if (id != null) context.push('/invoices/$id');
            },
          );
        }).toList(),
      ),
    );
  }

  Widget _buildInvoiceShimmers() {
    return Shimmer.fromColors(
      baseColor: AppColors.borderLight,
      highlightColor: AppColors.white,
      child: Card(
        child: Column(
          children: List.generate(
            5,
            (_) => ListTile(
              title: Container(height: 14, color: AppColors.white),
              subtitle: Container(height: 12, color: AppColors.white, margin: const EdgeInsets.only(top: 6)),
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
