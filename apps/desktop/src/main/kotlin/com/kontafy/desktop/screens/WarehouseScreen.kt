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
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun WarehouseScreen(
    apiClient: ApiClient,
    showSnackbar: (String) -> Unit = {},
) {
    var warehouses by remember { mutableStateOf<List<WarehouseDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadWarehouses() {
        scope.launch {
            isLoading = true
            val result = apiClient.getWarehouses()
            result.fold(
                onSuccess = { warehouses = it },
                onFailure = { showSnackbar("Failed to load warehouses") },
            )
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadWarehouses() }

    if (showAddDialog) {
        AddWarehouseDialog(
            apiClient = apiClient,
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
                // Summary row
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

                // Warehouse cards
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
            // Icon
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

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    warehouse.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                warehouse.address?.let { addr ->
                    Spacer(Modifier.height(4.dp))
                    Text(
                        addr,
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.Muted,
                    )
                }
            }

            // Stats
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
                Text(
                    "stock value",
                    style = MaterialTheme.typography.labelSmall,
                    color = KontafyColors.Muted,
                )
            }
        }
    }
}

@Composable
private fun AddWarehouseDialog(
    apiClient: ApiClient,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    onError: (String) -> Unit = {},
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

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
                            val result = apiClient.createWarehouse(
                                CreateWarehouseRequest(name = name, address = address.ifBlank { null })
                            )
                            result.fold(
                                onSuccess = { onSaved() },
                                onFailure = { e ->
                                    isSaving = false
                                    onError("Failed to create warehouse")
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
            placeholder = "Full address",
            singleLine = false,
        )
    }
}
