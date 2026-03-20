import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class EInvoiceDashboardScreen extends ConsumerStatefulWidget {
  const EInvoiceDashboardScreen({super.key});
  @override
  ConsumerState<EInvoiceDashboardScreen> createState() => _EInvoiceDashboardScreenState();
}

class _EInvoiceDashboardScreenState extends ConsumerState<EInvoiceDashboardScreen> {
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final futures = await Future.wait([
        api.get('/einvoice/dashboard'),
        api.get('/einvoice/list', queryParameters: {'page': 1, 'limit': 10}),
      ]);

      final statsRes = futures[0];
      final listRes = futures[1];

      final statsData = statsRes['data'] ?? statsRes;
      final listData = listRes['data'] ?? listRes;

      setState(() {
        _stats = statsData is Map<String, dynamic> ? statsData : {};
        _items = List<Map<String, dynamic>>.from(listData is List ? listData : []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('E-Invoice'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          TextButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Coming soon')),
              );
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Generate'),
            style: TextButton.styleFrom(foregroundColor: AppColors.navy),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stat Cards
                  _buildStatCards(),
                  const SizedBox(height: 20),

                  // Recent E-Invoices
                  Text(
                    'Recent E-Invoices',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_items.isEmpty)
                    _buildEmptyState()
                  else
                    ..._items.map(_buildEInvoiceCard),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCards() {
    final generated = (_stats['generated'] ?? _stats['generated_count'] ?? 0).toInt();
    final pending = (_stats['pending'] ?? _stats['pending_count'] ?? 0).toInt();
    final totalEligible = (_stats['total_eligible'] ?? _stats['totalEligible'] ?? 0).toInt();
    final ewayBills = (_stats['eway_bills'] ?? _stats['ewayBills'] ?? _stats['eway_bill_count'] ?? 0).toInt();

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _buildStatCard('Generated', generated.toString(), AppColors.green, Icons.check_circle_outlined),
        _buildStatCard('Pending', pending.toString(), AppColors.amber, Icons.pending_outlined),
        _buildStatCard('Total Eligible', totalEligible.toString(), AppColors.blue, Icons.description_outlined),
        _buildStatCard('E-Way Bills', ewayBills.toString(), AppColors.purple, Icons.local_shipping_outlined),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, Color color, IconData icon) {
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
            Row(
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEInvoiceCard(Map<String, dynamic> inv) {
    final invoiceNumber = (inv['invoice_number'] ?? inv['invoiceNumber'] ?? '-').toString();
    final contactName = (inv['contact_name'] ?? inv['contactName'] ?? inv['customer_name'] ?? '-').toString();
    final date = (inv['date'] ?? inv['invoice_date'] ?? inv['createdAt'] ?? '').toString();
    final total = (inv['total'] ?? inv['amount'] ?? 0).toDouble();
    final status = (inv['einvoice_status'] ?? inv['einvoiceStatus'] ?? inv['status'] ?? 'pending').toString().toLowerCase();
    final irn = (inv['irn'] ?? inv['IRN'] ?? '').toString();
    final ewayBillNo = (inv['eway_bill_no'] ?? inv['ewayBillNo'] ?? '').toString();

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
                Expanded(
                  child: Text(
                    invoiceNumber,
                    style: TextStyle(
                      color: AppColors.navy,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              contactName,
              style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  formatINR(total),
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(
                  formatDate(date),
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ],
            ),
            if (irn.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    'IRN: ',
                    style: TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  Expanded(
                    child: Text(
                      irn.length > 30 ? '${irn.substring(0, 30)}...' : irn,
                      style: TextStyle(color: AppColors.muted, fontSize: 12, fontFamily: 'monospace'),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            if (ewayBillNo.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.local_shipping_outlined, size: 14, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text(
                    'E-Way: $ewayBillNo',
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(top: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No e-invoices found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      ),
    );
  }
}
