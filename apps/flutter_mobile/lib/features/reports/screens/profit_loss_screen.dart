import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

DateTime _fyStart() {
  final now = DateTime.now();
  return now.month >= 4 ? DateTime(now.year, 4, 1) : DateTime(now.year - 1, 4, 1);
}

DateTime _fyEnd() {
  final now = DateTime.now();
  return now.month >= 4 ? DateTime(now.year + 1, 3, 31) : DateTime(now.year, 3, 31);
}

class ProfitLossScreen extends ConsumerStatefulWidget {
  const ProfitLossScreen({super.key});

  @override
  ConsumerState<ProfitLossScreen> createState() => _ProfitLossScreenState();
}

class _ProfitLossScreenState extends ConsumerState<ProfitLossScreen> {
  DateTime _startDate = _fyStart();
  DateTime _endDate = _fyEnd();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _incomeAccounts = [];
  List<Map<String, dynamic>> _expenseAccounts = [];
  num _totalIncome = 0;
  num _totalExpenses = 0;
  num _netProfitLoss = 0;

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
      final res = await api.get(
        '/books/reports/profit-loss',
        queryParameters: {
          'start_date': DateFormat('yyyy-MM-dd').format(_startDate),
          'end_date': DateFormat('yyyy-MM-dd').format(_endDate),
        },
      );
      final data = res['data'] ?? res;
      final income = List<Map<String, dynamic>>.from(
        data['income'] ?? data['incomeAccounts'] ?? data['income_accounts'] ?? [],
      );
      final expenses = List<Map<String, dynamic>>.from(
        data['expenses'] ?? data['expenseAccounts'] ?? data['expense_accounts'] ?? [],
      );

      num totalInc = 0;
      for (final a in income) {
        totalInc += (a['amount'] ?? a['total'] ?? a['balance'] ?? 0) as num;
      }
      num totalExp = 0;
      for (final a in expenses) {
        totalExp += (a['amount'] ?? a['total'] ?? a['balance'] ?? 0) as num;
      }

      setState(() {
        _incomeAccounts = income;
        _expenseAccounts = expenses;
        _totalIncome = data['totalIncome'] ?? data['total_income'] ?? totalInc;
        _totalExpenses = data['totalExpenses'] ?? data['total_expenses'] ?? totalExp;
        _netProfitLoss = data['netProfitLoss'] ?? data['net_profit_loss'] ?? data['netProfit'] ?? data['net_profit'] ?? (_totalIncome - _totalExpenses);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: _endDate,
    );
    if (picked != null && picked != _startDate) {
      setState(() => _startDate = picked);
      _fetchData();
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _endDate) {
      setState(() => _endDate = picked);
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profit & Loss')),
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
                Expanded(child: _dateButton('From', _startDate, _pickStartDate)),
                const SizedBox(width: 10),
                Expanded(child: _dateButton('To', _endDate, _pickEndDate)),
                const SizedBox(width: 8),
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
                            const Text(
                              'Failed to load report',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.ink),
                            ),
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

  Widget _dateButton(String label, DateTime date, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Text(
              '$label: ',
              style: const TextStyle(fontSize: 12, color: AppColors.muted),
            ),
            const Icon(Icons.calendar_today, size: 14, color: AppColors.navy),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                DateFormat('dd MMM yy').format(date),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.ink),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Income section
        _buildSection(
          title: 'Income',
          total: _totalIncome,
          accounts: _incomeAccounts,
          color: AppColors.green,
        ),
        const SizedBox(height: 16),

        // Expenses section
        _buildSection(
          title: 'Expenses',
          total: _totalExpenses,
          accounts: _expenseAccounts,
          color: AppColors.red,
        ),
        const SizedBox(height: 20),

        // Net Profit / Loss
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _netProfitLoss >= 0
                ? AppColors.green.withOpacity(0.06)
                : AppColors.red.withOpacity(0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _netProfitLoss >= 0
                  ? AppColors.green.withOpacity(0.3)
                  : AppColors.red.withOpacity(0.3),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _netProfitLoss >= 0 ? 'Net Profit' : 'Net Loss',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatINR(_netProfitLoss.abs()),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: _netProfitLoss >= 0 ? AppColors.green : AppColors.red,
                    ),
                  ),
                ],
              ),
              Icon(
                _netProfitLoss >= 0 ? Icons.trending_up : Icons.trending_down,
                size: 40,
                color: (_netProfitLoss >= 0 ? AppColors.green : AppColors.red).withOpacity(0.4),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSection({
    required String title,
    required num total,
    required List<Map<String, dynamic>> accounts,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // Section header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.06),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                Text(
                  formatINR(total),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ],
            ),
          ),

          // Sub-account rows
          if (accounts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No accounts found',
                style: TextStyle(fontSize: 13, color: AppColors.muted),
              ),
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
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '$name',
                        style: const TextStyle(fontSize: 13, color: AppColors.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      formatINR(amount),
                      style: const TextStyle(fontSize: 13, color: AppColors.ink),
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
