import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';

class SettingsHubScreen extends StatelessWidget {
  const SettingsHubScreen({super.key});

  static const _sections = [
    _SettingsSection(
      title: 'General',
      items: [
        _SettingsItem(icon: Icons.business_outlined, label: 'Organization', route: '/settings/organization'),
        _SettingsItem(icon: Icons.email_outlined, label: 'Email', route: '/settings/email'),
        _SettingsItem(icon: Icons.group_outlined, label: 'Team', route: '/settings/team'),
      ],
    ),
    _SettingsSection(
      title: 'Billing & Tax',
      items: [
        _SettingsItem(icon: Icons.calculate_outlined, label: 'Tax', route: '/settings/tax'),
        _SettingsItem(icon: Icons.receipt_long_outlined, label: 'Invoice Settings', route: '/settings/invoice'),
      ],
    ),
    _SettingsSection(
      title: 'Advanced',
      items: [
        _SettingsItem(icon: Icons.auto_awesome_outlined, label: 'AI', route: '/settings/ai'),
        _SettingsItem(icon: Icons.storage_outlined, label: 'Data Management', route: '/settings/data'),
        _SettingsItem(icon: Icons.upload_file_outlined, label: 'Import', route: '/settings/import'),
        _SettingsItem(icon: Icons.extension_outlined, label: 'Integrations', route: '/settings/integrations'),
      ],
    ),
    _SettingsSection(
      title: 'Audit & Compliance',
      items: [
        _SettingsItem(icon: Icons.history_outlined, label: 'Audit Log', route: '/settings/audit-log'),
        _SettingsItem(icon: Icons.assignment_ind_outlined, label: 'CA Settings', route: '/settings/ca'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _sections.map((section) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 8, top: 8),
                child: Text(
                  section.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.muted,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Card(
                child: Column(
                  children: section.items.asMap().entries.map((entry) {
                    final item = entry.value;
                    final isLast = entry.key == section.items.length - 1;
                    return Column(
                      children: [
                        ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.navy.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(item.icon, size: 20, color: AppColors.navy),
                          ),
                          title: Text(
                            item.label,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                          ),
                          trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
                          onTap: () => context.push(item.route),
                        ),
                        if (!isLast)
                          const Divider(height: 1, indent: 60),
                      ],
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 8),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _SettingsSection {
  final String title;
  final List<_SettingsItem> items;

  const _SettingsSection({required this.title, required this.items});
}

class _SettingsItem {
  final IconData icon;
  final String label;
  final String route;

  const _SettingsItem({required this.icon, required this.label, required this.route});
}
