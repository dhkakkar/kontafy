import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class StockSummaryScreen extends ConsumerStatefulWidget {
  const StockSummaryScreen({super.key});

  @override
  ConsumerState<StockSummaryScreen> createState() =>
      _StockSummaryScreenState();
}

class _StockSummaryScreenState extends ConsumerState<StockSummaryScreen> {
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _products = [];
  Map<String, dynamic> _summary = {};
  bool _showOnlyBelowReorder = false;

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
      final res = await api.get('${Endpoints.reports}/stock-summary');
      final data = res['data'] ?? res;
      final List<dynamic> rawProducts =
          data['products'] ?? data['items'] ?? [];
      final products =
          rawProducts.map((p) => Map<String, dynamic>.from(p)).toList();

      num totalQty = 0, stockValue = 0, sellingValue = 0;
      int belowReorder = 0;
      for (final p in products) {
        totalQty += (p['quantity'] ?? p['qty'] ?? 0) as num;
        stockValue += (p['stock_value'] ?? p['stockValue'] ?? 0) as num;
        sellingValue +=
            (p['selling_value'] ?? p['sellingValue'] ?? 0) as num;
        final qty = (p['quantity'] ?? p['qty'] ?? 0) as num;
        final reorderLevel =
            (p['reorder_level'] ?? p['reorderLevel'] ?? 0) as num;
        if (reorderLevel > 0 && qty <= reorderLevel) belowReorder++;
      }

      setState(() {
        _products = products;
        _summary = {
          'count': products.length,
          'total_qty': data['total_qty'] ?? totalQty,
          'stock_value': data['total_stock_value'] ?? stockValue,
          'selling_value': data['total_selling_value'] ?? sellingValue,
          'below_reorder': data['below_reorder_count'] ?? belowReorder,
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

  List<Map<String, dynamic>> get _filteredProducts {
    if (!_showOnlyBelowReorder) return _products;
    return _products.where((p) {
      final qty = (p['quantity'] ?? p['qty'] ?? 0) as num;
      final reorderLevel =
          (p['reorder_level'] ?? p['reorderLevel'] ?? 0) as num;
      return reorderLevel > 0 && qty <= reorderLevel;
    }).toList();
  }

  bool _isBelowReorder(Map<String, dynamic> p) {
    final qty = (p['quantity'] ?? p['qty'] ?? 0) as num;
    final reorderLevel =
        (p['reorder_level'] ?? p['reorderLevel'] ?? 0) as num;
    return reorderLevel > 0 && qty <= reorderLevel;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredProducts;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock Summary'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0.5,
      ),
      backgroundColor: AppColors.surface,
      body: _isLoading
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
                      const SizedBox(height: 12),
                      // Toggle filter
                      Row(
                        children: [
                          SizedBox(
                            height: 24,
                            width: 24,
                            child: Checkbox(
                              value: _showOnlyBelowReorder,
                              onChanged: (v) => setState(
                                  () => _showOnlyBelowReorder = v ?? false),
                              activeColor: AppColors.red,
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => setState(() =>
                                _showOnlyBelowReorder =
                                    !_showOnlyBelowReorder),
                            child: Text(
                              'Show only below reorder level',
                              style: TextStyle(
                                  color: AppColors.ink, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (filtered.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Text(
                              _showOnlyBelowReorder
                                  ? 'No products below reorder level'
                                  : 'No products found',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 14),
                            ),
                          ),
                        )
                      else
                        ...filtered.map(_buildProductCard),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryCards() {
    return Column(
      children: [
        Row(
          children: [
            _summaryCard('Products', '${_summary['count'] ?? 0}',
                AppColors.navy, Icons.inventory_2_outlined),
            const SizedBox(width: 8),
            _summaryCard(
                'Total Qty',
                '${_summary['total_qty'] ?? 0}',
                AppColors.blue,
                Icons.stacked_bar_chart),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _summaryCard(
                'Stock Value',
                abbreviateINR(_summary['stock_value'] ?? 0),
                AppColors.green,
                Icons.account_balance_wallet_outlined),
            const SizedBox(width: 8),
            _summaryCard(
                'Selling Value',
                abbreviateINR(_summary['selling_value'] ?? 0),
                AppColors.purple,
                Icons.sell_outlined),
          ],
        ),
        const SizedBox(height: 8),
        _summaryCardWide(
          'Below Reorder',
          '${_summary['below_reorder'] ?? 0}',
          AppColors.red,
          Icons.warning_amber_rounded,
        ),
      ],
    );
  }

  Widget _summaryCard(
      String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 10,
                          color: color,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: color)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCardWide(
      String label, String value, Color color, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 10),
          Text(label,
              style: TextStyle(
                  fontSize: 12, color: color, fontWeight: FontWeight.w500)),
          const Spacer(),
          Text(value,
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final name = product['name'] ?? product['product_name'] ?? '-';
    final sku = product['sku'] ?? '-';
    final unit = product['unit'] ?? 'pcs';
    final qty = (product['quantity'] ?? product['qty'] ?? 0) as num;
    final costPrice =
        (product['cost_price'] ?? product['costPrice'] ?? 0) as num;
    final stockValue =
        (product['stock_value'] ?? product['stockValue'] ?? 0) as num;
    final sellingValue =
        (product['selling_value'] ?? product['sellingValue'] ?? 0) as num;
    final isLow = _isBelowReorder(product);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (isLow) ...[
                  Icon(Icons.warning_amber_rounded,
                      size: 16, color: AppColors.red),
                  const SizedBox(width: 6),
                ],
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
                _stockBadge(isLow),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text('SKU: $sku',
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
                const SizedBox(width: 12),
                Text('Unit: $unit',
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniLabel('Qty', '$qty $unit'),
                _miniLabel('Cost Price', formatINR(costPrice)),
                _miniLabel('Stock Value', formatINR(stockValue)),
                _miniLabel('Selling Value', formatINR(sellingValue)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stockBadge(bool isLow) {
    final color = isLow ? AppColors.red : AppColors.green;
    final label = isLow ? 'Low' : 'OK';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style:
            TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
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
        ),
      ],
    );
  }
}
