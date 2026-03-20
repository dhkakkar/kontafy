import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

class TrialBalanceScreen extends ConsumerStatefulWidget {
  const TrialBalanceScreen({super.key});

  @override
  ConsumerState<TrialBalanceScreen> createState() => _TrialBalanceScreenState();
}

class _TrialBalanceScreenState extends ConsumerState<TrialBalanceScreen> {
  DateTime _asOfDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _rows = [];
  num _totalDebit = 0;
  num _totalCredit = 0;

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
        '/books/reports/trial-balance',
        queryParameters: {'as_of': dateStr},
      );
      final data = res['data'] ?? res;
      final List<dynamic> accounts = data['accounts'] ?? data['rows'] ?? (data is List ? data : []);
      num totalDebit = 0;
      num totalCredit = 0;
      final rows = <Map<String, dynamic>>[];
      for (final row in accounts) {
        final debit = (row['debit'] ?? 0) as num;
        final credit = (row['credit'] ?? 0) as num;
        totalDebit += debit;
        totalCredit += credit;
        rows.add(Map<String, dynamic>.from(row));
      }
      setState(() {
        _rows = rows;
        _totalDebit = data['totalDebit'] ?? data['total_debit'] ?? totalDebit;
        _totalCredit = data['totalCredit'] ?? data['total_credit'] ?? totalCredit;
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
      appBar: AppBar(title: const Text('Trial Balance')),
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
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.muted,
                  ),
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
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: AppColors.ink,
                          ),
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
                            Text(
                              'Failed to load report',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: AppColors.ink,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _error!,
                              style: const TextStyle(fontSize: 13, color: AppColors.muted),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _fetchData,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _rows.isEmpty
                        ? const Center(
                            child: Text(
                              'No data available',
                              style: TextStyle(fontSize: 15, color: AppColors.muted),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchData,
                            child: _buildTable(),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildTable() {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.navy,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(8),
              topRight: Radius.circular(8),
            ),
          ),
          child: const Row(
            children: [
              SizedBox(
                width: 60,
                child: Text(
                  'Code',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  'Account Name',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                ),
              ),
              SizedBox(
                width: 90,
                child: Text(
                  'Debit',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
              SizedBox(
                width: 90,
                child: Text(
                  'Credit',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.white,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
        ),

        // Data rows
        ...List.generate(_rows.length, (index) {
          final row = _rows[index];
          final code = row['code'] ?? row['account_code'] ?? row['accountCode'] ?? '';
          final name = row['name'] ?? row['account_name'] ?? row['accountName'] ?? '';
          final debit = (row['debit'] ?? 0) as num;
          final credit = (row['credit'] ?? 0) as num;
          final isEven = index % 2 == 0;

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isEven ? AppColors.surface : AppColors.white,
              border: Border(
                bottom: BorderSide(color: AppColors.border.withOpacity(0.5)),
              ),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 60,
                  child: Text(
                    '$code',
                    style: const TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: AppColors.muted,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    '$name',
                    style: const TextStyle(fontSize: 13, color: AppColors.ink),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                SizedBox(
                  width: 90,
                  child: Text(
                    debit > 0 ? formatINR(debit) : '-',
                    style: const TextStyle(fontSize: 12, color: AppColors.ink),
                    textAlign: TextAlign.right,
                  ),
                ),
                SizedBox(
                  width: 90,
                  child: Text(
                    credit > 0 ? formatINR(credit) : '-',
                    style: const TextStyle(fontSize: 12, color: AppColors.ink),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }),

        // Footer totals
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.navy.withOpacity(0.05),
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(8),
              bottomRight: Radius.circular(8),
            ),
            border: const Border(
              top: BorderSide(color: AppColors.navy, width: 2),
            ),
          ),
          child: Row(
            children: [
              const SizedBox(width: 60),
              const Expanded(
                child: Text(
                  'Total',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ),
              SizedBox(
                width: 90,
                child: Text(
                  formatINR(_totalDebit),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
              SizedBox(
                width: 90,
                child: Text(
                  formatINR(_totalCredit),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
