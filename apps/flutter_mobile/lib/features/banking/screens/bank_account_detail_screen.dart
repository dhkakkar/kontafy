import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

class BankAccountDetailScreen extends ConsumerStatefulWidget {
  final String id;

  const BankAccountDetailScreen({super.key, required this.id});

  @override
  ConsumerState<BankAccountDetailScreen> createState() => _BankAccountDetailScreenState();
}

class _BankAccountDetailScreenState extends ConsumerState<BankAccountDetailScreen> {
  Map<String, dynamic> _account = {};
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;
  String _filter = 'all'; // 'all' or 'unreconciled'

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{'bank_account_id': widget.id};
      if (_filter == 'unreconciled') params['reconciled'] = 'false';

      final results = await Future.wait([
        api.get('/bank/accounts/${widget.id}/balance'),
        api.get('/bank/transactions', queryParameters: params),
      ]);

      final accountData = results[0]['data'] ?? results[0];
      final txData = results[1]['data'] ?? results[1];

      setState(() {
        _account = accountData is Map<String, dynamic> ? accountData : {};
        _transactions = List<Map<String, dynamic>>.from(
          txData is List ? txData : txData['items'] ?? txData['transactions'] ?? [],
        );
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

  void _showAddTransactionSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AddTransactionSheet(onSubmit: _createTransaction),
    );
  }

