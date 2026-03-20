import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../../features/auth/providers/auth_provider.dart';

class ChartOfAccountsScreen extends ConsumerStatefulWidget {
  const ChartOfAccountsScreen({super.key});
  @override
  ConsumerState<ChartOfAccountsScreen> createState() =>
      _ChartOfAccountsScreenState();
}

class _ChartOfAccountsScreenState
    extends ConsumerState<ChartOfAccountsScreen> {
  List<Map<String, dynamic>> _tree = [];
  List<Map<String, dynamic>> _flatAccounts = [];
  bool _loading = true;
  String _search = '';
  Timer? _debounce;
  final _searchController = TextEditingController();
  final Set<String> _expanded = {};

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
      final res = await api.get('/books/accounts/tree');
      final data = res['data'] ?? res;
      final flatRes = await api.get('/books/accounts');
      final flatData = flatRes['data'] ?? flatRes;
      setState(() {
        _tree = List<Map<String, dynamic>>.from(data is List ? data : []);
        _flatAccounts =
            List<Map<String, dynamic>>.from(flatData is List ? flatData : []);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      setState(() => _search = value.trim().toLowerCase());
    });
  }

  Color _typeColor(String type) {
    switch (type.toLowerCase()) {
      case 'asset':
        return AppColors.blue;
      case 'liability':
        return AppColors.amber;
      case 'equity':
        return AppColors.muted;
      case 'income':
        return AppColors.green;
      case 'expense':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  Color _typeBgColor(String type) {
    switch (type.toLowerCase()) {
      case 'asset':
        return AppColors.blueLight;
      case 'liability':
        return AppColors.amberLight;
      case 'equity':
        return AppColors.borderLight;
      case 'income':
        return const Color(0xFFD1FAE5);
      case 'expense':
        return AppColors.redLight;
      default:
        return AppColors.borderLight;
    }
  }

  bool _matchesSearch(Map<String, dynamic> node) {
    if (_search.isEmpty) return true;
    final name = (node['name'] ?? '').toString().toLowerCase();
    final code = (node['code'] ?? '').toString().toLowerCase();
    if (name.contains(_search) || code.contains(_search)) return true;
    final children = node['children'];
    if (children is List) {
      for (final child in children) {
        if (_matchesSearch(Map<String, dynamic>.from(child))) return true;
      }
    }
    return false;
  }

  List<Widget> _buildTreeItems(
      List<Map<String, dynamic>> nodes, int depth) {
    final widgets = <Widget>[];
    for (final node in nodes) {
      if (!_matchesSearch(node)) continue;
      final id = (node['id'] ?? node['code'] ?? '').toString();
      final children = node['children'];
      final hasChildren = children is List && (children).isNotEmpty;
      final isExpanded = _expanded.contains(id);

      widgets.add(_buildAccountTile(node, depth, hasChildren, isExpanded, id));

      if (hasChildren && isExpanded) {
        widgets.addAll(_buildTreeItems(
          List<Map<String, dynamic>>.from(children),
          depth + 1,
        ));
      }
    }
    return widgets;
  }

  Widget _buildAccountTile(Map<String, dynamic> node, int depth,
      bool hasChildren, bool isExpanded, String id) {
    final code = (node['code'] ?? '').toString();
    final name = (node['name'] ?? '').toString();
    final type = (node['type'] ?? '').toString();
    final balance =
        (node['balance'] ?? 0).toDouble();

    return InkWell(
      onTap: hasChildren
          ? () {
              setState(() {
                if (isExpanded) {
                  _expanded.remove(id);
                } else {
                  _expanded.add(id);
                }
              });
            }
          : null,
      child: Container(
        padding: EdgeInsets.only(
          left: 16.0 + depth * 24.0,
          right: 16,
          top: 12,
          bottom: 12,
        ),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: Row(
          children: [
            if (hasChildren)
              Icon(
                isExpanded ? Icons.expand_more : Icons.chevron_right,
                size: 20,
                color: AppColors.muted,
              )
            else
              const SizedBox(width: 20),
            const SizedBox(width: 8),
            Icon(
              hasChildren ? Icons.folder_outlined : Icons.description_outlined,
              size: 20,
              color: hasChildren ? AppColors.navy : AppColors.muted,
            ),
            const SizedBox(width: 12),
            if (code.isNotEmpty) ...[
              Text(
                code,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                name,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: hasChildren ? FontWeight.w600 : FontWeight.w500,
                  color: AppColors.ink,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            if (type.isNotEmpty)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _typeBgColor(type),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  type[0].toUpperCase() + type.substring(1),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _typeColor(type),
                  ),
                ),
              ),
            const SizedBox(width: 10),
            Text(
              formatINR(balance),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNewAccountSheet() {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    String selectedType = 'asset';
    String? selectedParentId;
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'New Account',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: 'Account Name',
                      labelStyle: TextStyle(color: AppColors.muted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.navy),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: codeCtrl,
                    decoration: InputDecoration(
                      labelText: 'Account Code',
                      labelStyle: TextStyle(color: AppColors.muted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.navy),
                      ),
                    ),
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: selectedType,
                    decoration: InputDecoration(
                      labelText: 'Account Type',
                      labelStyle: TextStyle(color: AppColors.muted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.navy),
                      ),
                    ),
                    items: ['asset', 'liability', 'equity', 'income', 'expense']
                        .map((t) => DropdownMenuItem(
                              value: t,
                              child: Row(
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      color: _typeColor(t),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(t[0].toUpperCase() + t.substring(1)),
                                ],
                              ),
                            ))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) {
                        setSheetState(() => selectedType = v);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String?>(
                    value: selectedParentId,
                    decoration: InputDecoration(
                      labelText: 'Parent Account (optional)',
                      labelStyle: TextStyle(color: AppColors.muted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.navy),
                      ),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('None (top-level)'),
                      ),
                      ..._flatAccounts.map((a) {
                        final aId = (a['id'] ?? '').toString();
                        final aName = (a['name'] ?? '').toString();
                        final aCode = (a['code'] ?? '').toString();
                        return DropdownMenuItem<String?>(
                          value: aId,
                          child: Text(
                            aCode.isNotEmpty ? '$aCode - $aName' : aName,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }),
                    ],
                    onChanged: (v) {
                      setSheetState(() => selectedParentId = v);
                    },
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: saving
                          ? null
                          : () async {
                              if (nameCtrl.text.trim().isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                          Text('Account name is required')),
                                );
                                return;
                              }
                              setSheetState(() => saving = true);
                              try {
                                final api = ref.read(apiClientProvider);
                                final body = <String, dynamic>{
                                  'name': nameCtrl.text.trim(),
                                  'code': codeCtrl.text.trim(),
                                  'type': selectedType,
                                };
                                if (selectedParentId != null) {
                                  body['parent_id'] = selectedParentId;
                                }
                                await api.post('/books/accounts', data: body);
                                if (ctx.mounted) Navigator.pop(ctx);
                                _loadData();
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content:
                                            Text('Account created successfully')),
                                  );
                                }
                              } catch (e) {
                                setSheetState(() => saving = false);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                        content: Text(
                                            'Error: ${e.toString()}')),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.navy,
                        foregroundColor: AppColors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.white,
                              ),
                            )
                          : const Text(
                              'Create Account',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Chart of Accounts'),
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
                hintText: 'Search accounts...',
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
          Expanded(child: _buildContent()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showNewAccountSheet,
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Account'),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    final treeWidgets = _buildTreeItems(_tree, 0);
    if (treeWidgets.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_tree_outlined,
                size: 64, color: AppColors.muted.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text('No accounts found',
                style: TextStyle(color: AppColors.muted, fontSize: 16)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        children: treeWidgets,
      ),
    );
  }
}
