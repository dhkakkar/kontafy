import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class ExpenseListScreen extends ConsumerStatefulWidget {
  const ExpenseListScreen({super.key});
  @override
  ConsumerState<ExpenseListScreen> createState() => _ExpenseListScreenState();
}

class _ExpenseListScreenState extends ConsumerState<ExpenseListScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _search = '';
  String _filter = 'all';
  Timer? _debounce;
  final _searchController = TextEditingController();
  Map<String, dynamic> _summary = {};

  static const _filters = ['all', 'pending', 'approved', 'paid'];

  static const _categoryIcons = <String, IconData>{
    'rent': Icons.home_outlined,
    'utilities': Icons.bolt_outlined,
    'salaries': Icons.people_outlined,
    'travel': Icons.flight_outlined,
    'office_supplies': Icons.inventory_2_outlined,
    'professional_fees': Icons.gavel_outlined,
    'marketing': Icons.campaign_outlined,
    'insurance': Icons.shield_outlined,
    'repairs': Icons.build_outlined,
    'miscellaneous': Icons.more_horiz,
  };

  static const _categoryColors = <String, Color>{
    'rent': AppColors.navy,
    'utilities': AppColors.amber,
    'salaries': AppColors.green,
    'travel': AppColors.blue,
    'office_supplies': AppColors.purple,
    'professional_fees': AppColors.red,
    'marketing': AppColors.navy,
    'insurance': AppColors.blue,
    'repairs': AppColors.amber,
    'miscellaneous': AppColors.muted,
  };

  static const _paymentMethodIcons = <String, IconData>{
    'cash': Icons.payments_outlined,
    'upi': Icons.phone_android_outlined,
    'bank_transfer': Icons.account_balance_outlined,
    'cheque': Icons.description_outlined,
    'card': Icons.credit_card_outlined,
  };

  static const _categories = [
    'rent',
    'utilities',
    'salaries',
    'travel',
    'office_supplies',
    'professional_fees',
    'marketing',
    'insurance',
    'repairs',
    'miscellaneous',
  ];

  static const _paymentMethods = [
    'cash',
    'upi',
    'bank_transfer',
    'cheque',
    'card',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{};
      if (_filter != 'all') params['status'] = _filter;
      if (_search.isNotEmpty) params['search'] = _search;
      final res = await api.get('/bill/expenses', queryParameters: params);
      final data = res['data'] ?? res;
      final summary = res['summary'] ?? {};
      setState(() {
        _items = List<Map<String, dynamic>>.from(data is List ? data : []);
        _summary = summary is Map<String, dynamic> ? summary : {};
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      setState(() => _search = value.trim());
      _loadData();
    });
  }

  void _onFilterChanged(String filter) {
    if (_filter == filter) return;
    setState(() => _filter = filter);
    _loadData();
  }

  String _formatCategoryLabel(String category) {
    return category.split('_').map((w) => w[0].toUpperCase() + w.substring(1)).join(' ');
  }

  String _formatPaymentLabel(String method) {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'upi':
        return 'UPI';
      default:
        return method[0].toUpperCase() + method.substring(1);
    }
  }

  void _showCreateExpenseSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _CreateExpenseSheet(
        categories: _categories,
        paymentMethods: _paymentMethods,
        formatCategoryLabel: _formatCategoryLabel,
        formatPaymentLabel: _formatPaymentLabel,
        onSubmit: _createExpense,
      ),
    );
  }

  Future<void> _createExpense(Map<String, dynamic> data) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/bill/expenses', data: data);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense created successfully')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create expense: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Expenses'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search expenses...',
                hintStyle: TextStyle(color: AppColors.muted, fontSize: 14),
                prefixIcon: Icon(Icons.search, color: AppColors.muted),
                filled: true,
                fillColor: AppColors.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          // Filter chips
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
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
        onPressed: _showCreateExpenseSheet,
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Expense'),
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
            Icon(Icons.receipt_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No expenses found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
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
          // Expense list
          ..._items.map(_buildExpenseCard),
          if (_items.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 32),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.receipt_outlined, size: 48, color: AppColors.muted.withOpacity(0.4)),
                    const SizedBox(height: 12),
                    Text('No expenses found', style: TextStyle(color: AppColors.muted, fontSize: 14)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final totalThisMonth = (_summary['totalThisMonth'] ?? _summary['total_this_month'] ?? 0).toDouble();
    final pending = (_summary['pending'] ?? _summary['pendingAmount'] ?? _summary['pending_amount'] ?? 0).toDouble();
    final largestCategory = _summary['largestCategory'] ?? _summary['largest_category'] ?? _summary['topCategory'] ?? _summary['top_category'] ?? '-';

    return Row(
      children: [
        Expanded(child: _buildSummaryCard('Total This Month', formatINR(totalThisMonth), AppColors.navy)),
        const SizedBox(width: 8),
        Expanded(child: _buildSummaryCard('Pending', formatINR(pending), AppColors.amber)),
        const SizedBox(width: 8),
        Expanded(
          child: _buildSummaryCard(
            'Largest Category',
            largestCategory is String ? _formatCategoryLabel(largestCategory) : largestCategory.toString(),
            AppColors.purple,
          ),
        ),
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
          children: [
            Text(title, style: TextStyle(color: AppColors.muted, fontSize: 11, fontWeight: FontWeight.w500)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpenseCard(Map<String, dynamic> exp) {
    final date = exp['date'] ?? exp['expenseDate'] ?? exp['expense_date'] ?? exp['createdAt'] ?? '';
    final category = (exp['category'] ?? '').toString().toLowerCase();
    final description = exp['description'] ?? exp['title'] ?? exp['name'] ?? '-';
    final vendorName = exp['vendorName'] ?? exp['vendor_name'] ?? exp['vendor']?['name'] ?? '';
    final amount = (exp['total'] ?? exp['amount'] ?? 0).toDouble();
    final paymentMethod = (exp['paymentMethod'] ?? exp['payment_method'] ?? '').toString().toLowerCase();
    final status = (exp['status'] ?? 'pending').toString().toLowerCase();

    final categoryIcon = _categoryIcons[category] ?? Icons.category_outlined;
    final categoryColor = _categoryColors[category] ?? AppColors.muted;
    final pmIcon = _paymentMethodIcons[paymentMethod] ?? Icons.payment_outlined;

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
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: categoryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(categoryIcon, size: 18, color: categoryColor),
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
                      if (vendorName.toString().isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          vendorName.toString(),
                          style: TextStyle(color: AppColors.muted, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (category.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: categoryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _formatCategoryLabel(category),
                      style: TextStyle(
                        color: categoryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                const Spacer(),
                Text(
                  formatINR(amount),
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(
                  formatDate(date.toString()),
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const Spacer(),
                if (paymentMethod.isNotEmpty) ...[
                  Icon(pmIcon, size: 14, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text(
                    _formatPaymentLabel(paymentMethod),
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateExpenseSheet extends StatefulWidget {
  final List<String> categories;
  final List<String> paymentMethods;
  final String Function(String) formatCategoryLabel;
  final String Function(String) formatPaymentLabel;
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  const _CreateExpenseSheet({
    required this.categories,
    required this.paymentMethods,
    required this.formatCategoryLabel,
    required this.formatPaymentLabel,
    required this.onSubmit,
  });

  @override
  State<_CreateExpenseSheet> createState() => _CreateExpenseSheetState();
}

class _CreateExpenseSheetState extends State<_CreateExpenseSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  final _vendorController = TextEditingController();
  final _referenceController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _date = DateTime.now();
  String _category = 'miscellaneous';
  String _paymentMethod = 'cash';
  bool _submitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _vendorController.dispose();
    _referenceController.dispose();
    _notesController.dispose();
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
      'category': _category,
      'description': _descriptionController.text.trim(),
      'amount': double.tryParse(_amountController.text.trim()) ?? 0,
      'paymentMethod': _paymentMethod,
    };
    if (_vendorController.text.trim().isNotEmpty) {
      data['vendorName'] = _vendorController.text.trim();
    }
    if (_referenceController.text.trim().isNotEmpty) {
      data['reference'] = _referenceController.text.trim();
    }
    if (_notesController.text.trim().isNotEmpty) {
      data['notes'] = _notesController.text.trim();
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
              Text('New Expense', style: TextStyle(color: AppColors.ink, fontSize: 18, fontWeight: FontWeight.w700)),
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

              // Category dropdown
              Text('Category', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
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
                    value: _category,
                    isExpanded: true,
                    style: TextStyle(color: AppColors.ink, fontSize: 14),
                    icon: Icon(Icons.keyboard_arrow_down, color: AppColors.muted),
                    items: widget.categories.map((c) {
                      return DropdownMenuItem(value: c, child: Text(widget.formatCategoryLabel(c)));
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _category = v);
                    },
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

              // Payment method dropdown
              Text('Payment Method', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
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
                    value: _paymentMethod,
                    isExpanded: true,
                    style: TextStyle(color: AppColors.ink, fontSize: 14),
                    icon: Icon(Icons.keyboard_arrow_down, color: AppColors.muted),
                    items: widget.paymentMethods.map((m) {
                      return DropdownMenuItem(value: m, child: Text(widget.formatPaymentLabel(m)));
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _paymentMethod = v);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Vendor name
              Text('Vendor Name', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _vendorController,
                decoration: _inputDecoration('Enter vendor name'),
              ),
              const SizedBox(height: 16),

              // Reference
              Text('Reference', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _referenceController,
                decoration: _inputDecoration('Enter reference number'),
              ),
              const SizedBox(height: 16),

              // Notes
              Text('Notes', style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _notesController,
                decoration: _inputDecoration('Additional notes'),
                maxLines: 3,
              ),
              const SizedBox(height: 24),

              // Submit button
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
                      : const Text('Create Expense', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
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
