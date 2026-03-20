import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

class BankReconciliationScreen extends ConsumerStatefulWidget {
  const BankReconciliationScreen({super.key});

  @override
  ConsumerState<BankReconciliationScreen> createState() => _BankReconciliationScreenState();
}

class _BankReconciliationScreenState extends ConsumerState<BankReconciliationScreen> {
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _unreconciledTx = [];
  bool _loading = true;
  bool _autoMatching = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('${Endpoints.reconciliation}/summary'),
        api.get('/bank/transactions/unreconciled'),
      ]);

      final summaryData = results[0]['data'] ?? results[0];
      final txData = results[1]['data'] ?? results[1];

      setState(() {
        _summary = summaryData is Map<String, dynamic> ? summaryData : {};
        _unreconciledTx = List<Map<String, dynamic>>.from(
          txData is List ? txData : txData['items'] ?? txData['transactions'] ?? [],
        );
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _reconcileTransaction(String id) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/bank/transactions/$id/reconcile');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction reconciled')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to reconcile: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _autoMatch() async {
    setState(() => _autoMatching = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post(
        '${Endpoints.reconciliation}/auto-match',
        data: {'date_tolerance': 3, 'amount_tolerance': 0},
      );
      final data = res['data'] ?? res;
      final matchedCount = data['matched'] ?? data['matched_count'] ?? data['matchedCount'] ?? 0;

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Auto-match complete: $matchedCount transactions matched'),
            backgroundColor: AppColors.green,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Auto-match failed: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _autoMatching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Reconciliation'),
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
                  _buildSummarySection(),
                  const SizedBox(height: 16),
                  _buildProgressBar(),
                  const SizedBox(height: 20),
                  _buildSectionHeader(),
                  const SizedBox(height: 12),
                  if (_unreconciledTx.isEmpty)
                    _buildAllReconciledState()
                  else
                    ..._unreconciledTx.map(_buildUnreconciledCard),
                ],
              ),
            ),
      floatingActionButton: _unreconciledTx.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _autoMatching ? null : _autoMatch,
              backgroundColor: _autoMatching ? AppColors.muted : AppColors.navy,
              foregroundColor: AppColors.white,
              icon: _autoMatching
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_fix_high),
              label: Text(_autoMatching ? 'Matching...' : 'Auto Match'),
            )
          : null,
    );
  }

  Widget _buildSummarySection() {
    final total = (_summary['total'] ?? _summary['total_transactions'] ?? _summary['totalTransactions'] ?? 0);
    final reconciled = (_summary['reconciled'] ?? _summary['reconciled_count'] ?? _summary['reconciledCount'] ?? 0);
    final unreconciled = (_summary['unreconciled'] ?? _summary['unreconciled_count'] ?? _summary['unreconciledCount'] ?? 0);
    final percentage = (_summary['percentage'] ?? _summary['reconciled_percentage'] ?? _summary['reconciledPercentage'] ?? 0).toDouble();

    return Row(
      children: [
        Expanded(child: _buildStatCard('Total', total.toString(), AppColors.navy, Icons.receipt_long_outlined)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Reconciled', reconciled.toString(), AppColors.green, Icons.check_circle_outline)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Unreconciled', unreconciled.toString(), AppColors.amber, Icons.pending_outlined)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Match %', '${percentage.toStringAsFixed(1)}%', AppColors.blue, Icons.pie_chart_outline)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color accent, IconData icon) {
    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: accent),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(color: accent, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(color: AppColors.muted, fontSize: 10, fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar() {
    final percentage = (_summary['percentage'] ?? _summary['reconciled_percentage'] ?? _summary['reconciledPercentage'] ?? 0).toDouble();
    final fraction = (percentage / 100).clamp(0.0, 1.0);

    Color barColor;
    if (percentage >= 80) {
      barColor = AppColors.green;
    } else if (percentage >= 50) {
      barColor = AppColors.amber;
    } else {
      barColor = AppColors.red;
    }

    return Card(
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Reconciliation Progress',
                  style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                ),
                Text(
                  '${percentage.toStringAsFixed(1)}%',
                  style: TextStyle(color: barColor, fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 10,
                backgroundColor: AppColors.borderLight,
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader() {
    return Row(
      children: [
        Text(
          'Unreconciled Transactions',
          style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(width: 8),
        if (_unreconciledTx.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.amber.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${_unreconciledTx.length}',
              style: TextStyle(color: AppColors.amber, fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
      ],
    );
  }

  Widget _buildAllReconciledState() {
    return Padding(
      padding: const EdgeInsets.only(top: 48),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.celebration_outlined, size: 64, color: AppColors.green.withOpacity(0.6)),
            const SizedBox(height: 16),
            Text(
              'All caught up!',
              style: TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'All transactions have been reconciled.',
              style: TextStyle(color: AppColors.muted, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnreconciledCard(Map<String, dynamic> tx) {
    final id = tx['id']?.toString() ?? '';
    final date = tx['date'] ?? tx['transaction_date'] ?? tx['transactionDate'] ?? tx['createdAt'] ?? '';
    final description = tx['description'] ?? tx['narration'] ?? '-';
    final amount = (tx['amount'] ?? 0).toDouble();
    final type = (tx['type'] ?? tx['transaction_type'] ?? tx['transactionType'] ?? 'debit').toString().toLowerCase();
    final isCredit = type == 'credit' || type == 'deposit' || type == 'cr';

    return Dismissible(
      key: Key(id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        if (id.isEmpty) return false;
        await _reconcileTransaction(id);
        return false; // we reload data, so don't remove from list
      },
      background: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.green,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: AppColors.white, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Reconcile',
              style: TextStyle(color: AppColors.white, fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        elevation: 0,
        color: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: id.isNotEmpty ? () => _showReconcileConfirmation(id, description.toString(), amount, isCredit) : null,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: (isCredit ? AppColors.green : AppColors.red).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                    size: 18,
                    color: isCredit ? AppColors.green : AppColors.red,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        description.toString(),
                        style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            formatDate(date.toString()),
                            style: TextStyle(color: AppColors.muted, fontSize: 12),
                          ),
                          Text(' \u2022 ', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: (isCredit ? AppColors.green : AppColors.red).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isCredit ? 'Credit' : 'Debit',
                              style: TextStyle(
                                color: isCredit ? AppColors.green : AppColors.red,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${isCredit ? '+' : '-'} ${formatINR(amount.abs())}',
                  style: TextStyle(
                    color: isCredit ? AppColors.green : AppColors.red,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showReconcileConfirmation(String id, String description, double amount, bool isCredit) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Reconcile Transaction?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(description, style: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Text(
              '${isCredit ? '+' : '-'} ${formatINR(amount.abs())}',
              style: TextStyle(
                color: isCredit ? AppColors.green : AppColors.red,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Mark this transaction as reconciled?',
              style: TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppColors.muted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _reconcileTransaction(id);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: AppColors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              elevation: 0,
            ),
            child: const Text('Reconcile'),
          ),
        ],
      ),
    );
  }
}
