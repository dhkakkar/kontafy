import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class TdsScreen extends ConsumerStatefulWidget {
  const TdsScreen({super.key});
  @override
  ConsumerState<TdsScreen> createState() => _TdsScreenState();
}

class _TdsScreenState extends ConsumerState<TdsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _search = '';
  Timer? _debounce;
  final _searchController = TextEditingController();

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
      if (_search.isNotEmpty) params['search'] = _search;
      final res = await api.get('/tax/tds', queryParameters: params);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('TDS Entries'),
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
                hintText: 'Search TDS entries...',
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
          const Divider(height: 1, color: AppColors.border),
          // Content
          Expanded(child: _buildContent()),
        ],
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
            Icon(Icons.receipt_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No TDS entries found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildTdsCard(_items[i]),
      ),
    );
  }

  Widget _buildTdsCard(Map<String, dynamic> tds) {
    final date = (tds['date'] ?? tds['deduction_date'] ?? tds['createdAt'] ?? '').toString();
    final section = (tds['section'] ?? tds['tds_section'] ?? '-').toString();
    final deducteeName = (tds['deductee_name'] ?? tds['deducteeName'] ?? tds['name'] ?? '-').toString();
    final pan = (tds['pan'] ?? tds['deductee_pan'] ?? '').toString();
    final grossAmount = (tds['gross_amount'] ?? tds['grossAmount'] ?? 0).toDouble();
    final tdsRate = (tds['tds_rate'] ?? tds['tdsRate'] ?? tds['rate'] ?? 0).toDouble();
    final tdsAmount = (tds['tds_amount'] ?? tds['tdsAmount'] ?? 0).toDouble();
    final status = (tds['status'] ?? 'pending').toString().toLowerCase();

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
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.purpleLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    section,
                    style: TextStyle(
                      color: AppColors.purple,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    deducteeName,
                    style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            if (pan.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.badge_outlined, size: 14, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text(
                    'PAN: $pan',
                    style: TextStyle(color: AppColors.muted, fontSize: 13, fontFamily: 'monospace'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Gross Amount',
                        style: TextStyle(color: AppColors.muted, fontSize: 11),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formatINR(grossAmount),
                        style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        'TDS Rate',
                        style: TextStyle(color: AppColors.muted, fontSize: 11),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${tdsRate.toStringAsFixed(1)}%',
                        style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'TDS Amount',
                        style: TextStyle(color: AppColors.muted, fontSize: 11),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formatINR(tdsAmount),
                        style: TextStyle(color: AppColors.red, fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                    ],
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
                  formatDate(date),
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
