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

class GeneralLedgerScreen extends ConsumerStatefulWidget {
  const GeneralLedgerScreen({super.key});

  @override
  ConsumerState<GeneralLedgerScreen> createState() => _GeneralLedgerScreenState();
}

class _GeneralLedgerScreenState extends ConsumerState<GeneralLedgerScreen> {
  DateTime _startDate = _fyStart();
  DateTime _endDate = _fyEnd();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _accounts = [];

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
        '/reports/general-ledger',
        queryParameters: {
          'fromDate': DateFormat('yyyy-MM-dd').format(_startDate),
          'toDate': DateFormat('yyyy-MM-dd').format(_endDate),
        },
      );
      final data = res['data'] ?? res;
      final List<dynamic> accounts = data['accounts'] ?? (data is List ? data : []);

      setState(() {
        _accounts = List<Map<String, dynamic>>.from(accounts);
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
      appBar: AppBar(title: const Text('General Ledger')),
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
                            const Text('Failed to load report', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.ink)),
                            const SizedBox(height: 4),
                            Text(_error!, style: const TextStyle(fontSize: 13, color: AppColors.muted), textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : _accounts.isEmpty
                        ? const Center(
                            child: Text('No data available', style: TextStyle(fontSize: 15, color: AppColors.muted)),
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
            Text('$label: ', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
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
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _accounts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final account = _accounts[index];
        return _buildAccountCard(account);
      },
    );
  }

  Widget _buildAccountCard(Map<String, dynamic> account) {
    final name = account['name'] ?? account['account_name'] ?? account['accountName'] ?? '';
    final code = account['code'] ?? account['account_code'] ?? account['accountCode'] ?? '';
    final closingBalance = (account['closingBalance'] ?? account['closing_balance'] ?? 0) as num;
    final openingBalance = (account['openingBalance'] ?? account['opening_balance'] ?? 0) as num;
    final transactions = List<Map<String, dynamic>>.from(
      account['transactions'] ?? account['entries'] ?? account['lines'] ?? [],
    );

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
          // Account header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$name',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ink,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (code.toString().isNotEmpty)
                        Text(
                          'Code: $code',
                          style: const TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: AppColors.muted,
                          ),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'Closing',
                      style: TextStyle(fontSize: 10, color: AppColors.muted),
                    ),
                    Text(
                      formatINR(closingBalance),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Opening balance
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface.withOpacity(0.5),
              border: const Border(bottom: BorderSide(color: AppColors.borderLight)),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Opening Balance',
                    style: TextStyle(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: AppColors.muted,
                    ),
                  ),
                ),
                Text(
                  formatINR(openingBalance),
                  style: const TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: AppColors.muted,
                  ),
                ),
              ],
            ),
          ),

          // Transaction rows
          if (transactions.isEmpty)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('No transactions', style: TextStyle(fontSize: 12, color: AppColors.muted)),
            )
          else
            ...transactions.map((txn) {
              final date = txn['date'] ?? txn['transactionDate'] ?? txn['transaction_date'] ?? '';
              final entryNo = txn['entryNumber'] ?? txn['entry_number'] ?? txn['number'] ?? txn['ref'] ?? '';
              final narration = txn['narration'] ?? txn['description'] ?? txn['memo'] ?? '';
              final debit = (txn['debit'] ?? 0) as num;
              final credit = (txn['credit'] ?? 0) as num;
              final runningBalance = txn['runningBalance'] ?? txn['running_balance'] ?? txn['balance'];

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: AppColors.borderLight)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          formatDate(date.toString()),
                          style: const TextStyle(fontSize: 11, color: AppColors.muted),
                        ),
                        if (entryNo.toString().isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.navy.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '#$entryNo',
                              style: const TextStyle(
                                fontSize: 10,
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.w600,
                                color: AppColors.navy,
                              ),
                            ),
                          ),
                        ],
                        const Spacer(),
                        if (runningBalance != null)
                          Text(
                            formatINR(runningBalance as num),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.ink,
                            ),
                          ),
                      ],
                    ),
                    if (narration.toString().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        narration.toString(),
                        style: const TextStyle(fontSize: 12, color: AppColors.ink),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (debit > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.green.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Dr ${formatINR(debit)}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.green),
                            ),
                          ),
                        if (debit > 0 && credit > 0)
                          const SizedBox(width: 8),
                        if (credit > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.red.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Cr ${formatINR(credit)}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.red),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              );
            }),

          // Closing balance
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Closing Balance',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                ),
                Text(
                  formatINR(closingBalance),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
