import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class BankAccountsScreen extends ConsumerStatefulWidget {
  const BankAccountsScreen({super.key});

  @override
  ConsumerState<BankAccountsScreen> createState() => _BankAccountsScreenState();
}

class _BankAccountsScreenState extends ConsumerState<BankAccountsScreen> {
  List<Map<String, dynamic>> _accounts = [];
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
      final res = await api.get(Endpoints.bankAccounts);
      final data = res['data'] ?? res;
      setState(() {
        _accounts = List<Map<String, dynamic>>.from(data is List ? data : data['items'] ?? data['accounts'] ?? []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  String _maskAccountNumber(String? number) {
    if (number == null || number.isEmpty) return '----';
    if (number.length <= 4) return number;
    return '${'*' * (number.length - 4)}${number.substring(number.length - 4)}';
  }

  String _formatAccountType(String? type) {
    if (type == null || type.isEmpty) return 'Account';
    switch (type.toLowerCase()) {
      case 'savings':
        return 'Savings';
      case 'current':
        return 'Current';
      case 'cash':
        return 'Cash';
      case 'credit_card':
        return 'Credit Card';
      default:
        return type[0].toUpperCase() + type.substring(1);
    }
  }

  Color _accountTypeColor(String? type) {
    switch ((type ?? '').toLowerCase()) {
      case 'savings':
        return AppColors.green;
      case 'current':
        return AppColors.blue;
      case 'cash':
        return AppColors.amber;
      case 'credit_card':
        return AppColors.purple;
      default:
        return AppColors.navy;
    }
  }

  IconData _accountIcon(String? type) {
    switch ((type ?? '').toLowerCase()) {
      case 'cash':
        return Icons.payments_outlined;
      case 'credit_card':
        return Icons.credit_card_outlined;
      default:
        return Icons.account_balance_outlined;
    }
  }

  void _showCreateAccountSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _CreateAccountSheet(onSubmit: _createAccount),
    );
  }

  Future<void> _createAccount(Map<String, dynamic> data) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post(Endpoints.bankAccounts, data: data);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created successfully')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create account: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Bank & Cash'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _buildContent(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateAccountSheet,
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Account'),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_accounts.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No bank accounts yet', style: TextStyle(color: AppColors.muted, fontSize: 16)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _showCreateAccountSheet,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add Account'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 600;
          if (isWide) {
            return GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.6,
              ),
              itemCount: _accounts.length,
              itemBuilder: (context, index) => _buildAccountCard(_accounts[index]),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _accounts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) => _buildAccountCard(_accounts[index]),
          );
        },
      ),
    );
  }

  Widget _buildAccountCard(Map<String, dynamic> account) {
    final accountName = account['account_name'] ?? account['accountName'] ?? account['name'] ?? '-';
    final bankName = account['bank_name'] ?? account['bankName'] ?? '';
    final accountNumber = (account['account_number'] ?? account['accountNumber'] ?? '').toString();
    final accountType = (account['account_type'] ?? account['accountType'] ?? '').toString();
    final balance = (account['current_balance'] ?? account['currentBalance'] ?? account['balance'] ?? 0).toDouble();
    final isActive = account['is_active'] ?? account['isActive'] ?? true;
    final id = account['id'];
    final typeColor = _accountTypeColor(accountType);

    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          if (id != null) context.push('/banking/accounts/$id');
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(_accountIcon(accountType), size: 20, color: typeColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          accountName.toString(),
                          style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (bankName.toString().isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            bankName.toString(),
                            style: TextStyle(color: AppColors.muted, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (isActive == true)
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.green,
                        shape: BoxShape.circle,
                      ),
                    )
                  else
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.muted,
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _formatAccountType(accountType),
                      style: TextStyle(color: typeColor, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _maskAccountNumber(accountNumber),
                    style: TextStyle(color: AppColors.muted, fontSize: 12, fontFamily: 'monospace'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                formatINR(balance),
                style: TextStyle(
                  color: balance >= 0 ? AppColors.ink : AppColors.red,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CreateAccountSheet extends StatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  const _CreateAccountSheet({required this.onSubmit});

  @override
  State<_CreateAccountSheet> createState() => _CreateAccountSheetState();
}

class _CreateAccountSheetState extends State<_CreateAccountSheet> {
  final _formKey = GlobalKey<FormState>();
  final _accountNameController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _ifscController = TextEditingController();
  final _openingBalanceController = TextEditingController();
  String _accountType = 'savings';
  bool _submitting = false;

  static const _accountTypes = ['savings', 'current', 'cash', 'credit_card'];

  @override
  void dispose() {
    _accountNameController.dispose();
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _ifscController.dispose();
    _openingBalanceController.dispose();
    super.dispose();
  }

  String _formatTypeLabel(String type) {
    switch (type) {
      case 'credit_card':
        return 'Credit Card';
      default:
        return type[0].toUpperCase() + type.substring(1);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    final data = <String, dynamic>{
      'account_name': _accountNameController.text.trim(),
      'account_type': _accountType,
      'opening_balance': double.tryParse(_openingBalanceController.text.trim()) ?? 0,
    };
    if (_bankNameController.text.trim().isNotEmpty) {
      data['bank_name'] = _bankNameController.text.trim();
    }
    if (_accountNumberController.text.trim().isNotEmpty) {
      data['account_number'] = _accountNumberController.text.trim();
    }
    if (_ifscController.text.trim().isNotEmpty) {
      data['ifsc'] = _ifscController.text.trim();
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
              Text('Add Account', style: TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),

              // Account Name
              Text('Account Name *', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _accountNameController,
                decoration: _inputDecoration('e.g. Main Business Account'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Bank Name
              Text('Bank Name', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _bankNameController,
                decoration: _inputDecoration('e.g. HDFC Bank'),
              ),
              const SizedBox(height: 16),

              // Account Number
              Text('Account Number', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _accountNumberController,
                decoration: _inputDecoration('Enter account number'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),

              // IFSC
              Text('IFSC Code', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _ifscController,
                decoration: _inputDecoration('e.g. HDFC0001234'),
                textCapitalization: TextCapitalization.characters,
              ),
              const SizedBox(height: 16),

              // Account Type
              Text('Account Type', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _accountType,
                    isExpanded: true,
                    style: TextStyle(color: AppColors.ink, fontSize: 14),
                    icon: Icon(Icons.keyboard_arrow_down, color: AppColors.muted),
                    items: _accountTypes.map((t) {
                      return DropdownMenuItem(value: t, child: Text(_formatTypeLabel(t)));
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _accountType = v);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Opening Balance
              Text('Opening Balance', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _openingBalanceController,
                decoration: _inputDecoration('0.00').copyWith(
                  prefixText: '\u20B9 ',
                  prefixStyle: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
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
                      : const Text('Create Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
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
