import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class GstSummaryScreen extends ConsumerStatefulWidget {
  const GstSummaryScreen({super.key});

  @override
  ConsumerState<GstSummaryScreen> createState() => _GstSummaryScreenState();
}

class _GstSummaryScreenState extends ConsumerState<GstSummaryScreen> {
  DateTime _fromDate =
      DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic> _data = {};

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
        '${Endpoints.reports}/gst-summary',
        queryParameters: {
          'fromDate': _fmtDate(_fromDate),
          'toDate': _fmtDate(_toDate),
        },
      );
      final data = res['data'] ?? res;
      setState(() {
        _data = Map<String, dynamic>.from(data);
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

  num _getNum(dynamic v) => (v ?? 0) as num;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GST Summary'),
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
                            const SizedBox(height: 20),
                            _buildTaxSection('Output Tax (Sales)',
                                _data['output_tax'] ?? _data['outputTax']),
                            const SizedBox(height: 20),
                            _buildTaxSection('Input Tax (Purchases)',
                                _data['input_tax'] ?? _data['inputTax']),
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final cgst = _getNum(_data['total_cgst'] ?? _data['totalCgst']);
    final sgst = _getNum(_data['total_sgst'] ?? _data['totalSgst']);
    final igst = _getNum(_data['total_igst'] ?? _data['totalIgst']);
    final cess = _getNum(_data['total_cess'] ?? _data['totalCess']);
    final netLiability =
        _getNum(_data['net_liability'] ?? _data['netLiability']);

    return Column(
      children: [
        Row(
          children: [
            _gstCard('CGST', cgst),
            const SizedBox(width: 8),
            _gstCard('SGST', sgst),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _gstCard('IGST', igst),
            const SizedBox(width: 8),
            _gstCard('Cess', cess),
          ],
        ),
        const SizedBox(height: 8),
        _netLiabilityCard(netLiability),
      ],
    );
  }

  Widget _gstCard(String label, num amount) {
    final color = amount > 0 ? AppColors.red : amount < 0 ? AppColors.green : AppColors.muted;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
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
                    fontSize: 11, color: color, fontWeight: FontWeight.w500)),
            const SizedBox(height: 4),
            Text(
              formatINR(amount),
              style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.bold, color: color),
            ),
            Text(
              amount > 0
                  ? 'Payable'
                  : amount < 0
                      ? 'Refundable'
                      : '-',
              style: TextStyle(fontSize: 10, color: color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _netLiabilityCard(num amount) {
    final color = amount > 0 ? AppColors.red : amount < 0 ? AppColors.green : AppColors.muted;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color, width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Net GST Liability',
                  style: TextStyle(
                      fontSize: 13,
                      color: color,
                      fontWeight: FontWeight.w600)),
              Text(
                amount > 0
                    ? 'Payable to Government'
                    : amount < 0
                        ? 'Refundable'
                        : 'No liability',
                style: TextStyle(fontSize: 11, color: color),
              ),
            ],
          ),
          Text(
            formatINR(amount),
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildTaxSection(String title, dynamic sectionData) {
    if (sectionData == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader(title),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text('No data',
                    style: TextStyle(color: AppColors.muted, fontSize: 13)),
              ),
            ),
          ),
        ],
      );
    }

    final section = Map<String, dynamic>.from(sectionData);
    final List<dynamic> rawRates = section['rates'] ?? section['rate_wise'] ?? [];
    final rates = rawRates.map((r) => Map<String, dynamic>.from(r)).toList();
    final totals = section['totals'] != null
        ? Map<String, dynamic>.from(section['totals'])
        : <String, dynamic>{};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(title),
        const SizedBox(height: 8),
        if (rates.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text('No entries',
                    style: TextStyle(color: AppColors.muted, fontSize: 13)),
              ),
            ),
          )
        else ...[
          ...rates.map(_buildRateRow),
          if (totals.isNotEmpty) _buildTotalsRow(totals),
        ],
      ],
    );
  }

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      ),
    );
  }

  Widget _buildRateRow(Map<String, dynamic> rate) {
    final ratePercent = rate['rate'] ?? rate['tax_rate'] ?? 0;
    final taxableAmount =
        _getNum(rate['taxable_amount'] ?? rate['taxableAmount']);
    final cgst = _getNum(rate['cgst']);
    final sgst = _getNum(rate['sgst']);
    final igst = _getNum(rate['igst']);
    final cess = _getNum(rate['cess']);
    final totalTax = _getNum(rate['total_tax'] ?? rate['totalTax']);

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$ratePercent%',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy),
                  ),
                ),
                const Spacer(),
                Text(
                  'Tax: ${formatINR(totalTax)}',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _taxChip('Taxable', taxableAmount),
                  const SizedBox(width: 6),
                  _taxChip('CGST', cgst),
                  const SizedBox(width: 6),
                  _taxChip('SGST', sgst),
                  const SizedBox(width: 6),
                  _taxChip('IGST', igst),
                  const SizedBox(width: 6),
                  _taxChip('Cess', cess),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _taxChip(String label, num amount) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.borderLight,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        children: [
          Text(label,
              style: TextStyle(fontSize: 9, color: AppColors.muted)),
          const SizedBox(height: 1),
          Text(
            formatINR(amount),
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.ink),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalsRow(Map<String, dynamic> totals) {
    final taxableAmount =
        _getNum(totals['taxable_amount'] ?? totals['taxableAmount']);
    final cgst = _getNum(totals['cgst']);
    final sgst = _getNum(totals['sgst']);
    final igst = _getNum(totals['igst']);
    final cess = _getNum(totals['cess']);
    final totalTax = _getNum(totals['total_tax'] ?? totals['totalTax']);

    return Card(
      color: AppColors.navy.withOpacity(0.03),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.navy.withOpacity(0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Totals',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy)),
                const Spacer(),
                Text(
                  'Tax: ${formatINR(totalTax)}',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.navy),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _taxChip('Taxable', taxableAmount),
                  const SizedBox(width: 6),
                  _taxChip('CGST', cgst),
                  const SizedBox(width: 6),
                  _taxChip('SGST', sgst),
                  const SizedBox(width: 6),
                  _taxChip('IGST', igst),
                  const SizedBox(width: 6),
                  _taxChip('Cess', cess),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
