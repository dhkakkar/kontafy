import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});
  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  bool _loading = true;
  Map<String, dynamic> _plan = {};
  Map<String, dynamic> _usage = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final planRes = await api.get('/subscription/current');
      final usageRes = await api.get('/subscription/usage');
      setState(() {
        _plan = (planRes['data'] ?? planRes) as Map<String, dynamic>;
        _usage = (usageRes['data'] ?? usageRes) as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return AppColors.green;
      case 'past_due':
      case 'pastdue':
        return AppColors.red;
      case 'cancelled':
      case 'canceled':
        return AppColors.muted;
      default:
        return AppColors.muted;
    }
  }

  Color _progressColor(double pct) {
    if (pct > 0.9) return AppColors.red;
    if (pct > 0.7) return AppColors.amber;
    return AppColors.green;
  }

  String _formatStorage(num mb) {
    if (mb >= 1024) {
      return '${(mb / 1024).toStringAsFixed(1)} GB';
    }
    return '${mb.toStringAsFixed(0)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Billing'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cancel warning banner
                    if (_plan['cancelAtPeriodEnd'] == true || _plan['cancel_at_period_end'] == true)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.amberLight,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.amber.withOpacity(0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: AppColors.amber, size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Your subscription will be cancelled at the end of the current billing period.',
                                style: TextStyle(color: AppColors.ink, fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Plan Card
                    _buildSectionTitle('Current Plan'),
                    _buildPlanCard(),
                    const SizedBox(height: 20),

                    // Usage Section
                    _buildSectionTitle('Usage'),
                    _buildUsageCard(),
                    const SizedBox(height: 20),

                    // Quick Actions
                    _buildSectionTitle('Quick Actions'),
                    _buildActionsCard(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildPlanCard() {
    final planName = (_plan['planName'] ?? _plan['plan_name'] ?? _plan['name'] ?? 'Free').toString();
    final status = (_plan['status'] ?? 'active').toString().toLowerCase();
    final billingCycle = (_plan['billingCycle'] ?? _plan['billing_cycle'] ?? '').toString();
    final periodEnd = (_plan['currentPeriodEnd'] ?? _plan['current_period_end'] ?? '').toString();
    final statusColor = _statusColor(status);

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.workspace_premium_outlined, color: AppColors.navy, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(planName, style: const TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w700)),
                      if (billingCycle.isNotEmpty)
                        Text(
                          billingCycle[0].toUpperCase() + billingCycle.substring(1),
                          style: const TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status[0].toUpperCase() + status.substring(1),
                    style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (periodEnd.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.muted),
                  const SizedBox(width: 6),
                  Text(
                    'Current period ends: ${formatDate(periodEnd)}',
                    style: const TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUsageCard() {
    final invoices = _usage['invoices'] ?? {};
    final users = _usage['users'] ?? {};
    final storage = _usage['storage'] ?? {};

    final invoiceUsed = (invoices['used'] ?? 0) as num;
    final invoiceLimit = (invoices['limit'] ?? 1) as num;
    final userUsed = (users['used'] ?? 0) as num;
    final userLimit = (users['limit'] ?? 1) as num;
    final storageUsedMb = (storage['usedMb'] ?? storage['used_mb'] ?? storage['used'] ?? 0) as num;
    final storageLimitMb = (storage['limitMb'] ?? storage['limit_mb'] ?? storage['limit'] ?? 1) as num;

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildUsageMeter(
              label: 'Invoices',
              icon: Icons.receipt_long_outlined,
              used: invoiceUsed,
              limit: invoiceLimit,
              formatValue: (v) => v.toInt().toString(),
            ),
            const SizedBox(height: 18),
            _buildUsageMeter(
              label: 'Users',
              icon: Icons.group_outlined,
              used: userUsed,
              limit: userLimit,
              formatValue: (v) => v.toInt().toString(),
            ),
            const SizedBox(height: 18),
            _buildUsageMeter(
              label: 'Storage',
              icon: Icons.cloud_outlined,
              used: storageUsedMb,
              limit: storageLimitMb,
              formatValue: _formatStorage,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageMeter({
    required String label,
    required IconData icon,
    required num used,
    required num limit,
    required String Function(num) formatValue,
  }) {
    final pct = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;
    final color = _progressColor(pct);
    final pctDisplay = (pct * 100).toStringAsFixed(0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.muted),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600)),
            const Spacer(),
            Text(
              '${formatValue(used)} / ${formatValue(limit)}',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
            const SizedBox(width: 8),
            Text('$pctDisplay%', style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct.toDouble(),
            backgroundColor: AppColors.surface,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildActionsCard() {
    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Column(
        children: [
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.navy.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.view_list_outlined, size: 20, color: AppColors.navy),
            ),
            title: const Text('View Plans', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Visit web app to view and compare plans')),
              );
            },
          ),
          const Divider(height: 1, indent: 60),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.navy.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.history_outlined, size: 20, color: AppColors.navy),
            ),
            title: const Text('Billing History', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Visit web app to view billing history')),
              );
            },
          ),
        ],
      ),
    );
  }
}
