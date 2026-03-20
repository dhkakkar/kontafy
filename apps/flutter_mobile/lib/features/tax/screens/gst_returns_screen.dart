import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';

class GstReturnsScreen extends ConsumerStatefulWidget {
  const GstReturnsScreen({super.key});
  @override
  ConsumerState<GstReturnsScreen> createState() => _GstReturnsScreenState();
}

class _GstReturnsScreenState extends ConsumerState<GstReturnsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _filter = 'all';

  static const _filters = ['all', 'draft', 'computed', 'filed'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{};
      if (_filter != 'all') params['status'] = _filter;
      final res = await api.get('/tax/gst/returns', queryParameters: params);
      final data = res['data'] ?? res;
      setState(() {
        _items = List<Map<String, dynamic>>.from(data is List ? data : []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _onFilterChanged(String filter) {
    if (_filter == filter) return;
    setState(() => _filter = filter);
    _loadData();
  }

  Color _returnTypeColor(String type) {
    switch (type.toUpperCase()) {
      case 'GSTR1':
      case 'GSTR-1':
        return AppColors.blue;
      case 'GSTR3B':
      case 'GSTR-3B':
        return AppColors.purple;
      case 'GSTR9':
      case 'GSTR-9':
        return AppColors.green;
      default:
        return AppColors.navy;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('GST Returns'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
            Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No GST returns found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildReturnCard(_items[i]),
      ),
    );
  }

  Widget _buildReturnCard(Map<String, dynamic> ret) {
    final returnType = (ret['return_type'] ?? ret['returnType'] ?? '-').toString();
    final period = (ret['period'] ?? ret['tax_period'] ?? '-').toString();
    final status = (ret['status'] ?? 'draft').toString().toLowerCase();
    final filedAt = ret['filed_at'] ?? ret['filedAt'] ?? '';
    final arn = ret['arn'] ?? ret['ARN'] ?? '';
    final typeColor = _returnTypeColor(returnType);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Coming soon')),
          );
        },
        borderRadius: BorderRadius.circular(12),
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
                      color: typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      returnType,
                      style: TextStyle(
                        color: typeColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      period,
                      style: TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ),
                  StatusBadge(status: status),
                ],
              ),
              if (filedAt.toString().isNotEmpty || arn.toString().isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (filedAt.toString().isNotEmpty) ...[
                      Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.muted),
                      const SizedBox(width: 4),
                      Text(
                        formatDate(filedAt.toString()),
                        style: TextStyle(color: AppColors.muted, fontSize: 13),
                      ),
                    ],
                    const Spacer(),
                    if (arn.toString().isNotEmpty)
                      Text(
                        'ARN: $arn',
                        style: TextStyle(color: AppColors.muted, fontSize: 12, fontFamily: 'monospace'),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
