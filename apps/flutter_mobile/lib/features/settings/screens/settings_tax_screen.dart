import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SettingsTaxScreen extends ConsumerStatefulWidget {
  const SettingsTaxScreen({super.key});
  @override
  ConsumerState<SettingsTaxScreen> createState() => _SettingsTaxScreenState();
}

class _SettingsTaxScreenState extends ConsumerState<SettingsTaxScreen> {
  bool _loading = true;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  final _gstinCtrl = TextEditingController();
  final _panCtrl = TextEditingController();
  final _cinCtrl = TextEditingController();
  final _tanCtrl = TextEditingController();
  final _compositionRateCtrl = TextEditingController();
  final _cessRateCtrl = TextEditingController();

  String? _selectedState;
  String _taxRegime = 'regular';

  static const _defaultGstRates = [0, 5, 12, 18, 28];

  static const _indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _gstinCtrl.dispose();
    _panCtrl.dispose();
    _cinCtrl.dispose();
    _tanCtrl.dispose();
    _compositionRateCtrl.dispose();
    _cessRateCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/settings/tax');
      final data = res['data'] ?? res;
      _gstinCtrl.text = (data['gstin'] ?? '').toString();
      _panCtrl.text = (data['pan'] ?? '').toString();
      _cinCtrl.text = (data['cin'] ?? '').toString();
      _tanCtrl.text = (data['tan'] ?? '').toString();
      _selectedState = (data['state'] ?? '').toString();
      if (_selectedState != null && _selectedState!.isEmpty) _selectedState = null;
      _taxRegime = (data['tax_regime'] ?? data['taxRegime'] ?? 'regular').toString().toLowerCase();
      _compositionRateCtrl.text = (data['composition_rate'] ?? data['compositionRate'] ?? '').toString();
      _cessRateCtrl.text = (data['cess_rate'] ?? data['cessRate'] ?? '').toString();
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/settings/tax', data: {
        'gstin': _gstinCtrl.text.trim(),
        'pan': _panCtrl.text.trim(),
        'cin': _cinCtrl.text.trim(),
        'tan': _tanCtrl.text.trim(),
        'state': _selectedState ?? '',
        'tax_regime': _taxRegime,
        'composition_rate': _compositionRateCtrl.text.trim(),
        'cess_rate': _cessRateCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tax settings saved')),
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
        title: const Text('Tax Settings'),
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
                    _buildSectionTitle('Tax Identification'),
                    _buildCard([
                      _buildField('GSTIN', _gstinCtrl),
                      _buildField('PAN', _panCtrl),
                      _buildField('CIN', _cinCtrl),
                      _buildField('TAN', _tanCtrl),
                      _buildDropdown('State', _selectedState, _indianStates, (v) {
                        setState(() => _selectedState = v);
                      }),
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Tax Regime'),
                    _buildCard([
                      _buildSegmentedControl(),
                      if (_taxRegime == 'composition') ...[
                        const SizedBox(height: 14),
                        _buildField('Composition Rate (%)', _compositionRateCtrl, keyboardType: TextInputType.number),
                      ],
                    ]),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Default GST Rates'),
                    Card(
                      elevation: 0,
                      color: AppColors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            ..._defaultGstRates.map((rate) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    padding: const EdgeInsets.symmetric(vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppColors.navy.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '$rate%',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: AppColors.navy,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    rate == 0 ? 'Exempt / Nil rated' : 'GST @ $rate%',
                                    style: const TextStyle(color: AppColors.ink, fontSize: 14),
                                  ),
                                ],
                              ),
                            )),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    _buildSectionTitle('Cess'),
                    _buildCard([
                      _buildField('Cess Rate (%)', _cessRateCtrl, keyboardType: TextInputType.number),
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

  Widget _buildSegmentedControl() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _taxRegime = 'regular'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: _taxRegime == 'regular' ? AppColors.navy : AppColors.surface,
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)),
                border: Border.all(color: _taxRegime == 'regular' ? AppColors.navy : AppColors.border),
              ),
              child: Text(
                'Regular',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _taxRegime == 'regular' ? AppColors.white : AppColors.ink,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ),
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _taxRegime = 'composition'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: _taxRegime == 'composition' ? AppColors.navy : AppColors.surface,
                borderRadius: const BorderRadius.horizontal(right: Radius.circular(10)),
                border: Border.all(color: _taxRegime == 'composition' ? AppColors.navy : AppColors.border),
              ),
              child: Text(
                'Composition',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _taxRegime == 'composition' ? AppColors.white : AppColors.ink,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ),
      ],
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

  Widget _buildDropdown(String label, String? value, List<String> items, ValueChanged<String?> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DropdownButtonFormField<String>(
        value: value != null && items.contains(value) ? value : null,
        items: items.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 14)))).toList(),
        onChanged: onChanged,
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
        isExpanded: true,
      ),
    );
  }
}
