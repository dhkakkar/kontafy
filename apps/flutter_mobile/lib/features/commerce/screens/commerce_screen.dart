import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/format_inr.dart';
import '../../auth/providers/auth_provider.dart';

final _commerceStatusProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('/commerce/status');
  final data = res['data'] ?? res;
  if (data is List) return List<Map<String, dynamic>>.from(data);
  return List<Map<String, dynamic>>.from(data['platforms'] ?? []);
});

class CommerceScreen extends ConsumerStatefulWidget {
  const CommerceScreen({super.key});

  @override
  ConsumerState<CommerceScreen> createState() => _CommerceScreenState();
}

class _CommerceScreenState extends ConsumerState<CommerceScreen> {
  static const _platforms = [
    {'key': 'amazon', 'display_name': 'Amazon', 'icon': Icons.shopping_bag},
    {'key': 'flipkart', 'display_name': 'Flipkart', 'icon': Icons.storefront},
    {'key': 'shopify', 'display_name': 'Shopify', 'icon': Icons.store},
    {'key': 'woocommerce', 'display_name': 'WooCommerce', 'icon': Icons.web},
  ];

  bool _syncing = false;

  Future<void> _syncPlatform(String platform) async {
    if (_syncing) return;
    setState(() => _syncing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/commerce/sync/$platform', data: {'type': 'orders'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync started for $platform'),
            backgroundColor: AppColors.green,
          ),
        );
        ref.invalidate(_commerceStatusProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync failed: $e'),
            backgroundColor: AppColors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _disconnectPlatform(String platform) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Platform'),
        content: Text('Are you sure you want to disconnect $platform?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Disconnect', style: TextStyle(color: AppColors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/commerce/disconnect/$platform');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$platform disconnected'),
            backgroundColor: AppColors.green,
          ),
        );
        ref.invalidate(_commerceStatusProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to disconnect: $e'),
            backgroundColor: AppColors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(_commerceStatusProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(_commerceStatusProvider),
      child: statusAsync.when(
        data: (statuses) {
          final statusMap = <String, Map<String, dynamic>>{};
          for (final s in statuses) {
            final key = (s['platform'] ?? s['key'] ?? '').toString().toLowerCase();
            if (key.isNotEmpty) statusMap[key] = s;
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _platforms.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final platform = _platforms[index];
              final key = platform['key'] as String;
              final displayName = platform['display_name'] as String;
              final icon = platform['icon'] as IconData;
              final status = statusMap[key];
              final connected = status?['connected'] == true;
              final storeName = status?['store_name'] ?? '';
              final lastSynced = status?['last_synced_at'] ?? '';

              return Card(
                elevation: 0,
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
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: connected
                                  ? AppColors.green.withOpacity(0.1)
                                  : AppColors.borderLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              icon,
                              color: connected ? AppColors.green : AppColors.muted,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  displayName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                    color: AppColors.ink,
                                  ),
                                ),
                                if (storeName.toString().isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    storeName.toString(),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: connected
                                  ? AppColors.green.withOpacity(0.1)
                                  : AppColors.borderLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              connected ? 'Connected' : 'Not Connected',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: connected ? AppColors.green : AppColors.muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (connected && lastSynced.toString().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Last synced: ${formatDate(lastSynced.toString())}',
                          style: TextStyle(fontSize: 12, color: AppColors.muted),
                        ),
                      ],
                      const SizedBox(height: 12),
                      if (connected)
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _syncing
                                    ? null
                                    : () => _syncPlatform(key),
                                icon: _syncing
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.sync, size: 18),
                                label: const Text('Sync'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.navy,
                                  side: const BorderSide(color: AppColors.border),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _disconnectPlatform(key),
                                icon: const Icon(Icons.link_off, size: 18),
                                label: const Text('Disconnect'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.red,
                                  side: BorderSide(color: AppColors.red.withOpacity(0.3)),
                                ),
                              ),
                            ),
                          ],
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Use web app to connect'),
                                ),
                              );
                            },
                            icon: const Icon(Icons.add_link, size: 18),
                            label: const Text('Connect'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.navy,
                              side: const BorderSide(color: AppColors.border),
                            ),
                          ),
                        ),
                    ],
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
            itemCount: 4,
            itemBuilder: (_, __) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shopping_bag_outlined, size: 56, color: AppColors.muted),
              const SizedBox(height: 12),
              Text(
                'Manage your marketplace integrations',
                style: TextStyle(color: AppColors.muted, fontSize: 15),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => ref.invalidate(_commerceStatusProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
