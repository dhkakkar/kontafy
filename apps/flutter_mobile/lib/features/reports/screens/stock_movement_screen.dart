import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class StockMovementScreen extends ConsumerStatefulWidget {
  const StockMovementScreen({super.key});

  @override
  ConsumerState<StockMovementScreen> createState() =>
      _StockMovementScreenState();
}

class _StockMovementScreenState extends ConsumerState<StockMovementScreen> {
  DateTime _fromDate =
      DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime.now();
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _summaryByProduct = [];
  List<Map<String, dynamic>> _movements = [];

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
        '${Endpoints.reports}/stock-movement',
        queryParameters: {
          'fromDate': _fmtDate(_fromDate),
          'toDate': _fmtDate(_toDate),
        },
      );
      final data = res['data'] ?? res;

      final List<dynamic> rawSummary =
          data['summary_by_product'] ?? data['summaryByProduct'] ?? [];
      final List<dynamic> rawMovements =
          data['movements'] ?? data['details'] ?? data['items'] ?? [];

      setState(() {
        _summaryByProduct =
            rawSummary.map((s) => Map<String, dynamic>.from(s)).toList();
        _movements =
            rawMovements.map((m) => Map<String, dynamic>.from(m)).toList();
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

  Color _movementTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'purchase_in':
        return AppColors.green;
      case 'sale_out':
        return AppColors.red;
      case 'adjustment':
        return AppColors.blue;
      case 'transfer':
        return AppColors.amber;
      case 'return_in':
        return AppColors.green;
      case 'return_out':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  String _movementTypeLabel(String type) {
    switch (type.toLowerCase()) {
      case 'purchase_in':
        return 'Purchase In';
      case 'sale_out':
        return 'Sale Out';
      case 'adjustment':
        return 'Adjustment';
      case 'transfer':
        return 'Transfer';
      case 'return_in':
        return 'Return In';
      case 'return_out':
        return 'Return Out';
      default:
        return type.replaceAll('_', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock Movement'),
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
                            // Summary by Product section
                            if (_summaryByProduct.isNotEmpty) ...[
                              _sectionHeader('Summary by Product'),
                              const SizedBox(height: 8),
                              ..._summaryByProduct
                                  .map(_buildProductSummaryCard),
                              const SizedBox(height: 20),
                            ],
                            // Movement Details section
                            _sectionHeader('Movement Details'),
                            const SizedBox(height: 8),
                            if (_movements.isEmpty)
                              Padding(
                                padding: const EdgeInsets.all(32),
                                child: Center(
                                  child: Text(
                                    'No movements in this period',
                                    style: TextStyle(
                                        color: AppColors.muted, fontSize: 14),
                                  ),
                                ),
                              )
                            else
                              ..._movements.map(_buildMovementCard),
                          ],
                        ),
                      ),
          ),
        ],
      ),
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

  Widget _buildProductSummaryCard(Map<String, dynamic> item) {
    final name = item['product_name'] ?? item['productName'] ?? item['name'] ?? '-';
    final totalIn = (item['total_in'] ?? item['totalIn'] ?? 0) as num;
    final totalOut = (item['total_out'] ?? item['totalOut'] ?? 0) as num;
    final net = (item['net'] ?? (totalIn - totalOut)) as num;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _summaryChip('In', '+$totalIn', AppColors.green),
                _summaryChip('Out', '-$totalOut', AppColors.red),
                _summaryChip(
                  'Net',
                  '${net >= 0 ? '+' : ''}$net',
                  net >= 0 ? AppColors.green : AppColors.red,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 10, color: color, fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(value,
              style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildMovementCard(Map<String, dynamic> movement) {
    final date = movement['date'] ?? movement['movement_date'] ?? '';
    final productName =
        movement['product_name'] ?? movement['productName'] ?? '-';
    final warehouse =
        movement['warehouse'] ?? movement['warehouse_name'] ?? '-';
    final type = movement['type'] ?? movement['movement_type'] ?? 'unknown';
    final qty = (movement['quantity'] ?? movement['qty'] ?? 0) as num;
    final cost = (movement['cost'] ?? movement['cost_price'] ?? 0) as num;
    final notes = movement['notes'] ?? movement['remarks'] ?? '';

    final typeColor = _movementTypeColor(type);
    final typeLabel = _movementTypeLabel(type);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    productName,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.ink,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    typeLabel,
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: typeColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 12, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(formatDate(date),
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
                const SizedBox(width: 12),
                Icon(Icons.warehouse_outlined,
                    size: 12, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(warehouse,
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _miniLabel('Qty', '$qty'),
                const SizedBox(width: 24),
                _miniLabel('Cost', formatINR(cost)),
                if (notes.isNotEmpty) ...[
                  const SizedBox(width: 24),
                  Expanded(
                    child: _miniLabel('Notes', notes),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniLabel(String label, String value) {
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
              fontWeight: FontWeight.w500,
              color: AppColors.ink),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
