package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.CreateWarehouseRequest
import com.kontafy.desktop.api.WarehouseDto
import com.kontafy.desktop.api.WarehouseModel
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.WarehouseRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun WarehouseScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    warehouseRepository: WarehouseRepository = WarehouseRepository(),
    showSnackbar: (String) -> Unit = {},
) {
    var warehouses by remember { mutableStateOf<List<WarehouseDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadWarehouses() {
        scope.launch {
            isLoading = true
            val dbWarehouses = try {
                warehouseRepository.getByOrgId(currentOrgId).map { it.toDto() }
            } catch (e: Exception) {
                e.printStackTrace()
                showSnackbar("Failed to load warehouses: ${e.message}")
                emptyList()
            }

            if (dbWarehouses.isNotEmpty()) {
                warehouses = dbWarehouses
            } else {
                val result = apiClient.getWarehouses()
                result.fold(
                    onSuccess = { warehouses = it },
                    onFailure = { e ->
                        e.printStackTrace()
                        showSnackbar("Failed to fetch warehouses: ${e.message}")
                    },
                )
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadWarehouses() }

    if (showAddDialog) {
        AddWarehouseDialog(
            apiClient = apiClient,
            currentOrgId = currentOrgId,
            warehouseRepository = warehouseRepository,
            onDismiss = { showAddDialog = false },
            onSaved = {
                showAddDialog = false
                loadWarehouses()
                showSnackbar("Warehouse created successfully")
            },
            onError = { showSnackbar(it) },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Warehouses",
            actions = {
                KontafyButton(
                    text = "Add Warehouse",
                    onClick = { showAddDialog = true },
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (warehouses.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No warehouses", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Muted)
                    Spacer(Modifier.height(8.dp))
                    Text("Add your first warehouse to manage inventory locations", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.MutedLight)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        StatCard(
                            title = "Total Warehouses",
                            value = warehouses.size.toString(),
                            icon = Icons.Outlined.Store,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Total Products",
                            value = warehouses.sumOf { it.productCount }.toString(),
                            icon = Icons.Outlined.Inventory,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Total Stock Value",
                            value = formatCurrency(warehouses.sumOf { it.totalValue }),
                            icon = Icons.Outlined.AccountBalance,
                            iconBackground = Color(0xFFFEF3C7),
                            iconTint = KontafyColors.Warning,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                items(warehouses) { warehouse ->
                    WarehouseCard(warehouse = warehouse)
                }
            }
        }
    }
}

@Composable
private fun WarehouseCard(
    warehouse: WarehouseDto,
    modifier: Modifier = Modifier,
) {
    val locationParts = listOfNotNull(warehouse.city, warehouse.state, warehouse.country).filter { it.isNotBlank() }
    val locationText = locationParts.joinToString(", ")

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(12.dp),
                color = KontafyColors.Navy.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Outlined.Store,
                        contentDescription = warehouse.name,
                        tint = KontafyColors.Navy,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            Spacer(Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    warehouse.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                warehouse.address?.let { addr ->
                    Spacer(Modifier.height(4.dp))
                    Text(addr, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                }
                if (locationText.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(locationText, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                }
                warehouse.pincode?.let { pin ->
                    if (pin.isNotBlank()) {
                        Text("PIN: $pin", style = MaterialTheme.typography.labelSmall, color = KontafyColors.MutedLight)
                    }
                }
            }

            Column(
                modifier = Modifier.width(120.dp),
                horizontalAlignment = Alignment.End,
            ) {
                Text(
                    "${warehouse.productCount} products",
                    style = MaterialTheme.typography.bodyMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    formatCurrency(warehouse.totalValue),
                    style = MaterialTheme.typography.bodyMedium,
                    color = KontafyColors.Green,
                    fontWeight = FontWeight.SemiBold,
                )
                Text("stock value", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
            }
        }
    }
}

@Composable
private fun AddWarehouseDialog(
    apiClient: ApiClient,
    currentOrgId: String,
    warehouseRepository: WarehouseRepository,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    onError: (String) -> Unit = {},
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var selectedCountry by remember { mutableStateOf<DropdownItem<String>?>(DropdownItem("India", "India")) }
    var selectedState by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var pincode by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val countryItems = remember {
        listOf(
            "India", "United States", "United Kingdom", "Canada", "Australia",
            "Singapore", "UAE", "Saudi Arabia", "Germany", "France",
            "Japan", "China", "South Korea", "Brazil", "South Africa",
            "Nepal", "Sri Lanka", "Bangladesh", "Malaysia", "Indonesia",
        ).map { DropdownItem(it, it) }
    }

    val indianStates = remember {
        listOf(
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
            "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
            "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
            "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
            "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
            "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
        ).map { DropdownItem(it, it) }
    }

    KontafyDialog(
        title = "Add Warehouse",
        onDismiss = onDismiss,
        actions = {
            KontafyButton(
                text = "Cancel",
                onClick = onDismiss,
                variant = ButtonVariant.Outline,
            )
            KontafyButton(
                text = "Save",
                onClick = {
                    nameError = name.isBlank()
                    if (!nameError) {
                        isSaving = true
                        scope.launch {
                            var savedLocally = false
                            try {
                                val model = WarehouseModel(
                                    id = "wh-${System.currentTimeMillis()}",
                                    orgId = currentOrgId,
                                    name = name.trim(),
                                    address = address.trim().ifBlank { null },
                                    city = city.trim().ifBlank { null },
                                    state = selectedState?.value,
                                    country = selectedCountry?.value,
                                    pincode = pincode.trim().ifBlank { null },
                                )
                                warehouseRepository.create(model)
                                savedLocally = true
                            } catch (e: Exception) {
                                e.printStackTrace()
                                onError("Failed to save warehouse locally: ${e.message}")
                            }

                            val result = apiClient.createWarehouse(
                                CreateWarehouseRequest(
                                    name = name.trim(),
                                    address = address.trim().ifBlank { null },
                                    city = city.trim().ifBlank { null },
                                    state = selectedState?.value,
                                    country = selectedCountry?.value,
                                    pincode = pincode.trim().ifBlank { null },
                                )
                            )
                            result.fold(
                                onSuccess = { onSaved() },
                                onFailure = {
                                    if (savedLocally) {
                                        onSaved()
                                    } else {
                                        isSaving = false
                                        onError("Failed to create warehouse")
                                    }
                                },
                            )
                        }
                    }
                },
                variant = ButtonVariant.Primary,
                isLoading = isSaving,
            )
        },
    ) {
        KontafyTextField(
            value = name,
            onValueChange = { name = it; nameError = false },
            label = "Warehouse Name *",
            placeholder = "e.g., Main Warehouse",
            isError = nameError,
            errorMessage = if (nameError) "Name is required" else null,
        )
        Spacer(Modifier.height(12.dp))
        KontafyTextField(
            value = address,
            onValueChange = { address = it },
            label = "Address",
            placeholder = "Street address",
            singleLine = false,
        )
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            KontafyDropdown(
                items = countryItems,
                selectedItem = selectedCountry,
                onItemSelected = {
                    selectedCountry = it
                    selectedState = null
                },
                label = "Country",
                placeholder = "Select country",
                searchable = true,
                modifier = Modifier.weight(1f),
            )
            KontafyDropdown(
                items = if (selectedCountry?.value == "India") indianStates else emptyList(),
                selectedItem = selectedState,
                onItemSelected = { selectedState = it },
                label = "State",
                placeholder = if (selectedCountry?.value == "India") "Select state" else "N/A",
                searchable = true,
                modifier = Modifier.weight(1f),
                enabled = selectedCountry?.value == "India",
            )
        }
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            KontafyTextField(
                value = city,
                onValueChange = { city = it },
                label = "City",
                placeholder = "City",
                modifier = Modifier.weight(1f),
            )
            KontafyTextField(
                value = pincode,
                onValueChange = { pincode = it.filter { c -> c.isDigit() }.take(6) },
                label = "Pincode",
                placeholder = "e.g., 110001",
                modifier = Modifier.weight(1f),
            )
        }
    }
}
