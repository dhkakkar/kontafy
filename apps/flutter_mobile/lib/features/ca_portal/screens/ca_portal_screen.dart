import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

final _caClientsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/ca/clients');
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['clients'] ?? []);
});

class CaPortalScreen extends ConsumerStatefulWidget {
  const CaPortalScreen({super.key});

  @override
  ConsumerState<CaPortalScreen> createState() => _CaPortalScreenState();
}

class _CaPortalScreenState extends ConsumerState<CaPortalScreen> {
  String _search = '';

  Color _businessTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'proprietorship':
        return AppColors.blue;
      case 'partnership':
        return AppColors.purple;
      case 'llp':
        return AppColors.amber;
      case 'pvt_ltd':
      case 'private_limited':
        return AppColors.green;
      case 'public_limited':
        return AppColors.navy;
      default:
        return AppColors.muted;
    }
  }

  Color _businessTypeBg(String type) {
    switch (type.toLowerCase()) {
      case 'proprietorship':
        return AppColors.blueLight;
      case 'partnership':
        return AppColors.purpleLight;
      case 'llp':
        return AppColors.amberLight;
      case 'pvt_ltd':
      case 'private_limited':
        return AppColors.green.withOpacity(0.1);
      case 'public_limited':
        return AppColors.navy.withOpacity(0.1);
      default:
        return AppColors.borderLight;
    }
  }

  String _businessTypeLabel(String type) {
    switch (type.toLowerCase()) {
      case 'proprietorship':
        return 'Proprietorship';
      case 'partnership':
        return 'Partnership';
      case 'llp':
        return 'LLP';
      case 'pvt_ltd':
      case 'private_limited':
        return 'Pvt Ltd';
      case 'public_limited':
        return 'Public Ltd';
      default:
        return type.replaceAll('_', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(_caClientsProvider);

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search clients...',
              hintStyle: TextStyle(color: AppColors.muted, fontSize: 14),
              prefixIcon: const Icon(Icons.search, color: AppColors.muted),
              filled: true,
              fillColor: AppColors.borderLight,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.navy, width: 1.5),
              ),
            ),
          ),
        ),

        // Client list
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => ref.invalidate(_caClientsProvider),
            child: clientsAsync.when(
              data: (clients) {
                final filtered = _search.isEmpty
                    ? clients
                    : clients.where((c) {
                        final name =
                            (c['name'] ?? '').toString().toLowerCase();
                        final legalName =
                            (c['legalName'] ?? c['legal_name'] ?? '')
                                .toString()
                                .toLowerCase();
                        final gstin =
                            (c['gstin'] ?? '').toString().toLowerCase();
                        final q = _search.toLowerCase();
                        return name.contains(q) ||
                            legalName.contains(q) ||
                            gstin.contains(q);
                      }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.assignment_ind_outlined,
                            size: 56, color: AppColors.muted),
                        const SizedBox(height: 12),
                        Text(
                          'No CA clients found',
                          style:
                              TextStyle(color: AppColors.muted, fontSize: 15),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final client = filtered[index];
                    final name = client['name'] ?? '-';
                    final legalName =
                        client['legalName'] ?? client['legal_name'] ?? '';
                    final gstin = client['gstin'] ?? '';
                    final businessType =
                        client['businessType'] ?? client['business_type'] ?? '';
                    final joinedAt =
                        client['joinedAt'] ?? client['joined_at'] ?? '';
                    final permissions = client['permissions'];

                    List<String> permList = [];
                    if (permissions is List) {
                      permList = permissions
                          .map((p) => p.toString())
                          .toList();
                    }

                    return GestureDetector(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Client details coming soon'),
                          ),
                        );
                      },
                      child: Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: AppColors.border),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: AppColors.navy.withOpacity(0.1),
                                    child: Text(
                                      name.toString().isNotEmpty
                                          ? name.toString()[0].toUpperCase()
                                          : '?',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.navy,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name.toString(),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                            color: AppColors.ink,
                                          ),
                                        ),
                                        if (legalName.toString().isNotEmpty) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            legalName.toString(),
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: AppColors.muted,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  if (businessType.toString().isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _businessTypeBg(
                                            businessType.toString()),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        _businessTypeLabel(
                                            businessType.toString()),
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: _businessTypeColor(
                                              businessType.toString()),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (gstin.toString().isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Icon(Icons.badge_outlined,
                                        size: 16, color: AppColors.muted),
                                    const SizedBox(width: 6),
                                    Text(
                                      gstin.toString(),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        color: AppColors.ink,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              if (joinedAt.toString().isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(Icons.calendar_today_outlined,
                                        size: 14, color: AppColors.muted),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Joined: ${formatDate(joinedAt.toString())}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              if (permList.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: permList.map((perm) {
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.borderLight,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        perm,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: AppColors.muted,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => Shimmer.fromColors(
                baseColor: AppColors.borderLight,
                highlightColor: AppColors.white,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: 6,
                  itemBuilder: (_, __) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Container(
                      height: 100,
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),
              error: (_, __) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.assignment_ind_outlined,
                        size: 56, color: AppColors.muted),
                    const SizedBox(height: 12),
                    Text(
                      'No CA clients found',
                      style: TextStyle(color: AppColors.muted, fontSize: 15),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => ref.invalidate(_caClientsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
