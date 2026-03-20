import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SettingsEmailScreen extends ConsumerStatefulWidget {
  const SettingsEmailScreen({super.key});
  @override
  ConsumerState<SettingsEmailScreen> createState() => _SettingsEmailScreenState();
}

class _SettingsEmailScreenState extends ConsumerState<SettingsEmailScreen> {
  bool _loading = true;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  final _senderNameCtrl = TextEditingController();
  final _replyToCtrl = TextEditingController();
  final _invoiceSubjectCtrl = TextEditingController();
  final _invoiceBodyCtrl = TextEditingController();
  final _reminderSubjectCtrl = TextEditingController();
  final _reminderBodyCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _senderNameCtrl.dispose();
    _replyToCtrl.dispose();
    _invoiceSubjectCtrl.dispose();
    _invoiceBodyCtrl.dispose();
    _reminderSubjectCtrl.dispose();
    _reminderBodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/settings/email');
      final data = res['data'] ?? res;
      _senderNameCtrl.text = (data['sender_name'] ?? data['senderName'] ?? '').toString();
      _replyToCtrl.text = (data['reply_to_email'] ?? data['replyToEmail'] ?? data['replyTo'] ?? '').toString();

      final templates = data['templates'] ?? data;
      _invoiceSubjectCtrl.text = (templates['invoice_subject'] ?? templates['invoiceSubject'] ?? '').toString();
      _invoiceBodyCtrl.text = (templates['invoice_body'] ?? templates['invoiceBody'] ?? '').toString();
      _reminderSubjectCtrl.text = (templates['reminder_subject'] ?? templates['reminderSubject'] ?? '').toString();
      _reminderBodyCtrl.text = (templates['reminder_body'] ?? templates['reminderBody'] ?? '').toString();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/settings/email', data: {
        'sender_name': _senderNameCtrl.text.trim(),
        'reply_to_email': _replyToCtrl.text.trim(),
        'invoice_subject': _invoiceSubjectCtrl.text.trim(),
        'invoice_body': _invoiceBodyCtrl.text.trim(),
        'reminder_subject': _reminderSubjectCtrl.text.trim(),
        'reminder_body': _reminderBodyCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Email settings saved')),
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
        title: const Text('Email Settings'),
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
                    _buildSectionTitle('Sender Info'),
                    _buildCard([
                      _buildField('Sender Name', _senderNameCtrl),
                      _buildField('Reply-To Email', _replyToCtrl, keyboardType: TextInputType.emailAddress),
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Invoice Email Template'),
                    _buildCard([
                      _buildField('Invoice Subject', _invoiceSubjectCtrl),
                      _buildField('Invoice Body', _invoiceBodyCtrl, maxLines: 4),
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Reminder Email Template'),
                    _buildCard([
                      _buildField('Reminder Subject', _reminderSubjectCtrl),
                      _buildField('Reminder Body', _reminderBodyCtrl, maxLines: 4),
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
