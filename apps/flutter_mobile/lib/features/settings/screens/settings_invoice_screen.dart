import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SettingsInvoiceScreen extends ConsumerStatefulWidget {
  const SettingsInvoiceScreen({super.key});
  @override
  ConsumerState<SettingsInvoiceScreen> createState() => _SettingsInvoiceScreenState();
}

class _SettingsInvoiceScreenState extends ConsumerState<SettingsInvoiceScreen> {
  bool _loading = true;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  final _invoicePrefixCtrl = TextEditingController();
  final _nextInvoiceNumberCtrl = TextEditingController();
  final _defaultPaymentTermsCtrl = TextEditingController();
  final _defaultNotesCtrl = TextEditingController();
  final _defaultTermsCtrl = TextEditingController();
  final _quotationPrefixCtrl = TextEditingController();
  final _purchasePrefixCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _invoicePrefixCtrl.dispose();
    _nextInvoiceNumberCtrl.dispose();
    _defaultPaymentTermsCtrl.dispose();
    _defaultNotesCtrl.dispose();
    _defaultTermsCtrl.dispose();
    _quotationPrefixCtrl.dispose();
    _purchasePrefixCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/settings/invoice-config');
      final data = res['data'] ?? res;
      _invoicePrefixCtrl.text = (data['invoice_prefix'] ?? data['invoicePrefix'] ?? '').toString();
      _nextInvoiceNumberCtrl.text = (data['next_invoice_number'] ?? data['nextInvoiceNumber'] ?? '').toString();
      _defaultPaymentTermsCtrl.text = (data['default_payment_terms'] ?? data['defaultPaymentTerms'] ?? '').toString();
      _defaultNotesCtrl.text = (data['default_notes'] ?? data['defaultNotes'] ?? '').toString();
      _defaultTermsCtrl.text = (data['default_terms'] ?? data['defaultTerms'] ?? '').toString();
      _quotationPrefixCtrl.text = (data['quotation_prefix'] ?? data['quotationPrefix'] ?? '').toString();
      _purchasePrefixCtrl.text = (data['purchase_prefix'] ?? data['purchasePrefix'] ?? '').toString();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/settings/invoice-config', data: {
        'invoice_prefix': _invoicePrefixCtrl.text.trim(),
        'next_invoice_number': _nextInvoiceNumberCtrl.text.trim(),
        'default_payment_terms': _defaultPaymentTermsCtrl.text.trim(),
        'default_notes': _defaultNotesCtrl.text.trim(),
        'default_terms': _defaultTermsCtrl.text.trim(),
        'quotation_prefix': _quotationPrefixCtrl.text.trim(),
        'purchase_prefix': _purchasePrefixCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invoice settings saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Invoice Settings'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionTitle('Invoice Numbering'),
                    _buildCard([
                      _buildField('Invoice Prefix', _invoicePrefixCtrl),
                      _buildField('Next Invoice Number', _nextInvoiceNumberCtrl, keyboardType: TextInputType.number),
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Other Prefixes'),
                    _buildCard([
                      _buildField('Quotation Prefix', _quotationPrefixCtrl),
                      _buildField('Purchase Prefix', _purchasePrefixCtrl),
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Defaults'),
                    _buildCard([
                      _buildField('Default Payment Terms (days)', _defaultPaymentTermsCtrl, keyboardType: TextInputType.number),
                      _buildField('Default Notes', _defaultNotesCtrl, maxLines: 4),
                      _buildField('Default Terms & Conditions', _defaultTermsCtrl, maxLines: 4),
                    ]),
                    const SizedBox(height: 24),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.navy,
                          foregroundColor: AppColors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _saving
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                            : const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Card(
      elevation: 0,
      color: AppColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: children),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller,
      {TextInputType? keyboardType, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.navy),
          ),
        ),
      ),
    );
  }
}
