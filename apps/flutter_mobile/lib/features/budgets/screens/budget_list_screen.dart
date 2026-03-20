import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class BudgetListScreen extends ConsumerStatefulWidget {
  const BudgetListScreen({super.key});
  @override
  ConsumerState<BudgetListScreen> createState() => _BudgetListScreenState();
}

class _BudgetListScreenState extends ConsumerState<BudgetListScreen> {
  List<Map<String, dynamic>> _items = [];
  Map<String, dynamic> _summary = {};
  bool _loading = true;
  String _filter = 'all';

  static const _filters = ['all', 'draft', 'active', 'closed'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{};
      if (_filter != 'all') params['status'] = _filter;

      final futures = await Future.wait([
        api.get('/budgets', queryParameters: params),
        api.get('/budgets/summary'),
      ]);

      final listRes = futures[0];
      final summaryRes = futures[1];

      final listData = listRes['data'] ?? listRes;
      final summaryData = summaryRes['data'] ?? summaryRes;

      setState(() {
        _items = List<Map<String, dynamic>>.from(listData is List ? listData : []);
        _summary = summaryData is Map<String, dynamic> ? summaryData : {};
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _onFilterChanged(String filter) {
    if (_filter == filter) return;
    setState(() => _filter = filter);
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Budgets'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final f = _filters[i];
                  final selected = _filter == f;
                  return FilterChip(
                    label: Text(
                      f[0].toUpperCase() + f.substring(1),
                      style: TextStyle(
                        color: selected ? AppColors.white : AppColors.ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    selected: selected,
                    onSelected: (_) => _onFilterChanged(f),
                    backgroundColor: AppColors.surface,
                    selectedColor: AppColors.navy,
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    side: BorderSide(color: selected ? AppColors.navy : AppColors.border),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                },
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          // Content
          Expanded(child: _buildContent()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Coming soon')),
          );
        },
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Budget'),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_items.isEmpty && _summary.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.savings_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No budgets found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary cards
          _buildSummaryCards(),
          const SizedBox(height: 16),
          // Budget list
          ..._items.map(_buildBudgetCard),
          if (_items.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 32),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.savings_outlined, size: 48, color: AppColors.muted.withOpacity(0.4)),
                    const SizedBox(height: 12),
                    Text('No budgets found', style: TextStyle(color: AppColors.muted, fontSize: 14)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final totalBudgeted = (_summary['total_budgeted'] ?? _summary['totalBudgeted'] ?? 0).toDouble();
    final totalActual = (_summary['total_actual'] ?? _summary['totalActual'] ?? 0).toDouble();
    final variance = (_summary['variance'] ?? (totalBudgeted - totalActual)).toDouble();
    final activeBudgets = (_summary['active_budgets'] ?? _summary['activeBudgets'] ?? _summary['active_count'] ?? 0).toInt();

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: [
        _buildSummaryCard('Total Budgeted', formatINR(totalBudgeted), AppColors.blue),
        _buildSummaryCard('Total Actual', formatINR(totalActual), AppColors.navy),
        _buildSummaryCard('Variance', formatINR(variance), variance >= 0 ? AppColors.green : AppColors.red),
        _buildSummaryCard('Active Budgets', activeBudgets.toString(), AppColors.purple),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value, Color accent) {
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
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: TextStyle(color: AppColors.muted, fontSize: 11, fontWeight: FontWeight.w500)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(color: accent, fontSize: 14, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetCard(Map<String, dynamic> budget) {
    final name = (budget['name'] ?? '-').toString();
    final fiscalYear = (budget['fiscal_year'] ?? budget['fiscalYear'] ?? '-').toString();
    final periodType = (budget['period_type'] ?? budget['periodType'] ?? '-').toString();
    final totalAmount = (budget['total_amount'] ?? budget['totalAmount'] ?? budget['budgeted'] ?? 0).toDouble();
    final actualAmount = (budget['actual_amount'] ?? budget['actualAmount'] ?? budget['actual'] ?? 0).toDouble();
    final status = (budget['status'] ?? 'draft').toString().toLowerCase();

    final utilization = totalAmount > 0 ? (actualAmount / totalAmount) : 0.0;
    final utilizationPercent = (utilization * 100).clamp(0.0, 999.0);

    Color progressColor;
    if (utilizationPercent > 100) {
      progressColor = AppColors.red;
    } else if (utilizationPercent >= 80) {
      progressColor = AppColors.amber;
    } else {
      progressColor = AppColors.green;
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
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      color: AppColors.ink,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.blueLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    fiscalYear,
                    style: TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.purpleLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    periodType,
                    style: TextStyle(color: AppColors.purple, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
                const Spacer(),
                Text(
                  formatINR(totalAmount),
                  style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Utilization progress bar
            Row(
              children: [
                Text(
                  'Utilization',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const Spacer(),
                Text(
                  '${utilizationPercent.toStringAsFixed(1)}%',
                  style: TextStyle(
                    color: progressColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: utilization.clamp(0.0, 1.0).toDouble(),
                backgroundColor: AppColors.borderLight,
                color: progressColor,
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Actual: ${formatINR(actualAmount)}',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                Text(
                  'Budget: ${formatINR(totalAmount)}',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
