import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SalesRegisterScreen extends ConsumerStatefulWidget {
  const SalesRegisterScreen({super.key});

  @override
  ConsumerState<SalesRegisterScreen> createState() =>
      _SalesRegisterScreenState();
}

class _SalesRegisterScreenState extends ConsumerState<SalesRegisterScreen> {
  DateTime _fromDate =
      DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _entries = [];
  Map<String, dynamic> _summary = {};

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get(
        '${Endpoints.reports}/sales-register',
        queryParameters: {
          'fromDate': _fmtDate(_fromDate),
          'toDate': _fmtDate(_toDate),
        },
      );
      final data = res['data'] ?? res;
      final List<dynamic> rawEntries =
          data['entries'] ?? data['invoices'] ?? data['items'] ?? [];
      final entries =
          rawEntries.map((e) => Map<String, dynamic>.from(e)).toList();

      num totalSubtotal = 0, totalTax = 0, totalAmount = 0;
      for (final e in entries) {
        totalSubtotal += (e['subtotal'] ?? 0) as num;
        totalTax += (e['tax'] ?? e['tax_amount'] ?? 0) as num;
        totalAmount += (e['total'] ?? e['amount'] ?? 0) as num;
      }

      setState(() {
        _entries = entries;
        _summary = {
          'count': entries.length,
          'subtotal': data['total_subtotal'] ?? totalSubtotal,
          'tax': data['total_tax'] ?? totalTax,
          'total': data['total_amount'] ?? totalAmount,
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _fromDate, end: _toDate),
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Register'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0.5,
      ),
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // Date range filter
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.white,
            child: InkWell(
              onTap: _pickDateRange,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.date_range, size: 16, color: AppColors.muted),
                    const SizedBox(width: 8),
                    Text(
                      '${formatDate(_fromDate.toIso8601String())} - ${formatDate(_toDate.toIso8601String())}',
                      style: TextStyle(color: AppColors.ink, fontSize: 14),
                    ),
                    const Spacer(),
                    Icon(Icons.arrow_drop_down, color: AppColors.muted),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cloud_off_outlined,
                                size: 48, color: AppColors.muted),
                            const SizedBox(height: 12),
                            Text('Failed to load data',
                                style: TextStyle(color: AppColors.muted)),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _fetchData,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchData,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildSummaryCards(),
                            const SizedBox(height: 16),
                            ..._entries.map(_buildInvoiceCard),
                            if (_entries.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              _buildTotalRow(),
                            ],
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        _summaryCard(
            'Invoices', '${_summary['count'] ?? 0}', AppColors.navy),
        const SizedBox(width: 8),
        _summaryCard(
            'Subtotal',
            abbreviateINR(_summary['subtotal'] ?? 0),
            AppColors.blue),
        const SizedBox(width: 8),
        _summaryCard(
            'Tax',
            abbreviateINR(_summary['tax'] ?? 0),
            AppColors.amber),
        const SizedBox(width: 8),
        _summaryCard(
            'Total',
            abbreviateINR(_summary['total'] ?? 0),
            AppColors.green),
      ],
    );
  }

  Widget _summaryCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(
                    fontSize: 10, color: color, fontWeight: FontWeight.w500)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoiceCard(Map<String, dynamic> entry) {
    final invoiceNumber =
        entry['invoice_number'] ?? entry['invoiceNumber'] ?? entry['number'] ?? '-';
    final customerName =
        entry['customer_name'] ?? entry['customerName'] ?? entry['contact_name'] ?? '-';
    final date = entry['date'] ?? entry['invoice_date'] ?? '';
    final status = entry['status'] ?? 'draft';
    final subtotal = (entry['subtotal'] ?? 0) as num;
    final tax = (entry['tax'] ?? entry['tax_amount'] ?? 0) as num;
    final total = (entry['total'] ?? entry['amount'] ?? 0) as num;
    final balanceDue =
        (entry['balance_due'] ?? entry['balanceDue'] ?? 0) as num;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#$invoiceNumber',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        customerName,
                        style:
                            TextStyle(color: AppColors.muted, fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatDate(date),
                      style: TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                    const SizedBox(height: 4),
                    _statusBadge(status),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniLabel('Subtotal', formatINR(subtotal)),
                _miniLabel('Tax', formatINR(tax)),
                _miniLabel('Total', formatINR(total),
                    bold: true),
                _miniLabel(
                  'Balance Due',
                  formatINR(balanceDue),
                  color: balanceDue > 0 ? AppColors.amber : AppColors.green,
                  bold: true,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniLabel(String label, String value,
      {Color? color, bool bold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 10, color: AppColors.muted)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
            color: color ?? AppColors.ink,
          ),
        ),
      ],
    );
  }

  Widget _statusBadge(String status) {
    Color bg;
    Color fg;
    switch (status.toLowerCase()) {
      case 'paid':
        bg = AppColors.green.withOpacity(0.1);
        fg = AppColors.green;
        break;
      case 'overdue':
        bg = AppColors.red.withOpacity(0.1);
        fg = AppColors.red;
        break;
      case 'partial':
      case 'partially_paid':
        bg = AppColors.amber.withOpacity(0.1);
        fg = AppColors.amber;
        break;
      case 'sent':
        bg = AppColors.blue.withOpacity(0.1);
        fg = AppColors.blue;
        break;
      default:
        bg = AppColors.border;
        fg = AppColors.muted;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(
            fontSize: 10, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }

  Widget _buildTotalRow() {
    return Card(
      color: AppColors.navy.withOpacity(0.03),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.navy.withOpacity(0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_summary['count'] ?? 0} Invoices',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: AppColors.navy,
              ),
            ),
            Text(
              formatINR(_summary['total'] ?? 0),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: AppColors.navy,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
