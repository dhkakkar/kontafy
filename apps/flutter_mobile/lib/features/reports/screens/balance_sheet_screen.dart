import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

class BalanceSheetScreen extends ConsumerStatefulWidget {
  const BalanceSheetScreen({super.key});

  @override
  ConsumerState<BalanceSheetScreen> createState() => _BalanceSheetScreenState();
}

class _BalanceSheetScreenState extends ConsumerState<BalanceSheetScreen> {
  DateTime _asOfDate = DateTime.now();
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> _assets = [];
  List<Map<String, dynamic>> _liabilities = [];
  List<Map<String, dynamic>> _equity = [];
  num _totalAssets = 0;
  num _totalLiabilities = 0;
  num _totalEquity = 0;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final dateStr = DateFormat('yyyy-MM-dd').format(_asOfDate);
      final res = await api.get(
        '/books/reports/balance-sheet',
        queryParameters: {'as_of': dateStr},
      );
      final data = res['data'] ?? res;

      final assets = List<Map<String, dynamic>>.from(
        data['assets'] ?? data['assetAccounts'] ?? data['asset_accounts'] ?? [],
      );
      final liabilities = List<Map<String, dynamic>>.from(
        data['liabilities'] ?? data['liabilityAccounts'] ?? data['liability_accounts'] ?? [],
      );
      final equity = List<Map<String, dynamic>>.from(
        data['equity'] ?? data['equityAccounts'] ?? data['equity_accounts'] ?? [],
      );

      num sumAssets = 0;
      for (final a in assets) {
        sumAssets += (a['amount'] ?? a['total'] ?? a['balance'] ?? 0) as num;
      }
      num sumLiabilities = 0;
      for (final a in liabilities) {
        sumLiabilities += (a['amount'] ?? a['total'] ?? a['balance'] ?? 0) as num;
      }
      num sumEquity = 0;
      for (final a in equity) {
        sumEquity += (a['amount'] ?? a['total'] ?? a['balance'] ?? 0) as num;
      }

      setState(() {
        _assets = assets;
        _liabilities = liabilities;
        _equity = equity;
        _totalAssets = data['totalAssets'] ?? data['total_assets'] ?? sumAssets;
        _totalLiabilities = data['totalLiabilities'] ?? data['total_liabilities'] ?? sumLiabilities;
        _totalEquity = data['totalEquity'] ?? data['total_equity'] ?? sumEquity;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _asOfDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _asOfDate) {
      setState(() => _asOfDate = picked);
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Balance Sheet')),
      body: Column(
        children: [
          // Filter bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.white,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                const Text(
                  'As of:',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.muted),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.calendar_today, size: 16, color: AppColors.navy),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat('dd MMM yyyy').format(_asOfDate),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.ink),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, color: AppColors.navy),
                  onPressed: _fetchData,
                  tooltip: 'Refresh',
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppColors.muted),
                            const SizedBox(height: 12),
                            const Text('Failed to load report', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.ink)),
                            const SizedBox(height: 4),
                            Text(_error!, style: const TextStyle(fontSize: 13, color: AppColors.muted), textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchData,
                        child: _buildContent(),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionCard(
          title: 'Assets',
          total: _totalAssets,
          accounts: _assets,
          icon: Icons.account_balance_wallet_outlined,
          color: AppColors.blue,
        ),
        const SizedBox(height: 12),
        _buildSectionCard(
          title: 'Liabilities',
          total: _totalLiabilities,
          accounts: _liabilities,
          icon: Icons.credit_card_outlined,
          color: AppColors.red,
        ),
        const SizedBox(height: 12),
        _buildSectionCard(
          title: 'Equity',
          total: _totalEquity,
          accounts: _equity,
          icon: Icons.pie_chart_outline,
          color: AppColors.purple,
        ),
      ],
    );
  }

  Widget _buildSectionCard({
    required String title,
    required num total,
    required List<Map<String, dynamic>> accounts,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: color.withOpacity(0.06),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 18, color: color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
                Text(
                  formatINR(total),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ],
            ),
          ),

          // Account rows
          if (accounts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('No accounts found', style: TextStyle(fontSize: 13, color: AppColors.muted)),
            )
          else
            ...accounts.asMap().entries.map((entry) {
              final account = entry.value;
              final isLast = entry.key == accounts.length - 1;
              final name = account['name'] ?? account['account_name'] ?? account['accountName'] ?? '';
              final amount = (account['amount'] ?? account['total'] ?? account['balance'] ?? 0) as num;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  border: isLast
                      ? null
                      : const Border(bottom: BorderSide(color: AppColors.borderLight)),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$name',
                        style: const TextStyle(fontSize: 13, color: AppColors.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      formatINR(amount),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.ink),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
