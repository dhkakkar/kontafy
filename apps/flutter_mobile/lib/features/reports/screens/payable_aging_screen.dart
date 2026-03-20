import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class PayableAgingScreen extends ConsumerStatefulWidget {
  const PayableAgingScreen({super.key});

  @override
  ConsumerState<PayableAgingScreen> createState() =>
      _PayableAgingScreenState();
}

class _PayableAgingScreenState extends ConsumerState<PayableAgingScreen> {
  DateTime _asOfDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _buckets = [];
  Map<String, num> _totals = {};

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
      final dateStr =
          '${_asOfDate.year}-${_asOfDate.month.toString().padLeft(2, '0')}-${_asOfDate.day.toString().padLeft(2, '0')}';
      final res = await api.get(
        '${Endpoints.reports}/payable-aging',
        queryParameters: {'asOfDate': dateStr},
      );
      final data = res['data'] ?? res;
      final List<dynamic> rawBuckets = data['buckets'] ?? [];
      final buckets =
          rawBuckets.map((b) => Map<String, dynamic>.from(b)).toList();

      num totalCurrent = 0,
          total1_30 = 0,
          total31_60 = 0,
          total61_90 = 0,
          total90Plus = 0,
          totalAll = 0;
      for (final b in buckets) {
        totalCurrent += (b['current'] ?? 0) as num;
        total1_30 += (b['days_1_30'] ?? 0) as num;
        total31_60 += (b['days_31_60'] ?? 0) as num;
        total61_90 += (b['days_61_90'] ?? 0) as num;
        total90Plus += (b['days_90_plus'] ?? 0) as num;
        totalAll += (b['total'] ?? 0) as num;
      }

      setState(() {
        _buckets = buckets;
        _totals = {
          'current': totalCurrent,
          'days_1_30': total1_30,
          'days_31_60': total31_60,
          'days_61_90': total61_90,
          'days_90_plus': total90Plus,
          'total': totalAll,
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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _asOfDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _asOfDate) {
      setState(() => _asOfDate = picked);
      _fetchData();
    }
  }

  Color _bucketColor(String bucket) {
    switch (bucket) {
      case 'current':
        return AppColors.green;
      case 'days_1_30':
        return AppColors.amber;
      case 'days_31_60':
        return const Color(0xFFF97316);
      case 'days_61_90':
        return AppColors.red;
      case 'days_90_plus':
        return const Color(0xFF991B1B);
      default:
        return AppColors.ink;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payable Aging'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0.5,
      ),
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          // Date filter
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.white,
            child: Row(
              children: [
                Text(
                  'As of Date:',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today,
                              size: 16, color: AppColors.muted),
                          const SizedBox(width: 8),
                          Text(
                            formatDate(_asOfDate.toIso8601String()),
                            style:
                                TextStyle(color: AppColors.ink, fontSize: 14),
                          ),
                          const Spacer(),
                          Icon(Icons.arrow_drop_down, color: AppColors.muted),
                        ],
                      ),
                    ),
                  ),
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
                    : _buckets.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_outline,
                                    size: 56, color: AppColors.green),
                                const SizedBox(height: 12),
                                Text('No outstanding payables',
                                    style: TextStyle(
                                        color: AppColors.muted, fontSize: 15)),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchData,
                            child: ListView(
                              padding: const EdgeInsets.all(16),
                              children: [
                                ..._buckets.map(_buildVendorCard),
                                const SizedBox(height: 8),
                                _buildTotalsCard(),
                              ],
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildVendorCard(Map<String, dynamic> bucket) {
    final name = bucket['contact_name'] ?? bucket['company_name'] ?? '-';
    final company = bucket['company_name'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.storefront_outlined,
                    size: 16, color: AppColors.muted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.ink,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (company.isNotEmpty && company != name)
              Padding(
                padding: const EdgeInsets.only(left: 22),
                child: Text(
                  company,
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _agingChip('Current', bucket['current'] ?? 0, 'current'),
                  const SizedBox(width: 6),
                  _agingChip('1-30', bucket['days_1_30'] ?? 0, 'days_1_30'),
                  const SizedBox(width: 6),
                  _agingChip('31-60', bucket['days_31_60'] ?? 0, 'days_31_60'),
                  const SizedBox(width: 6),
                  _agingChip('61-90', bucket['days_61_90'] ?? 0, 'days_61_90'),
                  const SizedBox(width: 6),
                  _agingChip(
                      '90+', bucket['days_90_plus'] ?? 0, 'days_90_plus'),
                  const SizedBox(width: 6),
                  _totalChip(bucket['total'] ?? 0),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _agingChip(String label, num amount, String bucketKey) {
    final color = _bucketColor(bucketKey);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
                fontSize: 10, color: color, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2),
          Text(
            formatINR(amount),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _totalChip(num amount) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.navy.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.navy.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(
            'Total',
            style: TextStyle(
                fontSize: 10,
                color: AppColors.navy,
                fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2),
          Text(
            formatINR(amount),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.navy,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalsCard() {
    return Card(
      color: AppColors.navy.withOpacity(0.03),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.navy.withOpacity(0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Totals',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _agingChip(
                      'Current', _totals['current'] ?? 0, 'current'),
                  const SizedBox(width: 6),
                  _agingChip(
                      '1-30', _totals['days_1_30'] ?? 0, 'days_1_30'),
                  const SizedBox(width: 6),
                  _agingChip(
                      '31-60', _totals['days_31_60'] ?? 0, 'days_31_60'),
                  const SizedBox(width: 6),
                  _agingChip(
                      '61-90', _totals['days_61_90'] ?? 0, 'days_61_90'),
                  const SizedBox(width: 6),
                  _agingChip(
                      '90+', _totals['days_90_plus'] ?? 0, 'days_90_plus'),
                  const SizedBox(width: 6),
                  _totalChip(_totals['total'] ?? 0),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
