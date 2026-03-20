import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SettingsAuditLogScreen extends ConsumerStatefulWidget {
  const SettingsAuditLogScreen({super.key});
  @override
  ConsumerState<SettingsAuditLogScreen> createState() => _SettingsAuditLogScreenState();
}

class _SettingsAuditLogScreenState extends ConsumerState<SettingsAuditLogScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  int _page = 1;
  int _totalPages = 1;
  static const _limit = 20;

  String? _actionFilter;
  String? _entityTypeFilter;
  DateTimeRange? _dateRange;

  int? _expandedIndex;

  static const _actions = ['created', 'updated', 'deleted'];
  static const _entityTypes = [
    'invoice', 'contact', 'product', 'payment', 'expense',
    'purchase', 'quotation', 'journal', 'credit_note', 'debit_note',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{
        'page': _page,
        'limit': _limit,
      };
      if (_actionFilter != null) params['action'] = _actionFilter!;
      if (_entityTypeFilter != null) params['entityType'] = _entityTypeFilter!;
      if (_dateRange != null) {
        params['startDate'] = _dateRange!.start.toIso8601String();
        params['endDate'] = _dateRange!.end.toIso8601String();
      }
      final res = await api.get('/audit-log', queryParameters: params);
      final data = res['data'] ?? res;
      final total = res['total'] ?? res['meta']?['total'] ?? 0;
      setState(() {
        _items = List<Map<String, dynamic>>.from(data is List ? data : []);
        _totalPages = ((total as num) / _limit).ceil().clamp(1, 9999);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _pickDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _dateRange,
      builder: (ctx, child) {
        return Theme(
          data: Theme.of(ctx).copyWith(
            colorScheme: const ColorScheme.light(primary: AppColors.navy),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dateRange = picked;
        _page = 1;
      });
      _loadData();
    }
  }

  Color _actionColor(String action) {
    switch (action.toLowerCase()) {
      case 'created':
        return AppColors.green;
      case 'updated':
        return AppColors.blue;
      case 'deleted':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Audit Log'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Filters
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  // Date range
                  _buildFilterChip(
                    label: _dateRange != null
                        ? '${DateFormat('dd/MM').format(_dateRange!.start)} - ${DateFormat('dd/MM').format(_dateRange!.end)}'
                        : 'Date Range',
                    active: _dateRange != null,
                    onTap: _pickDateRange,
                  ),
                  const SizedBox(width: 8),
                  // Action filter
                  _buildDropdownChip(
                    label: _actionFilter != null
                        ? '${_actionFilter![0].toUpperCase()}${_actionFilter!.substring(1)}'
                        : 'Action',
                    active: _actionFilter != null,
                    items: _actions,
                    onSelected: (v) {
                      setState(() {
                        _actionFilter = v;
                        _page = 1;
                      });
                      _loadData();
                    },
                    onClear: () {
                      setState(() {
                        _actionFilter = null;
                        _page = 1;
                      });
                      _loadData();
                    },
                  ),
                  const SizedBox(width: 8),
                  // Entity type filter
                  _buildDropdownChip(
                    label: _entityTypeFilter ?? 'Entity Type',
                    active: _entityTypeFilter != null,
                    items: _entityTypes,
                    onSelected: (v) {
                      setState(() {
                        _entityTypeFilter = v;
                        _page = 1;
                      });
                      _loadData();
                    },
                    onClear: () {
                      setState(() {
                        _entityTypeFilter = null;
                        _page = 1;
                      });
                      _loadData();
                    },
                  ),
                  if (_dateRange != null || _actionFilter != null || _entityTypeFilter != null) ...[
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _dateRange = null;
                          _actionFilter = null;
                          _entityTypeFilter = null;
                          _page = 1;
                        });
                        _loadData();
                      },
                      child: const Text('Clear all', style: TextStyle(color: AppColors.red, fontSize: 13, fontWeight: FontWeight.w500)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          // Content
          Expanded(child: _buildContent()),
          // Pagination
          if (!_loading && _items.isNotEmpty) _buildPagination(),
        ],
      ),
    );
  }

  Widget _buildFilterChip({required String label, required bool active, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.navy : AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: active ? AppColors.navy : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_today_outlined, size: 14, color: active ? AppColors.white : AppColors.muted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(color: active ? AppColors.white : AppColors.ink, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdownChip({
    required String label,
    required bool active,
    required List<String> items,
    required ValueChanged<String> onSelected,
    required VoidCallback onClear,
  }) {
    return PopupMenuButton<String>(
      onSelected: onSelected,
      offset: const Offset(0, 36),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      itemBuilder: (_) => [
        if (active)
          PopupMenuItem(
            value: '__clear__',
            child: Text('Clear filter', style: TextStyle(color: AppColors.red, fontSize: 14)),
          ),
        ...items.map((item) => PopupMenuItem(
              value: item,
              child: Text(
                item[0].toUpperCase() + item.substring(1),
                style: const TextStyle(fontSize: 14),
              ),
            )),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.navy : AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: active ? AppColors.navy : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label[0].toUpperCase() + label.substring(1),
              style: TextStyle(color: active ? AppColors.white : AppColors.ink, fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(width: 4),
            Icon(Icons.arrow_drop_down, size: 18, color: active ? AppColors.white : AppColors.muted),
          ],
        ),
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
            Icon(Icons.history_outlined, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            const Text('No audit log entries found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildLogCard(i, _items[i]),
      ),
    );
  }

  Widget _buildLogCard(int index, Map<String, dynamic> log) {
    final createdAt = (log['created_at'] ?? log['createdAt'] ?? log['timestamp'] ?? '').toString();
    final userName = (log['user_name'] ?? log['userName'] ?? log['user']?['name'] ?? '').toString();
    final userEmail = (log['user_email'] ?? log['userEmail'] ?? log['user']?['email'] ?? '').toString();
    final action = (log['action'] ?? '').toString().toLowerCase();
    final entityType = (log['entity_type'] ?? log['entityType'] ?? '').toString();
    final entityId = (log['entity_id'] ?? log['entityId'] ?? '').toString();
    final changes = log['changes'] ?? log['diff'] ?? log['metadata'];
    final isExpanded = _expandedIndex == index;

    final actionColor = _actionColor(action);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: changes != null
            ? () => setState(() => _expandedIndex = isExpanded ? null : index)
            : null,
        child: Padding(
          padding: const EdgeInsets.all(16),
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
                          userName.isNotEmpty ? userName : userEmail,
                          style: const TextStyle(color: AppColors.ink, fontSize: 14, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (userName.isNotEmpty && userEmail.isNotEmpty)
                          Text(userEmail, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: actionColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      action.isNotEmpty ? action[0].toUpperCase() + action.substring(1) : '-',
                      style: TextStyle(color: actionColor, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (entityType.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(entityType, style: const TextStyle(color: AppColors.ink, fontSize: 12, fontWeight: FontWeight.w500)),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (entityId.isNotEmpty)
                    Text('ID: $entityId', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                  const Spacer(),
                  Icon(Icons.access_time, size: 13, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text(formatDate(createdAt), style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                ],
              ),
              if (isExpanded && changes != null) ...[
                const SizedBox(height: 12),
                const Divider(height: 1, color: AppColors.border),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _formatChanges(changes),
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: AppColors.ink),
                  ),
                ),
              ],
              if (changes != null)
                Align(
                  alignment: Alignment.centerRight,
                  child: Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                    color: AppColors.muted,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatChanges(dynamic changes) {
    try {
      if (changes is String) {
        final decoded = jsonDecode(changes);
        return const JsonEncoder.withIndent('  ').convert(decoded);
      }
      return const JsonEncoder.withIndent('  ').convert(changes);
    } catch (_) {
      return changes.toString();
    }
  }

  Widget _buildPagination() {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          OutlinedButton.icon(
            onPressed: _page > 1
                ? () {
                    setState(() => _page--);
                    _loadData();
                  }
                : null,
            icon: const Icon(Icons.chevron_left, size: 18),
            label: const Text('Previous'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.ink,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          Text(
            'Page $_page of $_totalPages',
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          OutlinedButton.icon(
            onPressed: _page < _totalPages
                ? () {
                    setState(() => _page++);
                    _loadData();
                  }
                : null,
            icon: const Text('Next'),
            label: const Icon(Icons.chevron_right, size: 18),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.ink,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }
}
