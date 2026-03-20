import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class JournalFormScreen extends ConsumerStatefulWidget {
  const JournalFormScreen({super.key});
  @override
  ConsumerState<JournalFormScreen> createState() => _JournalFormScreenState();
}

class _JournalFormScreenState extends ConsumerState<JournalFormScreen> {
  final _narrationController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  List<Map<String, dynamic>> _accounts = [];
  bool _loadingAccounts = true;
  bool _saving = false;

  List<_JournalLine> _lines = [];

  @override
  void initState() {
    super.initState();
    _lines = [_JournalLine(), _JournalLine()];
    _loadAccounts();
  }

  @override
  void dispose() {
    _narrationController.dispose();
    for (final line in _lines) {
      line.dispose();
    }
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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
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
      setState(() => _selectedDate = picked);
    }
  }

  void _addLine() {
    setState(() => _lines.add(_JournalLine()));
  }

  void _removeLine(int index) {
    if (_lines.length <= 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Minimum 2 journal lines required')),
      );
      return;
    }
    setState(() {
      _lines[index].dispose();
      _lines.removeAt(index);
    });
  }

  double get _totalDebit {
    double sum = 0;
    for (final line in _lines) {
      sum += double.tryParse(line.debitController.text) ?? 0;
    }
    return sum;
  }

  double get _totalCredit {
    double sum = 0;
    for (final line in _lines) {
      sum += double.tryParse(line.creditController.text) ?? 0;
    }
    return sum;
  }

  bool get _isBalanced =>
      _totalDebit > 0 &&
      (_totalDebit - _totalCredit).abs() < 0.01;

  Future<void> _save({required bool isPosted}) async {
    if (_narrationController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a narration')),
      );
      return;
    }

    final linesData = <Map<String, dynamic>>[];
    for (int i = 0; i < _lines.length; i++) {
      final line = _lines[i];
      if (line.accountId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Please select an account for line ${i + 1}')),
        );
        return;
      }
      final debit = double.tryParse(line.debitController.text) ?? 0;
      final credit = double.tryParse(line.creditController.text) ?? 0;
      if (debit == 0 && credit == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text('Line ${i + 1} must have a debit or credit amount')),
        );
        return;
      }
      linesData.add({
        'account_id': line.accountId,
        'description': line.descriptionController.text.trim(),
        'debit': debit,
        'credit': credit,
      });
    }

    if (!_isBalanced) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Total debits must equal total credits')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/books/journal-entries', data: {
        'date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'narration': _narrationController.text.trim(),
        'is_posted': isPosted,
        'lines': linesData,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isPosted
                ? 'Journal entry posted successfully'
                : 'Journal entry saved as draft'),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final difference = _totalDebit - _totalCredit;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('New Journal Entry'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _loadingAccounts
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Date & Narration
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Entry Details',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.ink,
                              ),
                            ),
                            const SizedBox(height: 16),
                            GestureDetector(
                              onTap: _pickDate,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  border:
                                      Border.all(color: AppColors.border),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today,
                                        size: 18, color: AppColors.muted),
                                    const SizedBox(width: 10),
                                    Text(
                                      DateFormat('dd MMM yyyy')
                                          .format(_selectedDate),
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: AppColors.ink,
                                      ),
                                    ),
                                    const Spacer(),
                                    const Icon(Icons.arrow_drop_down,
                                        color: AppColors.muted),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _narrationController,
                              maxLines: 2,
                              decoration: InputDecoration(
                                labelText: 'Narration',
                                labelStyle:
                                    const TextStyle(color: AppColors.muted),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                      color: AppColors.navy),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Journal lines
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Journal Lines',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.ink,
                                  ),
                                ),
                                const Spacer(),
                                TextButton.icon(
                                  onPressed: _addLine,
                                  icon: const Icon(Icons.add, size: 18),
                                  label: const Text('Add Line'),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.navy,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            for (int i = 0; i < _lines.length; i++) ...[
                              if (i > 0)
                                const Divider(
                                    height: 24, color: AppColors.border),
                              _buildLineItem(i),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
                // Footer
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.white,
                    border: Border(
                        top: BorderSide(color: AppColors.border)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          _buildTotalChip(
                              'Debit', _totalDebit, AppColors.green),
                          const SizedBox(width: 12),
                          _buildTotalChip(
                              'Credit', _totalCredit, AppColors.red),
                          const SizedBox(width: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _isBalanced
                                  ? const Color(0xFFD1FAE5)
                                  : AppColors.redLight,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              _isBalanced
                                  ? 'Balanced'
                                  : 'Diff: ${formatINR(difference.abs())}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _isBalanced
                                    ? AppColors.green
                                    : AppColors.red,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed:
                                  _saving ? null : () => _save(isPosted: false),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.navy,
                                side: const BorderSide(color: AppColors.navy),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: _saving
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : const Text('Save as Draft',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed:
                                  _saving ? null : () => _save(isPosted: true),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.navy,
                                foregroundColor: AppColors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: _saving
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.white,
                                      ),
                                    )
                                  : const Text('Post Entry',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildTotalChip(String label, double amount, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.muted, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 2),
            Text(
              formatINR(amount),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLineItem(int index) {
    final line = _lines[index];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              alignment: Alignment.center,
              child: Text(
                '${index + 1}',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.muted),
              ),
            ),
            const SizedBox(width: 8),
            const Text('Line',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink)),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.remove_circle_outline,
                  size: 20, color: AppColors.red),
              onPressed: () => _removeLine(index),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          value: line.accountId,
          isExpanded: true,
          decoration: InputDecoration(
            labelText: 'Account',
            labelStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border:
                OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.navy),
            ),
          ),
          items: _accounts.map((a) {
            final id = (a['id'] ?? '').toString();
            final name = (a['name'] ?? '').toString();
            final code = (a['code'] ?? '').toString();
            return DropdownMenuItem<String>(
              value: id,
              child: Text(
                code.isNotEmpty ? '$code - $name' : name,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: (v) {
            setState(() => line.accountId = v);
          },
        ),
        const SizedBox(height: 10),
        TextField(
          controller: line.descriptionController,
          decoration: InputDecoration(
            labelText: 'Description (optional)',
            labelStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border:
                OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.navy),
            ),
          ),
          style: const TextStyle(fontSize: 14),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: line.debitController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
                onChanged: (v) {
                  if (v.isNotEmpty &&
                      (double.tryParse(v) ?? 0) > 0) {
                    line.creditController.clear();
                  }
                  setState(() {});
                },
                decoration: InputDecoration(
                  labelText: 'Debit',
                  labelStyle:
                      const TextStyle(color: AppColors.muted, fontSize: 14),
                  prefixText: '\u20B9 ',
                  prefixStyle:
                      const TextStyle(color: AppColors.green, fontSize: 14),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.green),
                  ),
                ),
                style: const TextStyle(fontSize: 14),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: line.creditController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
                onChanged: (v) {
                  if (v.isNotEmpty &&
                      (double.tryParse(v) ?? 0) > 0) {
                    line.debitController.clear();
                  }
                  setState(() {});
                },
                decoration: InputDecoration(
                  labelText: 'Credit',
                  labelStyle:
                      const TextStyle(color: AppColors.muted, fontSize: 14),
                  prefixText: '\u20B9 ',
                  prefixStyle:
                      const TextStyle(color: AppColors.red, fontSize: 14),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.red),
                  ),
                ),
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _JournalLine {
  String? accountId;
  final descriptionController = TextEditingController();
  final debitController = TextEditingController();
  final creditController = TextEditingController();

  void dispose() {
    descriptionController.dispose();
    debitController.dispose();
    creditController.dispose();
  }
}
