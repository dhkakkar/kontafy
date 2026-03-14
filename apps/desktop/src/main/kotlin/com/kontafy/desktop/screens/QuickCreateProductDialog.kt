package com.kontafy.desktop.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import java.util.UUID

@Composable
fun QuickCreateProductDialog(
    onDismiss: () -> Unit,
    onCreated: (ProductDto) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("GOODS") }
    var hsnCode by remember { mutableStateOf("") }
    var sacCode by remember { mutableStateOf("") }
    var sellingPrice by remember { mutableStateOf("") }
    var purchasePrice by remember { mutableStateOf("") }
    var taxRate by remember { mutableStateOf<DropdownItem<Double>?>(DropdownItem(18.0, "18%")) }
    var selectedUnit by remember { mutableStateOf<DropdownItem<String>?>(DropdownItem("Nos", "Nos (Numbers)")) }
    var showValidation by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    val isNameValid = name.isNotBlank()
    val taxRateItems = listOf(0.0, 5.0, 12.0, 18.0, 28.0).map { DropdownItem(it, "${it.toInt()}%") }
    val unitItems = listOf(
        DropdownItem("Nos", "Nos (Numbers)"),
        DropdownItem("Kg", "Kg (Kilograms)"),
        DropdownItem("Ltrs", "Ltrs (Litres)"),
        DropdownItem("Mtrs", "Mtrs (Metres)"),
        DropdownItem("Box", "Box"),
        DropdownItem("Pair", "Pair"),
        DropdownItem("Hrs", "Hrs (Hours)"),
        DropdownItem("Sq.Ft", "Sq.Ft (Square Feet)"),
        DropdownItem("Tons", "Tons"),
        DropdownItem("Bags", "Bags"),
    )

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.width(500.dp).heightIn(max = 550.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            elevation = CardDefaults.cardElevation(8.dp),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Quick Create Product",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = KontafyColors.Ink,
                    )
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = KontafyColors.Muted)
                    }
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                Column(
                    modifier = Modifier.fillMaxWidth().weight(1f, fill = false).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Type selector
                    Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        listOf("GOODS", "SERVICES").forEach { t ->
                            FilterChip(
                                selected = type == t,
                                onClick = { type = t },
                                label = { Text(t.replaceFirstChar { it.titlecase() }) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = KontafyColors.Navy,
                                    selectedLabelColor = KontafyColors.White,
                                ),
                            )
                        }
                    }

                    // Name
                    KontafyTextField(
                        value = name, onValueChange = { name = it },
                        label = "Product Name *", placeholder = "Enter product name",
                        isError = showValidation && !isNameValid,
                        errorMessage = if (showValidation && !isNameValid) "Name is required" else null,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    // HSN/SAC + Unit
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (type == "GOODS") {
                            KontafyTextField(
                                value = hsnCode, onValueChange = { hsnCode = it },
                                label = "HSN Code", placeholder = "e.g. 8471",
                                modifier = Modifier.weight(1f),
                            )
                        } else {
                            KontafyTextField(
                                value = sacCode, onValueChange = { sacCode = it },
                                label = "SAC Code", placeholder = "e.g. 998314",
                                modifier = Modifier.weight(1f),
                            )
                        }
                        KontafyDropdown(
                            items = unitItems,
                            selectedItem = selectedUnit,
                            onItemSelected = { selectedUnit = it },
                            label = "Unit",
                            placeholder = "Select unit",
                            modifier = Modifier.weight(0.6f),
                        )
                    }

                    // Pricing
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = sellingPrice, onValueChange = { v -> sellingPrice = v.filter { it.isDigit() || it == '.' } },
                            label = "Selling Price", placeholder = "0.00",
                            modifier = Modifier.weight(1f),
                        )
                        KontafyTextField(
                            value = purchasePrice, onValueChange = { v -> purchasePrice = v.filter { it.isDigit() || it == '.' } },
                            label = "Purchase Price", placeholder = "0.00",
                            modifier = Modifier.weight(1f),
                        )
                    }

                    // Tax Rate
                    KontafyDropdown(
                        items = taxRateItems,
                        selectedItem = taxRate,
                        onItemSelected = { taxRate = it },
                        label = "Tax Rate (GST)",
                        placeholder = "Select tax rate",
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    KontafyButton(text = "Cancel", onClick = onDismiss, variant = ButtonVariant.Outline)
                    Spacer(Modifier.width(8.dp))
                    KontafyButton(
                        text = "Create & Select",
                        onClick = {
                            showValidation = true
                            if (isNameValid) {
                                isSaving = true
                                val product = ProductDto(
                                    id = UUID.randomUUID().toString(),
                                    name = name,
                                    type = type,
                                    hsnCode = hsnCode.ifBlank { null },
                                    sacCode = sacCode.ifBlank { null },
                                    unit = selectedUnit?.value ?: "Nos",
                                    sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                                    purchasePrice = purchasePrice.toDoubleOrNull() ?: 0.0,
                                    taxRate = taxRate?.value ?: 18.0,
                                )
                                onCreated(product)
                            }
                        },
                        variant = ButtonVariant.Secondary,
                        isLoading = isSaving,
                    )
                }
            }
        }
    }
}
