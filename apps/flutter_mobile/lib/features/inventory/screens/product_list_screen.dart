import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key});
  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _search = '';
  String _filter = 'all';
  Timer? _debounce;
  final _searchController = TextEditingController();

  static const _filters = ['all', 'goods', 'services'];

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
      if (_filter != 'all') params['type'] = _filter;
      if (_search.isNotEmpty) params['search'] = _search;
      final res = await api.get('/stock/products', queryParameters: params);
      final data = res['data'] ?? res;
      setState(() {
        _items = List<Map<String, dynamic>>.from(data is List ? data : []);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Products'),
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
                hintText: 'Search products...',
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
                  final label = f[0].toUpperCase() + f.substring(1);
                  final selected = _filter == f;
                  return FilterChip(
                    label: Text(
                      label,
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
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Coming soon')),
          );
        },
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Product'),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No products found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildProductCard(_items[i]),
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final name = (product['name'] ?? product['productName'] ?? product['product_name'] ?? '-').toString();
    final sku = (product['sku'] ?? product['SKU'] ?? '').toString();
    final sellingPrice = (product['sellingPrice'] ?? product['selling_price'] ?? product['price'] ?? 0).toDouble();
    final stock = product['stock'] ?? product['stockQuantity'] ?? product['stock_quantity'] ?? product['quantity'];
    final stockQty = stock != null ? num.tryParse(stock.toString()) : null;
    final type = (product['type'] ?? product['productType'] ?? product['product_type'] ?? '').toString().toLowerCase();
    final status = (product['status'] ?? 'active').toString().toLowerCase();

    String stockLabel;
    String stockStatus;
    if (type == 'service' || type == 'services') {
      stockLabel = 'Service';
      stockStatus = 'service';
    } else if (stockQty == null) {
      stockLabel = '-';
      stockStatus = '';
    } else if (stockQty <= 0) {
      stockLabel = '${stockQty.toInt()} units';
      stockStatus = 'out_of_stock';
    } else if (stockQty <= 10) {
      stockLabel = '${stockQty.toInt()} units';
      stockStatus = 'low_stock';
    } else {
      stockLabel = '${stockQty.toInt()} units';
      stockStatus = 'in_stock';
    }

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
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 8),
            if (sku.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  'SKU: $sku',
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ),
            Row(
              children: [
                // Selling price
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Selling Price', style: TextStyle(color: AppColors.muted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Text(
                      formatINR(sellingPrice),
                      style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const Spacer(),
                // Stock
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Stock', style: TextStyle(color: AppColors.muted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          stockLabel,
                          style: TextStyle(color: AppColors.inkLight, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        if (stockStatus.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          StatusBadge(status: stockStatus),
                        ],
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
