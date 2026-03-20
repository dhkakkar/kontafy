import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class LedgerScreen extends ConsumerStatefulWidget {
  const LedgerScreen({super.key});
  @override
  ConsumerState<LedgerScreen> createState() => _LedgerScreenState();
}

class _LedgerScreenState extends ConsumerState<LedgerScreen> {
  List<Map<String, dynamic>> _accounts = [];
  List<Map<String, dynamic>> _entries = [];
  bool _loadingAccounts = true;
  bool _loadingLedger = false;
  String? _selectedAccountId;
  String _selectedAccountName = '';
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 90));
  DateTime _endDate = DateTime.now();
  String _accountSearch = '';
  final _accountSearchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  @override
  void dispose() {
    _accountSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadAccounts() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/books/accounts');
      final data = res['data'] ?? res;
      setState(() {
        _accounts =
            List<Map<String, dynamic>>.from(data is List ? data : []);
        _loadingAccounts = false;
      });
    } catch (e) {
      setState(() => _loadingAccounts = false);
    }
  }

  Future<void> _loadLedger() async {
    if (_selectedAccountId == null) return;
    setState(() => _loadingLedger = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get(
        '/books/ledger/$_selectedAccountId',
        queryParameters: {
          'start_date': DateFormat('yyyy-MM-dd').format(_startDate),
          'end_date': DateFormat('yyyy-MM-dd').format(_endDate),
        },
      );
      final data = res['data'] ?? res;
      setState(() {
        _entries =
            List<Map<String, dynamic>>.from(data is List ? data : []);
        _loadingLedger = false;
      });
    } catch (e) {
      setState(() {
        _entries = [];
        _loadingLedger = false;
      });
    }
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = isStart ? _startDate : _endDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.navy,
              onSurface: AppColors.ink,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
      if (_selectedAccountId != null) _loadLedger();
    }
  }

  void _showAccountPicker() {
    _accountSearchController.clear();
    _accountSearch = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final filtered = _accountSearch.isEmpty
                ? _accounts
                : _accounts.where((a) {
                    final name =
                        (a['name'] ?? '').toString().toLowerCase();
                    final code =
                        (a['code'] ?? '').toString().toLowerCase();
                    return name.contains(_accountSearch) ||
                        code.contains(_accountSearch);
                  }).toList();

            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              maxChildSize: 0.9,
              minChildSize: 0.4,
              expand: false,
              builder: (ctx, scrollController) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                      child: Row(
                        children: [
                          const Text(
                            'Select Account',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.ink,
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 20),
                      child: TextField(
                        controller: _accountSearchController,
                        onChanged: (v) {
                          setSheetState(() =>
                              _accountSearch = v.trim().toLowerCase());
                        },
                        decoration: InputDecoration(
                          hintText: 'Search accounts...',
                          hintStyle: const TextStyle(
                              color: AppColors.muted, fontSize: 14),
                          prefixIcon: const Icon(Icons.search,
                              color: AppColors.muted),
                          filled: true,
                          fillColor: AppColors.surface,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Divider(height: 1, color: AppColors.border),
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(
                              child: Text(
                                'No accounts found',
                                style: TextStyle(
                                    color: AppColors.muted, fontSize: 14),
                              ),
                            )
                          : ListView.builder(
                              controller: scrollController,
                              itemCount: filtered.length,
                              itemBuilder: (ctx, i) {
                                final a = filtered[i];
                                final id = (a['id'] ?? '').toString();
                                final name =
                                    (a['name'] ?? '').toString();
                                final code =
                                    (a['code'] ?? '').toString();
                                final type =
                                    (a['type'] ?? '').toString();
                                final isSelected =
                                    id == _selectedAccountId;

                                return ListTile(
                                  selected: isSelected,
                                  selectedTileColor:
                                      AppColors.blueLight.withOpacity(0.3),
                                  leading: CircleAvatar(
                                    radius: 18,
                                    backgroundColor: AppColors.surface,
                                    child: Text(
                                      name.isNotEmpty
                                          ? name[0].toUpperCase()
                                          : '?',
                                      style: const TextStyle(
                                        color: AppColors.navy,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    code.isNotEmpty
                                        ? '$code - $name'
                                        : name,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                  subtitle: type.isNotEmpty
                                      ? Text(
                                          type[0].toUpperCase() +
                                              type.substring(1),
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.muted,
                                          ),
                                        )
                                      : null,
                                  trailing: isSelected
                                      ? const Icon(Icons.check_circle,
                                          color: AppColors.navy, size: 20)
                                      : null,
                                  onTap: () {
                                    setState(() {
                                      _selectedAccountId = id;
                                      _selectedAccountName =
                                          code.isNotEmpty
                                              ? '$code - $name'
                                              : name;
                                    });
                                    Navigator.pop(ctx);
                                    _loadLedger();
                                  },
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Account Ledger'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loadingAccounts
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Account selector + date range
                Container(
                  color: AppColors.white,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Account selector
                      GestureDetector(
                        onTap: _showAccountPicker,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 14),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.border),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.account_balance_outlined,
                                  size: 18, color: AppColors.muted),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _selectedAccountId != null
                                      ? _selectedAccountName
                                      : 'Select Account',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: _selectedAccountId != null
                                        ? AppColors.ink
                                        : AppColors.muted,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.arrow_drop_down,
                                  color: AppColors.muted),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Date range row
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _pickDate(isStart: true),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 12),
                                decoration: BoxDecoration(
                                  border:
                                      Border.all(color: AppColors.border),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today,
                                        size: 16, color: AppColors.muted),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        DateFormat('dd MMM yy')
                                            .format(_startDate),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.ink),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            child: Text('to',
                                style: TextStyle(
                                    color: AppColors.muted, fontSize: 13)),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _pickDate(isStart: false),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 12),
                                decoration: BoxDecoration(
                                  border:
                                      Border.all(color: AppColors.border),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today,
                                        size: 16, color: AppColors.muted),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        DateFormat('dd MMM yy')
                                            .format(_endDate),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.ink),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: AppColors.border),
                // Ledger entries
                Expanded(child: _buildContent()),
              ],
            ),
    );
  }

  Widget _buildContent() {
    if (_selectedAccountId == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_wallet_outlined,
                size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            const Text('Select an account to view ledger',
                style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    if (_loadingLedger) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined,
                size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            const Text('No transactions found for this period',
                style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadLedger,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _entries.length,
        itemBuilder: (context, i) => _buildLedgerCard(_entries[i]),
      ),
    );
  }

  Widget _buildLedgerCard(Map<String, dynamic> entry) {
    final date =
        (entry['date'] ?? entry['createdAt'] ?? entry['created_at'] ?? '')
            .toString();
    final narration =
        (entry['narration'] ?? entry['description'] ?? '').toString();
    final debit = (entry['debit'] ?? entry['debit_amount'] ?? 0).toDouble();
    final credit =
        (entry['credit'] ?? entry['credit_amount'] ?? 0).toDouble();
    final balance =
        (entry['running_balance'] ?? entry['runningBalance'] ?? entry['balance'] ?? 0)
            .toDouble();

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(
                  formatDate(date),
                  style:
                      const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    'Bal: ${formatINR(balance)}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: balance >= 0 ? AppColors.ink : AppColors.red,
                    ),
                  ),
                ),
              ],
            ),
            if (narration.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                narration,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.ink,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                if (debit > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.arrow_upward,
                            size: 14, color: AppColors.green),
                        const SizedBox(width: 4),
                        Text(
                          'Dr ${formatINR(debit)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (debit > 0 && credit > 0) const SizedBox(width: 8),
                if (credit > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.redLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.arrow_downward,
                            size: 14, color: AppColors.red),
                        const SizedBox(width: 4),
                        Text(
                          'Cr ${formatINR(credit)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.red,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
