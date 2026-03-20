import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class JournalListScreen extends ConsumerStatefulWidget {
  const JournalListScreen({super.key});
  @override
  ConsumerState<JournalListScreen> createState() => _JournalListScreenState();
}

class _JournalListScreenState extends ConsumerState<JournalListScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _search = '';
  String _filter = 'all';
  Timer? _debounce;
  final _searchController = TextEditingController();

  static const _filters = ['all', 'posted', 'draft'];

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
      final params = <String, dynamic>{'limit': 50};
      if (_filter == 'posted') params['posted'] = true;
      if (_filter == 'draft') params['posted'] = false;
      if (_search.isNotEmpty) params['search'] = _search;
      final res =
          await api.get('/books/journal-entries', queryParameters: params);
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
        title: const Text('Journal Entries'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search journal entries...',
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
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18)),
                    side: BorderSide(
                        color: selected ? AppColors.navy : AppColors.border),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                },
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(child: _buildContent()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.pushNamed(context, '/books/journal/new');
          _loadData();
        },
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Entry'),
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
            Icon(Icons.book_outlined,
                size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No journal entries found',
                style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildEntryCard(_items[i]),
      ),
    );
  }

  Widget _buildEntryCard(Map<String, dynamic> entry) {
    final entryNumber = (entry['entry_number'] ??
            entry['entryNumber'] ??
            entry['number'] ??
            '-')
        .toString();
    final narration =
        (entry['narration'] ?? entry['description'] ?? '').toString();
    final date =
        (entry['date'] ?? entry['createdAt'] ?? entry['created_at'] ?? '')
            .toString();
    final isPosted = entry['is_posted'] ?? entry['isPosted'] ?? false;
    final status = isPosted == true ? 'posted' : 'draft';

    final lines = entry['lines'] ?? entry['journal_lines'] ?? [];
    final lineCount = lines is List ? lines.length : 0;

    double debitTotal = 0;
    if (lines is List) {
      for (final line in lines) {
        debitTotal +=
            (line['debit'] ?? line['debit_amount'] ?? 0).toDouble();
      }
    }
    if (debitTotal == 0) {
      debitTotal = (entry['total'] ?? entry['amount'] ?? 0).toDouble();
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
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
                    entryNumber,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            if (narration.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                narration,
                style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w500),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.list, size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(
                  '$lineCount lines',
                  style:
                      const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const SizedBox(width: 16),
                Icon(Icons.calendar_today_outlined,
                    size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(
                  formatDate(date),
                  style:
                      const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const Spacer(),
                Text(
                  formatINR(debitTotal),
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