  Future<void> _createTransaction(Map<String, dynamic> data) async {
    try {
      final api = ref.read(apiClientProvider);
      data['bank_account_id'] = widget.id;
      await api.post('/bank/transactions', data: data);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction added successfully')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add transaction: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  String _maskAccountNumber(String? number) {
    if (number == null || number.isEmpty) return '';
    if (number.length <= 4) return number;
    return '${'*' * (number.length - 4)}${number.substring(number.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    final accountName = _account['account_name'] ?? _account['accountName'] ?? _account['name'] ?? 'Account Details';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(_loading ? 'Account Details' : accountName.toString()),
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
                  _buildAccountInfoCard(),
                  const SizedBox(height: 16),
                  _buildFilterChips(),
                  const SizedBox(height: 12),
                  if (_transactions.isEmpty)
                    _buildEmptyState()
                  else
                    ..._transactions.map(_buildTransactionCard),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddTransactionSheet,
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Transaction'),
      ),
    );
  }

  Widget _buildAccountInfoCard() {
    final bankName = _account['bank_name'] ?? _account['bankName'] ?? '';
    final accountNumber = (_account['account_number'] ?? _account['accountNumber'] ?? '').toString();
    final ifsc = _account['ifsc'] ?? _account['ifsc_code'] ?? _account['ifscCode'] ?? '';
    final balance = (_account['current_balance'] ?? _account['currentBalance'] ?? _account['balance'] ?? 0).toDouble();

    return Card(
      elevation: 0,
      color: AppColors.navy,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance_outlined, size: 24, color: AppColors.white.withOpacity(0.8)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    bankName.toString().isNotEmpty ? bankName.toString() : 'Bank Account',
                    style: TextStyle(color: AppColors.white.withOpacity(0.9), fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (accountNumber.isNotEmpty) ...[
              Text(
                'Account Number',
                style: TextStyle(color: AppColors.white.withOpacity(0.6), fontSize: 11, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              Text(
                _maskAccountNumber(accountNumber),
                style: TextStyle(color: AppColors.white.withOpacity(0.9), fontSize: 14, fontFamily: 'monospace', letterSpacing: 1.5),
              ),
              const SizedBox(height: 12),
            ],
            if (ifsc.toString().isNotEmpty) ...[
              Text(
                'IFSC',
                style: TextStyle(color: AppColors.white.withOpacity(0.6), fontSize: 11, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              Text(
                ifsc.toString(),
                style: TextStyle(color: AppColors.white.withOpacity(0.9), fontSize: 14, fontFamily: 'monospace'),
              ),
              const SizedBox(height: 12),
            ],
            const Divider(color: Colors.white24, height: 24),
            Text(
              'Current Balance',
              style: TextStyle(color: AppColors.white.withOpacity(0.6), fontSize: 12, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 4),
            Text(
              formatINR(balance),
              style: const TextStyle(color: AppColors.white, fontSize: 28, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    final filters = ['all', 'unreconciled'];
    final labels = {'all': 'All', 'unreconciled': 'Unreconciled'};

    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final f = filters[i];
          final selected = _filter == f;
          return FilterChip(
            label: Text(
              labels[f] ?? f,
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
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.only(top: 48),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 12),
            Text(
              _filter == 'unreconciled' ? 'No unreconciled transactions' : 'No transactions yet',
              style: TextStyle(color: AppColors.muted, fontSize: 15),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx) {
    final date = tx['date'] ?? tx['transaction_date'] ?? tx['transactionDate'] ?? tx['createdAt'] ?? '';
    final description = tx['description'] ?? tx['narration'] ?? '-';
    final reference = tx['reference'] ?? tx['reference_number'] ?? tx['referenceNumber'] ?? '';
    final amount = (tx['amount'] ?? 0).toDouble();
    final type = (tx['type'] ?? tx['transaction_type'] ?? tx['transactionType'] ?? 'debit').toString().toLowerCase();
    final runningBalance = tx['running_balance'] ?? tx['runningBalance'] ?? tx['balance'];
    final isReconciled = tx['reconciled'] ?? tx['is_reconciled'] ?? tx['isReconciled'] ?? false;
    final isCredit = type == 'credit' || type == 'deposit' || type == 'cr';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
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
          children: [
            Row(
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
                          if (reference.toString().isNotEmpty) ...[
                            Text(' \u2022 ', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                            Flexible(
                              child: Text(
                                '#${reference}',
                                style: TextStyle(color: AppColors.muted, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${isCredit ? '+' : '-'} ${formatINR(amount.abs())}',
                      style: TextStyle(
                        color: isCredit ? AppColors.green : AppColors.red,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (runningBalance != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Bal: ${formatINR((runningBalance as num).toDouble())}',
                        style: TextStyle(color: AppColors.muted, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ],
            ),
            if (isReconciled == true) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.check_circle, size: 14, color: AppColors.green),
                  const SizedBox(width: 4),
                  Text(
                    'Reconciled',
                    style: TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AddTransactionSheet extends StatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  const _AddTransactionSheet({required this.onSubmit});

  @override
  State<_AddTransactionSheet> createState() => _AddTransactionSheetState();
}

class _AddTransactionSheetState extends State<_AddTransactionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  DateTime _date = DateTime.now();
  String _type = 'debit';
  bool _submitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.navy,
              onPrimary: AppColors.white,
              surface: AppColors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    final data = <String, dynamic>{
      'date': _date.toIso8601String(),
      'description': _descriptionController.text.trim(),
      'amount': double.tryParse(_amountController.text.trim()) ?? 0,
      'type': _type,
    };
    if (_referenceController.text.trim().isNotEmpty) {
      data['reference'] = _referenceController.text.trim();
    }

    await widget.onSubmit(data);
    setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottomInset),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Add Transaction', style: TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),

              // Date
              Text('Date', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.muted),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat('dd MMM yyyy').format(_date),
                        style: TextStyle(color: AppColors.ink, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Description
              Text('Description *', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descriptionController,
                decoration: _inputDecoration('Enter description'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Amount
              Text('Amount *', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _amountController,
                decoration: _inputDecoration('0.00').copyWith(
                  prefixText: '\u20B9 ',
                  prefixStyle: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required';
                  final n = double.tryParse(v.trim());
                  if (n == null || n <= 0) return 'Enter a valid amount';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Type
              Text('Type', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'debit'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _type == 'debit' ? AppColors.red.withOpacity(0.1) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _type == 'debit' ? AppColors.red : AppColors.border,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.arrow_upward_rounded,
                              size: 18,
                              color: _type == 'debit' ? AppColors.red : AppColors.muted,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Debit',
                              style: TextStyle(
                                color: _type == 'debit' ? AppColors.red : AppColors.muted,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _type = 'credit'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _type == 'credit' ? AppColors.green.withOpacity(0.1) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _type == 'credit' ? AppColors.green : AppColors.border,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.arrow_downward_rounded,
                              size: 18,
                              color: _type == 'credit' ? AppColors.green : AppColors.muted,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Credit',
                              style: TextStyle(
                                color: _type == 'credit' ? AppColors.green : AppColors.muted,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Reference
              Text('Reference', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _referenceController,
                decoration: _inputDecoration('Enter reference number'),
              ),
              const SizedBox(height: 24),

              // Submit
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    foregroundColor: AppColors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2),
                        )
                      : const Text('Add Transaction', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppColors.muted, fontSize: 14),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.navy),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppColors.red),
      ),
    );
  }
}
