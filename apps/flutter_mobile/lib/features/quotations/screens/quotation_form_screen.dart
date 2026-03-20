import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class QuotationFormScreen extends ConsumerStatefulWidget {
  const QuotationFormScreen({super.key});
  @override
  ConsumerState<QuotationFormScreen> createState() => _QuotationFormScreenState();
}

class _QuotationFormScreenState extends ConsumerState<QuotationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  bool _loadingConfig = true;

  // Header fields
  String? _selectedCustomerId;
  String _selectedCustomerName = '';
  List<Map<String, dynamic>> _customers = [];
  DateTime _quotationDate = DateTime.now();
  DateTime _validUntil = DateTime.now().add(const Duration(days: 15));
  String _placeOfSupply = '';

  // Line items
  List<Map<String, dynamic>> _lineItems = [_emptyLineItem()];

  // Footer
  String _termsAndConditions = '';
  String _notes = '';
  final _termsController = TextEditingController();
  final _notesController = TextEditingController();

  static Map<String, dynamic> _emptyLineItem() {
    return {
      'product': '',
      'description': '',
      'hsnSac': '',
      'quantity': 1.0,
      'rate': 0.0,
      'discountPercent': 0.0,
      'taxRate': 18.0,
      'amount': 0.0,
    };
  }

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _termsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/contacts', queryParameters: {'type': 'customer'}),
        api.get('/settings/invoice-config'),
      ]);

      final customerData = results[0]['data'] ?? results[0];
      final configData = results[1]['data'] ?? results[1];

      setState(() {
        _customers = List<Map<String, dynamic>>.from(
          customerData is List ? customerData : [],
        );
        _termsAndConditions = (configData['termsAndConditions'] ??
                configData['terms_and_conditions'] ??
                configData['terms'] ??
                '')
            .toString();
        _termsController.text = _termsAndConditions;
        _loadingConfig = false;
      });
    } catch (e) {
      setState(() => _loadingConfig = false);
    }
  }

  void _recalculateLineItem(int index) {
    final item = _lineItems[index];
    final qty = (item['quantity'] as num).toDouble();
    final rate = (item['rate'] as num).toDouble();
    final discountPercent = (item['discountPercent'] as num).toDouble();
    final subtotal = qty * rate;
    final discountAmount = subtotal * discountPercent / 100;
    final amount = subtotal - discountAmount;
    setState(() {
      _lineItems[index]['amount'] = amount;
    });
  }

  double get _subtotal {
    double total = 0;
    for (final item in _lineItems) {
      final qty = (item['quantity'] as num).toDouble();
      final rate = (item['rate'] as num).toDouble();
      total += qty * rate;
    }
    return total;
  }

  double get _totalDiscount {
    double discount = 0;
    for (final item in _lineItems) {
      final qty = (item['quantity'] as num).toDouble();
      final rate = (item['rate'] as num).toDouble();
      final discountPercent = (item['discountPercent'] as num).toDouble();
      discount += qty * rate * discountPercent / 100;
    }
    return discount;
  }

  Map<String, double> get _taxBreakdown {
    final breakdown = <String, double>{};
    for (final item in _lineItems) {
      final qty = (item['quantity'] as num).toDouble();
      final rate = (item['rate'] as num).toDouble();
      final discountPercent = (item['discountPercent'] as num).toDouble();
      final taxRate = (item['taxRate'] as num).toDouble();
      final subtotal = qty * rate;
      final discountAmount = subtotal * discountPercent / 100;
      final taxableAmount = subtotal - discountAmount;
      final taxAmount = taxableAmount * taxRate / 100;
      final key = '${taxRate.toStringAsFixed(0)}%';
      breakdown[key] = (breakdown[key] ?? 0) + taxAmount;
    }
    return breakdown;
  }

  double get _totalTax {
    double tax = 0;
    for (final entry in _taxBreakdown.entries) {
      tax += entry.value;
    }
    return tax;
  }

  double get _grandTotal {
    return _subtotal - _totalDiscount + _totalTax;
  }

  Future<void> _selectDate(BuildContext context, DateTime current, ValueChanged<DateTime> onSelected) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(primary: AppColors.navy),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) onSelected(picked);
  }

  Future<void> _saveQuotation({required bool asDraft}) async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCustomerId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a customer')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final items = _lineItems.map((item) {
        return {
          'product': item['product'],
          'description': item['description'],
          'hsnSac': item['hsnSac'],
          'quantity': item['quantity'],
          'rate': item['rate'],
          'discountPercent': item['discountPercent'],
          'taxRate': item['taxRate'],
          'amount': item['amount'],
        };
      }).toList();

      final body = {
        'customerId': _selectedCustomerId,
        'date': DateFormat('yyyy-MM-dd').format(_quotationDate),
        'validUntil': DateFormat('yyyy-MM-dd').format(_validUntil),
        'placeOfSupply': _placeOfSupply,
        'items': items,
        'termsAndConditions': _termsController.text,
        'notes': _notesController.text,
        'status': asDraft ? 'draft' : 'sent',
      };

      await api.post('/bill/quotations', data: body);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(asDraft ? 'Quotation saved as draft' : 'Quotation sent')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('New Quotation'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loadingConfig
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Customer dropdown
                  _buildSectionCard(
                    title: 'Customer Details',
                    children: [
                      _buildDropdownField(
                        label: 'Customer',
                        value: _selectedCustomerId,
                        items: _customers.map((c) {
                          final id = (c['id'] ?? c['_id'] ?? '').toString();
                          final name = (c['name'] ?? c['displayName'] ?? c['display_name'] ?? '').toString();
                          return DropdownMenuItem(value: id, child: Text(name));
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedCustomerId = val;
                            final customer = _customers.firstWhere(
                              (c) => (c['id'] ?? c['_id']).toString() == val,
                              orElse: () => {},
                            );
                            _selectedCustomerName = (customer['name'] ?? customer['displayName'] ?? '').toString();
                            _placeOfSupply = (customer['state'] ?? customer['placeOfSupply'] ?? '').toString();
                          });
                        },
                        hint: 'Select a customer',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Dates
                  _buildSectionCard(
                    title: 'Dates & Location',
                    children: [
                      _buildDateField(
                        label: 'Quotation Date',
                        date: _quotationDate,
                        onTap: () => _selectDate(context, _quotationDate, (d) => setState(() => _quotationDate = d)),
                      ),
                      const SizedBox(height: 12),
                      _buildDateField(
                        label: 'Valid Until',
                        date: _validUntil,
                        onTap: () => _selectDate(context, _validUntil, (d) => setState(() => _validUntil = d)),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: _placeOfSupply,
                        decoration: _inputDecoration('Place of Supply'),
                        onChanged: (v) => _placeOfSupply = v,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Line items
                  _buildSectionCard(
                    title: 'Line Items',
                    trailing: TextButton.icon(
                      onPressed: () {
                        setState(() => _lineItems.add(_emptyLineItem()));
                      },
                      icon: Icon(Icons.add, size: 18, color: AppColors.navy),
                      label: Text('Add Item', style: TextStyle(color: AppColors.navy, fontSize: 13)),
                    ),
                    children: [
                      for (int i = 0; i < _lineItems.length; i++) ...[
                        if (i > 0) const Divider(height: 24),
                        _buildLineItemFields(i),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Summary
                  _buildSectionCard(
                    title: 'Summary',
                    children: [
                      _buildSummaryRow('Subtotal', formatINR(_subtotal)),
                      if (_totalDiscount > 0) ...[
                        const SizedBox(height: 8),
                        _buildSummaryRow('Discount', '- ${formatINR(_totalDiscount)}'),
                      ],
                      ..._taxBreakdown.entries.map((e) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: _buildSummaryRow('Tax @ ${e.key}', formatINR(e.value)),
                        );
                      }),
                      const Divider(height: 24),
                      _buildSummaryRow('Total', formatINR(_grandTotal), bold: true),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Terms & Notes
                  _buildSectionCard(
                    title: 'Terms & Notes',
                    children: [
                      TextFormField(
                        controller: _termsController,
                        decoration: _inputDecoration('Terms & Conditions'),
                        maxLines: 4,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _notesController,
                        decoration: _inputDecoration('Notes'),
                        maxLines: 3,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : () => _saveQuotation(asDraft: true),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.navy,
                            side: BorderSide(color: AppColors.navy),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: _saving
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Save as Draft', style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _saving ? null : () => _saveQuotation(asDraft: false),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.navy,
                            foregroundColor: AppColors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                          ),
                          child: _saving
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Send', style: TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required List<Widget> children,
    Widget? trailing,
  }) {
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
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: AppColors.ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (trailing != null) trailing,
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildLineItemFields(int index) {
    final item = _lineItems[index];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Item ${index + 1}',
              style: TextStyle(color: AppColors.muted, fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const Spacer(),
            if (_lineItems.length > 1)
              IconButton(
                onPressed: () {
                  setState(() => _lineItems.removeAt(index));
                },
                icon: Icon(Icons.delete_outline, color: AppColors.red, size: 20),
                constraints: const BoxConstraints(),
                padding: EdgeInsets.zero,
              ),
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: item['product'].toString(),
          decoration: _inputDecoration('Product'),
          onChanged: (v) => _lineItems[index]['product'] = v,
        ),
        const SizedBox(height: 10),
        TextFormField(
          initialValue: item['description'].toString(),
          decoration: _inputDecoration('Description'),
          onChanged: (v) => _lineItems[index]['description'] = v,
        ),
        const SizedBox(height: 10),
        TextFormField(
          initialValue: item['hsnSac'].toString(),
          decoration: _inputDecoration('HSN/SAC Code'),
          onChanged: (v) => _lineItems[index]['hsnSac'] = v,
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: item['quantity'].toString(),
                decoration: _inputDecoration('Qty'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (v) {
                  _lineItems[index]['quantity'] = double.tryParse(v) ?? 0;
                  _recalculateLineItem(index);
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextFormField(
                initialValue: item['rate'] == 0.0 ? '' : item['rate'].toString(),
                decoration: _inputDecoration('Rate'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (v) {
                  _lineItems[index]['rate'] = double.tryParse(v) ?? 0;
                  _recalculateLineItem(index);
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: item['discountPercent'] == 0.0 ? '' : item['discountPercent'].toString(),
                decoration: _inputDecoration('Discount %'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (v) {
                  _lineItems[index]['discountPercent'] = double.tryParse(v) ?? 0;
                  _recalculateLineItem(index);
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: DropdownButtonFormField<double>(
                value: (item['taxRate'] as num).toDouble(),
                decoration: _inputDecoration('Tax Rate'),
                items: const [
                  DropdownMenuItem(value: 0.0, child: Text('0%')),
                  DropdownMenuItem(value: 5.0, child: Text('5%')),
                  DropdownMenuItem(value: 12.0, child: Text('12%')),
                  DropdownMenuItem(value: 18.0, child: Text('18%')),
                  DropdownMenuItem(value: 28.0, child: Text('28%')),
                ],
                onChanged: (v) {
                  setState(() {
                    _lineItems[index]['taxRate'] = v ?? 18.0;
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: Text(
            'Amount: ${formatINR(item['amount'] as double)}',
            style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
    required String hint,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: _inputDecoration(label),
      hint: Text(hint, style: TextStyle(color: AppColors.muted, fontSize: 14)),
      items: items,
      onChanged: onChanged,
      isExpanded: true,
      validator: (v) => v == null ? 'Required' : null,
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime date,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AbsorbPointer(
        child: TextFormField(
          decoration: _inputDecoration(label).copyWith(
            suffixIcon: Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.muted),
          ),
          controller: TextEditingController(text: DateFormat('dd MMM yyyy').format(date)),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: bold ? AppColors.ink : AppColors.muted,
            fontSize: bold ? 15 : 14,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: AppColors.ink,
            fontSize: bold ? 16 : 14,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: AppColors.muted, fontSize: 14),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
        borderSide: BorderSide(color: AppColors.navy, width: 1.5),
      ),
    );
  }
}
