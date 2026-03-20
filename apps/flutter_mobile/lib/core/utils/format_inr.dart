import 'package:intl/intl.dart';

String formatINR(num amount) {
  final formatter = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
  return formatter.format(amount);
}

String abbreviateINR(num amount) {
  if (amount.abs() >= 10000000) {
    return '₹${(amount / 10000000).toStringAsFixed(2)} Cr';
  } else if (amount.abs() >= 100000) {
    return '₹${(amount / 100000).toStringAsFixed(2)} L';
  } else if (amount.abs() >= 1000) {
    return '₹${(amount / 1000).toStringAsFixed(1)}K';
  }
  return formatINR(amount);
}

String formatDate(String? dateStr) {
  if (dateStr == null || dateStr.isEmpty) return '-';
  try {
    final date = DateTime.parse(dateStr);
    return DateFormat('dd MMM yyyy').format(date);
  } catch (_) {
    return dateStr;
  }
}

String formatDateShort(String? dateStr) {
  if (dateStr == null || dateStr.isEmpty) return '-';
  try {
    final date = DateTime.parse(dateStr);
    return DateFormat('dd/MM/yy').format(date);
  } catch (_) {
    return dateStr;
  }
}
