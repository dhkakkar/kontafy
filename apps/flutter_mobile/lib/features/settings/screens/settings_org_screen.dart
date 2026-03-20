import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../features/auth/providers/auth_provider.dart';

class SettingsOrgScreen extends ConsumerStatefulWidget {
  const SettingsOrgScreen({super.key});
  @override
  ConsumerState<SettingsOrgScreen> createState() => _SettingsOrgScreenState();
}

class _SettingsOrgScreenState extends ConsumerState<SettingsOrgScreen> {
  bool _loading = true;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  final _companyNameCtrl = TextEditingController();
  final _legalNameCtrl = TextEditingController();
  final _gstinCtrl = TextEditingController();
  final _panCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _websiteCtrl = TextEditingController();
  final _line1Ctrl = TextEditingController();
  final _line2Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();

  String? _selectedState;
  String? _logoUrl;

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
    _companyNameCtrl.dispose();
    _legalNameCtrl.dispose();
    _gstinCtrl.dispose();
    _panCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _websiteCtrl.dispose();
    _line1Ctrl.dispose();
    _line2Ctrl.dispose();
    _cityCtrl.dispose();
    _pincodeCtrl.dispose();
    _countryCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/settings/organization');
      final data = res['data'] ?? res;
      _companyNameCtrl.text = (data['company_name'] ?? data['companyName'] ?? '').toString();
      _legalNameCtrl.text = (data['legal_name'] ?? data['legalName'] ?? '').toString();
      _gstinCtrl.text = (data['gstin'] ?? '').toString();
      _panCtrl.text = (data['pan'] ?? '').toString();
      _phoneCtrl.text = (data['phone'] ?? '').toString();
      _emailCtrl.text = (data['email'] ?? '').toString();
      _websiteCtrl.text = (data['website'] ?? '').toString();
      _logoUrl = (data['logo'] ?? data['logoUrl'] ?? data['logo_url'])?.toString();

      final address = data['address'] ?? {};
      if (address is Map) {
        _line1Ctrl.text = (address['line1'] ?? address['addressLine1'] ?? '').toString();
        _line2Ctrl.text = (address['line2'] ?? address['addressLine2'] ?? '').toString();
        _cityCtrl.text = (address['city'] ?? '').toString();
        _selectedState = (address['state'] ?? '').toString();
        if (_selectedState != null && _selectedState!.isEmpty) _selectedState = null;
        _pincodeCtrl.text = (address['pincode'] ?? address['zip'] ?? '').toString();
        _countryCtrl.text = (address['country'] ?? 'India').toString();
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/settings/organization', data: {
        'company_name': _companyNameCtrl.text.trim(),
        'legal_name': _legalNameCtrl.text.trim(),
        'gstin': _gstinCtrl.text.trim(),
        'pan': _panCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'website': _websiteCtrl.text.trim(),
        'address': {
          'line1': _line1Ctrl.text.trim(),
          'line2': _line2Ctrl.text.trim(),
          'city': _cityCtrl.text.trim(),
          'state': _selectedState ?? '',
          'pincode': _pincodeCtrl.text.trim(),
          'country': _countryCtrl.text.trim(),
        },
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Organization settings saved')),
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
        title: const Text('Organization Settings'),
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
                    // Logo section
                    _buildSectionTitle('Logo'),
                    Card(
                      elevation: 0,
                      color: AppColors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Center(
                          child: _logoUrl != null && _logoUrl!.isNotEmpty
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    _logoUrl!,
                                    height: 80,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => _buildLogoPlaceholder(),
                                  ),
                                )
                              : _buildLogoPlaceholder(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Company Details
                    _buildSectionTitle('Company Details'),
                    _buildCard([
                      _buildField('Company Name', _companyNameCtrl, required: true),
                      _buildField('Legal Name', _legalNameCtrl),
                      _buildField('GSTIN', _gstinCtrl),
                      _buildField('PAN', _panCtrl),
                      _buildField('Phone', _phoneCtrl, keyboardType: TextInputType.phone),
                      _buildField('Email', _emailCtrl, keyboardType: TextInputType.emailAddress),
                      _buildField('Website', _websiteCtrl, keyboardType: TextInputType.url),
                    ]),
                    const SizedBox(height: 20),

                    // Address
                    _buildSectionTitle('Address'),
                    _buildCard([
                      _buildField('Address Line 1', _line1Ctrl),
                      _buildField('Address Line 2', _line2Ctrl),
                      _buildField('City', _cityCtrl),
                      _buildDropdown('State', _selectedState, _indianStates, (v) {
                        setState(() => _selectedState = v);
                      }),
                      _buildField('Pincode', _pincodeCtrl, keyboardType: TextInputType.number),
                      _buildField('Country', _countryCtrl),
                    ]),
                    const SizedBox(height: 24),

                    // Save button
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

  Widget _buildLogoPlaceholder() {
    return Container(
      height: 80,
      width: 80,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: const Icon(Icons.business_outlined, size: 36, color: AppColors.muted),
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
      {bool required = false, TextInputType? keyboardType, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        validator: required
            ? (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null
            : null,
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
