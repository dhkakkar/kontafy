import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/auth/providers/auth_provider.dart';

class ContactListScreen extends ConsumerStatefulWidget {
  const ContactListScreen({super.key});
  @override
  ConsumerState<ContactListScreen> createState() => _ContactListScreenState();
}

class _ContactListScreenState extends ConsumerState<ContactListScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _search = '';
  String _filter = 'all';
  Timer? _debounce;
  final _searchController = TextEditingController();

  static const _filters = ['all', 'customer', 'vendor'];

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
      final res = await api.get('/bill/contacts', queryParameters: params);
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
        title: const Text('Contacts'),
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
                hintText: 'Search contacts...',
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
                  final label = f == 'all' ? 'All' : '${f[0].toUpperCase()}${f.substring(1)}s';
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
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('New Contact'),
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
            Icon(Icons.people_outline, size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No contacts found', style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (context, i) => _buildContactCard(_items[i]),
      ),
    );
  }

  Widget _buildContactCard(Map<String, dynamic> contact) {
    final name = (contact['name'] ?? contact['displayName'] ?? contact['display_name'] ?? '-').toString();
    final email = (contact['email'] ?? '').toString();
    final phone = (contact['phone'] ?? contact['mobile'] ?? '').toString();
    final gstin = (contact['gstin'] ?? contact['gstNumber'] ?? contact['gst_number'] ?? '').toString();
    final type = (contact['type'] ?? contact['contactType'] ?? contact['contact_type'] ?? '').toString().toLowerCase();
    final balance = (contact['outstandingBalance'] ?? contact['outstanding_balance'] ?? contact['balance'] ?? 0).toDouble();

    final initials = name.split(' ').where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

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
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            CircleAvatar(
              radius: 22,
              backgroundColor: type == 'vendor' ? AppColors.purpleLight : AppColors.blueLight,
              child: Text(
                initials.isEmpty ? '?' : initials,
                style: TextStyle(
                  color: type == 'vendor' ? AppColors.purple : AppColors.blue,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Details
            Expanded(
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
                      if (type.isNotEmpty) StatusBadge(status: type),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (email.isNotEmpty)
                    _infoRow(Icons.email_outlined, email),
                  if (phone.isNotEmpty)
                    _infoRow(Icons.phone_outlined, phone),
                  if (gstin.isNotEmpty)
                    _infoRow(Icons.badge_outlined, 'GSTIN: $gstin'),
                  if (balance != 0) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Outstanding: ${formatINR(balance)}',
                      style: TextStyle(
                        color: balance > 0 ? AppColors.red : AppColors.green,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.muted),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: AppColors.inkLight, fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
