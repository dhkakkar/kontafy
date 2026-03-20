import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.$2,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        config.$1,
        style: TextStyle(
          color: config.$3,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (String, Color, Color) _getConfig(String s) {
    switch (s.toLowerCase()) {
      case 'paid':
      case 'applied':
      case 'success':
      case 'active':
        return ('Paid', AppColors.greenLight.withOpacity(0.3), AppColors.green);
      case 'draft':
        return ('Draft', AppColors.borderLight, AppColors.muted);
      case 'sent':
      case 'issued':
      case 'pending':
        return (
          s[0].toUpperCase() + s.substring(1),
          AppColors.blueLight,
          AppColors.blue,
        );
      case 'overdue':
      case 'cancelled':
      case 'failed':
        return (
          s[0].toUpperCase() + s.substring(1),
          AppColors.redLight,
          AppColors.red,
        );
      case 'partially_paid':
        return ('Partial', AppColors.amberLight, AppColors.amber);
      default:
        return (s, AppColors.borderLight, AppColors.muted);
    }
  }
}
