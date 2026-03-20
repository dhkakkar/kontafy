import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class TaxDashboardScreen extends ConsumerStatefulWidget {
  const TaxDashboardScreen({super.key});
  @override
  ConsumerState<TaxDashboardScreen> createState() => _TaxDashboardScreenState();
}

class _TaxDashboardScreenState extends ConsumerState<TaxDashboardScreen> {
  List<Map<String, dynamic>> _recentReturns = [];
  bool _loading = true;
  Map<String, dynamic> _liability = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/tax/gst/returns', queryParameters: {'limit': 5});
      final data = res['data'] ?? res;
      setState(() {
        if (data is Map<String, dynamic>) {
          _recentReturns = List<Map<String, dynamic>>.from(data['returns'] ?? data['items'] ?? []);
          _liability = Map<String, dynamic>.from(data['liability'] ?? data['summary'] ?? {});
        } else if (data is List) {
          _recentReturns = List<Map<String, dynamic>>.from(data);
        }
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _computeReturn(String returnType) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Computing...')),
    );
    try {
      final api = ref.read(apiClientProvider);
      final now = DateTime.now();
      await api.post('/tax/gst/returns/compute', data: {
        'return_type': returnType,
        'month': now.month,
        'year': now.year,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$returnType computed successfully')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to compute: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Tax & GST'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Net Tax Liability Cards
                  _buildLiabilityCards(),
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
                        child: _buildActionButton(
                          'Compute GSTR-1',
                          Icons.calculate_outlined,
                          AppColors.blue,
                          () => _computeReturn('GSTR1'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildActionButton(
                          'Compute GSTR-3B',
                          Icons.calculate_outlined,
                          AppColors.purple,
                          () => _computeReturn('GSTR3B'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Recent Returns
                  Text(
                    'Recent Returns',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_recentReturns.isEmpty)
                    _buildEmptyState()
                  else
                    ..._recentReturns.map(_buildReturnCard),
                  const SizedBox(height: 24),

                  // Navigation Cards
                  Text(
                    'Explore',
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
                        child: _buildNavCard(
                          'GST Returns',
                          Icons.receipt_long_outlined,
                          AppColors.blue,
                          () => context.push('/tax/gst'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildNavCard(
                          'TDS',
                          Icons.receipt_outlined,
                          AppColors.purple,
                          () => context.push('/tax/tds'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildLiabilityCards() {
    final cgst = (_liability['cgst'] ?? 0).toDouble();
    final sgst = (_liability['sgst'] ?? 0).toDouble();
    final igst = (_liability['igst'] ?? 0).toDouble();
    final total = (_liability['total'] ?? (cgst + sgst + igst)).toDouble();

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _buildLiabilityCard('CGST', cgst),
        _buildLiabilityCard('SGST', sgst),
        _buildLiabilityCard('IGST', igst),
        _buildLiabilityCard('Total', total),
      ],
    );
  }

  Widget _buildLiabilityCard(String label, double amount) {
    final isCredit = amount <= 0;
    final displayColor = isCredit ? AppColors.green : AppColors.red;
    final subtitle = isCredit ? 'Credit' : 'Payable';

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 6),
            Text(
              formatINR(amount.abs()),
              style: TextStyle(color: displayColor, fontSize: 15, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(color: displayColor.withOpacity(0.7), fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, Color color, VoidCallback onTap) {
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

  Widget _buildReturnCard(Map<String, dynamic> ret) {
    final returnType = (ret['return_type'] ?? ret['returnType'] ?? '-').toString();
    final period = (ret['period'] ?? ret['tax_period'] ?? '-').toString();
    final status = (ret['status'] ?? 'draft').toString().toLowerCase();
    final filedAt = ret['filed_at'] ?? ret['filedAt'] ?? '';
    final arn = ret['arn'] ?? ret['ARN'] ?? '';

    Color statusColor;
    switch (status) {
      case 'draft':
        statusColor = AppColors.amber;
        break;
      case 'computed':
        statusColor = AppColors.blue;
        break;
      case 'filed':
        statusColor = AppColors.green;
        break;
      default:
        statusColor = AppColors.muted;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    returnType,
                    style: TextStyle(
                      color: AppColors.navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  period,
                  style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const Spacer(),
                StatusBadge(status: status),
              ],
            ),
            if (filedAt.toString().isNotEmpty || arn.toString().isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (filedAt.toString().isNotEmpty) ...[
                    Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.muted),
                    const SizedBox(width: 4),
                    Text(
                      formatDate(filedAt.toString()),
                      style: TextStyle(color: AppColors.muted, fontSize: 13),
                    ),
                  ],
                  const Spacer(),
                  if (arn.toString().isNotEmpty)
                    Text(
                      'ARN: $arn',
                      style: TextStyle(color: AppColors.muted, fontSize: 12, fontFamily: 'monospace'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNavCard(String title, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        elevation: 0,
        color: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Icon(Icons.arrow_forward, size: 16, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
          const SizedBox(height: 16),
          Text('No returns found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
        ],
      ),
    );
  }
}
